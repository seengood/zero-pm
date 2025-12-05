


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_baseline"("p_project_id" "uuid", "p_name" "text", "p_description" "text", "p_baseline_number" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_baseline_id UUID;
  v_task RECORD;
  v_snapshot_count INTEGER := 0;
BEGIN
  -- Create baseline record
  INSERT INTO baselines (project_id, name, description, baseline_number)
  VALUES (p_project_id, p_name, p_description, p_baseline_number)
  RETURNING id INTO v_baseline_id;

  -- Snapshot all tasks in the project
  FOR v_task IN 
    SELECT 
      id,
      text,
      start_date,
      start_date + (duration || ' minutes')::INTERVAL AS finish_date,
      duration
    FROM tasks
    WHERE project_id = p_project_id
  LOOP
    INSERT INTO baseline_tasks (
      baseline_id,
      task_id,
      text,
      start_date,
      finish_date,
      duration,
      cost
    ) VALUES (
      v_baseline_id,
      v_task.id,
      v_task.text,
      v_task.start_date,
      v_task.finish_date,
      v_task.duration,
      0 -- Cost calculation can be added later
    );
    
    v_snapshot_count := v_snapshot_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'baseline_id', v_baseline_id,
    'snapshot_count', v_snapshot_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."create_baseline"("p_project_id" "uuid", "p_name" "text", "p_description" "text", "p_baseline_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_app_meta_data->>'role', 'member') -- Default to 'member'
  )
  ON CONFLICT (id) DO NOTHING; -- Handle potential race conditions
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_owner"("check_project_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = check_project_id
    AND owner_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_project_owner"("check_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_role_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if it's a system update (we can't easily detect this, but we can check if it matches metadata)
    -- Ideally, we just block it for normal users.
    -- Since we have the sync trigger, any change here will be overwritten eventually if we sync back,
    -- but to be safe, we block it.
    
    -- However, the sync_role_from_auth function performs an UPDATE on this table.
    -- We need to make sure that function doesn't fail.
    -- SECURITY DEFINER functions run with owner privileges.
    
    -- We can check if the current user is the owner of the row (the user themselves)
    IF auth.uid() = NEW.id THEN
        RAISE EXCEPTION 'You cannot update your own role directly. Contact an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_role_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_cpm_results"("p_results" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_task JSONB;
  v_task_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Loop through all tasks in results
  FOR v_task IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_task_id := (v_task->>'id')::UUID;
    
    -- Update CPM fields for each task
    UPDATE tasks
    SET
      early_start = (v_task->>'early_start')::TIMESTAMPTZ,
      early_finish = (v_task->>'early_finish')::TIMESTAMPTZ,
      late_start = (v_task->>'late_start')::TIMESTAMPTZ,
      late_finish = (v_task->>'late_finish')::TIMESTAMPTZ,
      total_float = (v_task->>'total_float')::INTEGER,
      is_critical = (v_task->>'is_critical')::BOOLEAN,
      updated_at = NOW()
    WHERE id = v_task_id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."save_cpm_results"("p_results" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_role_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.user_profiles
  SET role = COALESCE(NEW.raw_app_meta_data->>'role', 'member')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_role_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_with_version"("p_task_id" "uuid", "p_expected_version" integer, "p_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_version INTEGER;
  v_result JSONB;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM tasks
  WHERE id = p_task_id;

  -- Check if task exists
  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task not found'
    );
  END IF;

  -- Check version conflict
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict',
      'current_version', v_current_version,
      'expected_version', p_expected_version
    );
  END IF;

  -- Update task with incremented version
  UPDATE tasks
  SET
    text = COALESCE((p_updates->>'text')::TEXT, text),
    start_date = COALESCE((p_updates->>'start_date')::TIMESTAMPTZ, start_date),
    duration = COALESCE((p_updates->>'duration')::INTEGER, duration),
    progress = COALESCE((p_updates->>'progress')::FLOAT, progress),
    type = COALESCE((p_updates->>'type')::TEXT, type),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Return success with new version
  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_current_version + 1
  );
END;
$$;


ALTER FUNCTION "public"."update_task_with_version"("p_task_id" "uuid", "p_expected_version" integer, "p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "resource_id" "uuid",
    "required_units" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."baselines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."baselines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "cost_type" "text" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0,
    "rate" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interim_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "task_id" "uuid",
    "plan_number" integer NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "finish_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interim_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "uuid",
    "target" "uuid",
    "type" "text" DEFAULT 'e2s'::"text",
    "lag" integer DEFAULT 0,
    "project_id" "uuid"
);


ALTER TABLE "public"."links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "owner_id" "uuid",
    "calendar_settings" "jsonb" DEFAULT '{"holidays": [], "weekends": [0, 6]}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "start_date" "date",
    "target_end_date" "date",
    "status" "text" DEFAULT 'planning'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['planning'::"text", 'active'::"text", 'completed'::"text", 'on-hold'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "capacity" double precision NOT NULL,
    "unit" "text" DEFAULT 'hours'::"text",
    "cost_per_unit" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "parent_id" "uuid",
    "text" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "duration" integer NOT NULL,
    "progress" double precision DEFAULT 0,
    "type" "text" DEFAULT 'task'::"text",
    "sort_order" integer,
    "constraint_type" "text",
    "constraint_date" timestamp with time zone,
    "early_start" timestamp with time zone,
    "early_finish" timestamp with time zone,
    "late_start" timestamp with time zone,
    "late_finish" timestamp with time zone,
    "total_float" integer,
    "is_critical" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_task_id_resource_id_key" UNIQUE ("task_id", "resource_id");



ALTER TABLE ONLY "public"."baselines"
    ADD CONSTRAINT "baselines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interim_plans"
    ADD CONSTRAINT "interim_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interim_plans"
    ADD CONSTRAINT "interim_plans_project_id_task_id_plan_number_key" UNIQUE ("project_id", "task_id", "plan_number");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_profile_role_update" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_role_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."baselines"
    ADD CONSTRAINT "baselines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interim_plans"
    ADD CONSTRAINT "interim_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interim_plans"
    ADD CONSTRAINT "interim_plans_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_source_fkey" FOREIGN KEY ("source") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_target_fkey" FOREIGN KEY ("target") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Project owners can add members" ON "public"."project_members" FOR INSERT WITH CHECK ("public"."is_project_owner"("project_id"));



CREATE POLICY "Project owners can delete their projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Project owners can remove members" ON "public"."project_members" FOR DELETE USING ("public"."is_project_owner"("project_id"));



CREATE POLICY "Project owners can update their projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create assignments in their projects" ON "public"."assignments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "assignments"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can create baselines for their projects" ON "public"."baselines" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "baselines"."project_id") AND ("projects"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can create links in their projects" ON "public"."links" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "links"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text")))))))));



CREATE POLICY "Users can create resources in their projects" ON "public"."resources" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "resources"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can create tasks in their projects" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete assignments in their projects" ON "public"."assignments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "assignments"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can delete baselines of their projects" ON "public"."baselines" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "baselines"."project_id") AND ("projects"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete links in their projects" ON "public"."links" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "links"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text")))))))));



CREATE POLICY "Users can delete resources in their projects" ON "public"."resources" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "resources"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can delete tasks in their projects" ON "public"."tasks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "tasks"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text")))))))));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage costs in their projects" ON "public"."costs" USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "costs"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can manage interim_plans in their projects" ON "public"."interim_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "interim_plans"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can update assignments in their projects" ON "public"."assignments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "assignments"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can update links in their projects" ON "public"."links" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "links"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text")))))))));



CREATE POLICY "Users can update resources in their projects" ON "public"."resources" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "resources"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can update tasks in their projects" ON "public"."tasks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "tasks"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text"))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "tasks"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()) AND ("project_members"."role" <> 'observer'::"text")))))))));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view assignments in their projects" ON "public"."assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "assignments"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view baselines of projects they view" ON "public"."baselines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "baselines"."project_id") AND ("projects"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view costs in their projects" ON "public"."costs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."tasks"
     JOIN "public"."projects" ON (("projects"."id" = "tasks"."project_id")))
  WHERE (("tasks"."id" = "costs"."task_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view interim_plans in their projects" ON "public"."interim_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "interim_plans"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view links in their projects" ON "public"."links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "links"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view members of their projects" ON "public"."project_members" FOR SELECT USING (("public"."is_project_owner"("project_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view projects they own or are members of" ON "public"."projects" FOR SELECT USING ((("auth"."uid"() = "owner_id") OR (EXISTS ( SELECT 1
   FROM "public"."project_members"
  WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view resources in their projects" ON "public"."resources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "resources"."project_id") AND (("projects"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."project_members"
          WHERE (("project_members"."project_id" = "projects"."id") AND ("project_members"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view tasks in their projects" ON "public"."tasks" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."baselines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interim_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_baseline"("p_project_id" "uuid", "p_name" "text", "p_description" "text", "p_baseline_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_baseline"("p_project_id" "uuid", "p_name" "text", "p_description" "text", "p_baseline_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_baseline"("p_project_id" "uuid", "p_name" "text", "p_description" "text", "p_baseline_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_owner"("check_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_owner"("check_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_owner"("check_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_role_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."save_cpm_results"("p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_cpm_results"("p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_cpm_results"("p_results" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_role_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_role_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_role_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_with_version"("p_task_id" "uuid", "p_expected_version" integer, "p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_with_version"("p_task_id" "uuid", "p_expected_version" integer, "p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_with_version"("p_task_id" "uuid", "p_expected_version" integer, "p_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."baselines" TO "anon";
GRANT ALL ON TABLE "public"."baselines" TO "authenticated";
GRANT ALL ON TABLE "public"."baselines" TO "service_role";



GRANT ALL ON TABLE "public"."costs" TO "anon";
GRANT ALL ON TABLE "public"."costs" TO "authenticated";
GRANT ALL ON TABLE "public"."costs" TO "service_role";



GRANT ALL ON TABLE "public"."interim_plans" TO "anon";
GRANT ALL ON TABLE "public"."interim_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."interim_plans" TO "service_role";



GRANT ALL ON TABLE "public"."links" TO "anon";
GRANT ALL ON TABLE "public"."links" TO "authenticated";
GRANT ALL ON TABLE "public"."links" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







