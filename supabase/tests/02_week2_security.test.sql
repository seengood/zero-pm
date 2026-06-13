BEGIN;
\ir common/helpers.psql
SELECT plan(15);

-- Create test users
SELECT tests.create_supabase_user('owner_user');
SELECT tests.create_supabase_user('editor_user');
SELECT tests.create_supabase_user('viewer_user');
SELECT tests.create_supabase_user('other_user');

-- Switch to owner_user
SELECT tests.authenticate_as('owner_user');

-- Create test project
INSERT INTO public.projects (title, owner_id) 
VALUES ('Test Project', tests.get_supabase_uid('owner_user'))
RETURNING id INTO \set project_id;

-- Test 1: Soft delete - owner can soft delete their task
INSERT INTO public.tasks (project_id, text, start_date, duration) 
VALUES ((SELECT id FROM public.projects LIMIT 1), 'Task to Delete', NOW(), 1)
RETURNING id INTO \set task_id;

SELECT lives_ok(
    $$ UPDATE public.tasks SET deleted_at = NOW() WHERE id = (SELECT id FROM public.tasks WHERE text = 'Task to Delete' LIMIT 1) $$,
    'Owner should be able to soft delete a task'
);

-- Test 2: Soft delete - soft deleted tasks are not visible
SELECT is_empty(
    $$ SELECT * FROM public.tasks WHERE text = 'Task to Delete' AND deleted_at IS NULL $$,
    'Soft deleted tasks should not be visible in normal queries'
);

-- Test 3: Soft delete - but still exist in database
SELECT results_eq(
    $$ SELECT COUNT(*) FROM public.tasks WHERE text = 'Task to Delete' $$,
    $$ VALUES (1) $$,
    'Soft deleted tasks should still exist in database'
);

-- Test 4: RBAC - Add members with different roles
INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  (SELECT id FROM public.projects LIMIT 1),
  tests.get_supabase_uid('editor_user'),
  'editor'
);

INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  (SELECT id FROM public.projects LIMIT 1),
  tests.get_supabase_uid('viewer_user'),
  'viewer'
);

SELECT lives_ok(
    $$ INSERT INTO public.project_members (project_id, user_id, role) VALUES ((SELECT id FROM public.projects LIMIT 1), tests.get_supabase_uid('editor_user'), 'editor') $$,
    'Owner should be able to add editor member'
);

-- Test 5: RBAC - Editor can create links
SELECT tests.authenticate_as('editor_user');
INSERT INTO public.tasks (project_id, text, start_date, duration) 
VALUES ((SELECT id FROM public.projects LIMIT 1), 'Task A', NOW(), 1)
RETURNING id INTO \set task_a_id;

INSERT INTO public.tasks (project_id, text, start_date, duration) 
VALUES ((SELECT id FROM public.projects LIMIT 1), 'Task B', NOW(), 1)
RETURNING id INTO \set task_b_id;

SELECT lives_ok(
    $$ INSERT INTO public.links (project_id, source, target, type) VALUES ((SELECT id FROM public.projects LIMIT 1), (SELECT id FROM public.tasks WHERE text = 'Task A' LIMIT 1), (SELECT id FROM public.tasks WHERE text = 'Task B' LIMIT 1), 'e2s') $$,
    'Editor should be able to create links'
);

-- Test 6: RBAC - Viewer cannot create links
SELECT tests.authenticate_as('viewer_user');
SELECT throws_ok(
    $$ INSERT INTO public.links (project_id, source, target, type) VALUES ((SELECT id FROM public.projects LIMIT 1), (SELECT id FROM public.tasks WHERE text = 'Task A' LIMIT 1), (SELECT id FROM public.tasks WHERE text = 'Task B' LIMIT 1), 'e2s') $$,
    'new row violates row-level security policy',
    'Viewer should not be able to create links'
);

-- Test 7: RBAC - Viewer can view links
SELECT results_eq(
    $$ SELECT COUNT(*) FROM public.links WHERE project_id = (SELECT id FROM public.projects LIMIT 1) $$,
    $$ VALUES (1) $$,
    'Viewer should be able to view links'
);

-- Test 8: RBAC - Editor can update links
SELECT tests.authenticate_as('editor_user');
SELECT lives_ok(
    $$ UPDATE public.links SET lag = 1 WHERE project_id = (SELECT id FROM public.projects LIMIT 1) LIMIT 1 $$,
    'Editor should be able to update links'
);

-- Test 9: RBAC - Viewer cannot update links
SELECT tests.authenticate_as('viewer_user');
SELECT throws_ok(
    $$ UPDATE public.links SET lag = 2 WHERE project_id = (SELECT id FROM public.projects LIMIT 1) LIMIT 1 $$,
    'new row violates row-level security policy',
    'Viewer should not be able to update links'
);

-- Test 10: Shared Links - Owner can create shared link
SELECT tests.authenticate_as('owner_user');
SELECT lives_ok(
    $$ INSERT INTO public.shared_links (project_id, token, created_by) VALUES ((SELECT id FROM public.projects LIMIT 1), 'test_token_123', tests.get_supabase_uid('owner_user')) $$,
    'Owner should be able to create shared link'
);

-- Test 11: Shared Links - Viewer cannot create shared link
SELECT tests.authenticate_as('viewer_user');
SELECT throws_ok(
    $$ INSERT INTO public.shared_links (project_id, token, created_by) VALUES ((SELECT id FROM public.projects LIMIT 1), 'test_token_456', tests.get_supabase_uid('viewer_user')) $$,
    'new row violates row-level security policy',
    'Viewer should not be able to create shared link'
);

-- Test 12: Shared Links - validate_shared_link function works
SELECT tests.clear_authentication();
SELECT results_eq(
    $$ SELECT is_valid FROM validate_shared_link('test_token_123') $$,
    $$ VALUES (true) $$,
    'validate_shared_link function should return true for valid token'
);

-- Test 13: Project Invitations - Owner can create invitation
SELECT tests.authenticate_as('owner_user');
SELECT lives_ok(
    $$ INSERT INTO public.project_invitations (project_id, email, role, invited_by) VALUES ((SELECT id FROM public.projects LIMIT 1), 'newuser@example.com', 'editor', tests.get_supabase_uid('owner_user')) $$,
    'Owner should be able to create project invitation'
);

-- Test 14: Project Invitations - Viewer cannot create invitation
SELECT tests.authenticate_as('viewer_user');
SELECT throws_ok(
    $$ INSERT INTO public.project_invitations (project_id, email, role, invited_by) VALUES ((SELECT id FROM public.projects LIMIT 1), 'another@example.com', 'editor', tests.get_supabase_uid('viewer_user')) $$,
    'new row violates row-level security policy',
    'Viewer should not be able to create project invitation'
);

-- Test 15: Role enum - user_profiles uses new enum
SELECT tests.clear_authentication();
SELECT lives_ok(
    $$ INSERT INTO public.user_profiles (id, display_name, role) VALUES (gen_random_uuid(), 'Test User', 'editor') $$,
    'user_profiles should accept new role enum values'
);

SELECT * FROM finish();
ROLLBACK;
