
BEGIN;
\ir common/helpers.psql
SELECT plan(10);

-- 1. Setup Test Users
SELECT tests.create_supabase_user('owner');
SELECT tests.create_supabase_user('member');
SELECT tests.create_supabase_user('stranger');

-- 2. Verify User Profile Creation (Trigger)
SELECT ok(
    EXISTS(SELECT 1 FROM public.user_profiles WHERE id = tests.get_supabase_uid('owner')),
    'Profile should be created for Owner'
);

SELECT ok(
    EXISTS(SELECT 1 FROM public.user_profiles WHERE id = tests.get_supabase_uid('member')),
    'Profile should be created for Member'
);

-- Test Role Sync Trigger
UPDATE auth.users 
SET raw_app_meta_data = '{"role": "admin"}'::jsonb 
WHERE id = tests.get_supabase_uid('owner');

SELECT results_eq(
    $$ SELECT role FROM public.user_profiles WHERE id = tests.get_supabase_uid('owner') $$,
    $$ VALUES ('admin') $$,
    'Owner profile role should be synced to admin'
);

-- 3. Verify RLS
-- Switch to Owner
SELECT tests.authenticate_as('owner');

-- Create Project and capture ID
INSERT INTO public.projects (title, owner_id) 
VALUES ('Secret Project', tests.get_supabase_uid('owner')) 
RETURNING id AS project_id \gset

SELECT ok(
    :'project_id' IS NOT NULL,
    'Owner can create project'
);

-- Add Member to Project
INSERT INTO public.project_members (project_id, user_id, role)
VALUES (:'project_id', tests.get_supabase_uid('member'), 'member');

-- Verify Owner Visibility
SELECT results_eq(
    format('SELECT count(*) FROM public.projects WHERE id = %L', :'project_id'),
    $$ VALUES (1::bigint) $$,
    'Owner can see their project'
);

-- Switch to Member
SELECT tests.authenticate_as('member');

-- Verify Member Visibility
SELECT results_eq(
    format('SELECT count(*) FROM public.projects WHERE id = %L', :'project_id'),
    $$ VALUES (1::bigint) $$,
    'Member can see the project'
);

-- Switch to Stranger
SELECT tests.authenticate_as('stranger');

-- Verify Stranger Visibility
SELECT is_empty(
    format('SELECT * FROM public.projects WHERE id = %L', :'project_id'),
    'Stranger cannot see the project'
);

-- 4. Verify Optimistic Locking
-- Switch back to Owner
SELECT tests.authenticate_as('owner');

-- Create Task
INSERT INTO public.tasks (project_id, text, start_date, duration, version)
VALUES (:'project_id', 'Test Task', NOW(), 60, 1)
RETURNING id AS task_id \gset

-- Verify update_task_with_version success
SELECT lives_ok(
    format($$ 
    SELECT public.update_task_with_version(
        %L, 
        1, 
        '{"text": "Updated Task"}'::jsonb
    ) 
    $$, :'task_id'),
    'Optimistic locking update should succeed with correct version'
);

-- Verify version incremented
SELECT results_eq(
    format('SELECT version FROM public.tasks WHERE id = %L', :'task_id'),
    $$ VALUES (2) $$,
    'Task version should be incremented to 2'
);

-- Verify update_task_with_version failure (stale version)
SELECT results_eq(
    format($$ 
    SELECT (public.update_task_with_version(
        %L, 
        1, 
        '{"text": "Stale Update"}'::jsonb
    ) ->> 'success')::boolean
    $$, :'task_id'),
    $$ VALUES (false) $$,
    'Optimistic locking update should fail with stale version'
);

SELECT * FROM finish();
ROLLBACK;
