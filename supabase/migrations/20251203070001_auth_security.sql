-- ==========================================
-- AUTH & SECURITY ENHANCEMENTS
-- ==========================================

-- 1. Handle New User Creation (Automated Profile Creation)
-- This ensures every authenticated user has a corresponding profile in public.user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on every new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Sync Role from Auth Metadata (Source of Truth)
-- This ensures that the 'role' in user_profiles is always in sync with auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_role_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET role = COALESCE(NEW.raw_app_meta_data->>'role', 'member')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run when auth.users is updated (specifically metadata)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_app_meta_data->>'role' IS DISTINCT FROM NEW.raw_app_meta_data->>'role')
  EXECUTE PROCEDURE public.sync_role_from_auth();


-- 3. Protect Profile Role Column
-- Prevent users from manually updating their own role in user_profiles
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.user_profiles;
CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_role_column();
