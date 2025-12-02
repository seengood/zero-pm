BEGIN;
SELECT plan(10);

-- Create test users
SELECT tests.create_supabase_user('user1');
SELECT tests.create_supabase_user('user2');

-- Switch to user1
SELECT tests.authenticate_as('user1');

-- Test 1: User1 can create a project
PREPARE create_project AS INSERT INTO public.projects (title, owner_id) VALUES ('Project 1', tests.get_supabase_uid('user1')) RETURNING id;
SELECT lives_ok(
    'create_project',
    'User1 should be able to create a project'
);

-- Store project id
\set project_id :create_project

-- Test 2: User1 can view their own project
SELECT results_eq(
    $$ SELECT title FROM public.projects WHERE owner_id = tests.get_supabase_uid('user1') $$,
    $$ VALUES ('Project 1') $$,
    'User1 should see their own project'
);

-- Test 3: User1 can add a task to their project
SELECT lives_ok(
    $$ INSERT INTO public.tasks (project_id, text, start_date, duration) VALUES ((SELECT id FROM public.projects LIMIT 1), 'Task 1', NOW(), 1) $$,
    'User1 should be able to add a task to their project'
);

-- Switch to user2
SELECT tests.authenticate_as('user2');

-- Test 4: User2 cannot see User1's project (assuming not a member)
SELECT is_empty(
    $$ SELECT * FROM public.projects WHERE owner_id = tests.get_supabase_uid('user1') $$,
    'User2 should not see User1s project'
);

-- Test 5: User2 cannot add a task to User1's project
SELECT throws_ok(
    $$ INSERT INTO public.tasks (project_id, text, start_date, duration) VALUES ((SELECT id FROM public.projects WHERE owner_id = tests.get_supabase_uid('user1') LIMIT 1), 'Task 2', NOW(), 1) $$,
    'new row violates row-level security policy for table "tasks"',
    'User2 should not be able to add task to User1s project'
);

-- Test 6: User2 can create their own project
SELECT lives_ok(
    $$ INSERT INTO public.projects (title, owner_id) VALUES ('Project 2', tests.get_supabase_uid('user2')) $$,
    'User2 should be able to create their own project'
);

SELECT * FROM finish();
ROLLBACK;
