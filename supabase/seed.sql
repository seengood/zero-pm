-- Create test user with Supabase Auth
-- This will be executed after migrations
DO $$
DECLARE
    test_user_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Insert test user into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_user_id,
        'authenticated',
        'authenticated',
        'paul@seengood.co.kr',
        crypt('seengood', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
        provider_id,
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        test_user_id::text,
        '22222222-2222-2222-2222-222222222222',
        test_user_id,
        format('{"sub":"%s","email":"paul@seengood.co.kr"}', test_user_id::text)::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Create user profile
    INSERT INTO public.user_profiles (
        id,
        display_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'Paul',
        'owner',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
END $$;

-- Insert a test project
INSERT INTO projects (id, title, owner_id, calendar_settings)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'ZeroPM Development',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object(
        'weekends', ARRAY[0, 6],
        'holidays', ARRAY['2025-12-25', '2026-01-01']
    )
) ON CONFLICT (id) DO NOTHING;

-- Insert test tasks
INSERT INTO tasks (id, project_id, text, start_date, duration, progress, type, sort_order)
VALUES
    ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333333', 'Phase 1: Foundation', '2025-11-27', 5, 0.8, 'task', 1),
    ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', 'Phase 2: Scheduling Engine', '2025-12-02', 5, 1.0, 'task', 2),
    ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', 'Phase 3: UI Implementation', '2025-12-09', 7, 0.3, 'task', 3),
    ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Phase 4: Testing', '2025-12-18', 3, 0.0, 'task', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert test links (dependencies)
INSERT INTO links (id, project_id, source, target, type, lag)
VALUES
    ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444442', '0', 0),
    ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444443', '0', 0),
    ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', '0', 0)
ON CONFLICT (id) DO NOTHING;

-- Add test user as project member
INSERT INTO project_members (project_id, user_id, role)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'owner'
) ON CONFLICT (project_id, user_id) DO NOTHING;
