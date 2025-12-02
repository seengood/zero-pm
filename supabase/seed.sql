-- Insert a test project
INSERT INTO projects (id, title, owner_id, calendar_settings)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ZeroPM Development',
    (SELECT id FROM auth.users LIMIT 1),
    jsonb_build_object(
        'weekends', ARRAY[0, 6],
        'holidays', ARRAY['2025-12-25', '2026-01-01']
    )
);

-- Insert test tasks
INSERT INTO tasks (id, project_id, text, start_date, duration, progress, type, sort_order)
VALUES
    ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Phase 1: Foundation', '2025-11-27', 5, 0.8, 'task', 1),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Phase 2: Scheduling Engine', '2025-12-02', 5, 1.0, 'task', 2),
    ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Phase 3: UI Implementation', '2025-12-09', 7, 0.3, 'task', 3),
    ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Phase 4: Testing', '2025-12-18', 3, 0.0, 'task', 4);

-- Insert test links (dependencies)
INSERT INTO links (id, project_id, source, target, type, lag)
VALUES
    ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', '0', 0),
    ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222223', '0', 0),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222224', '0', 0);

-- Add current user as project member
INSERT INTO project_members (project_id, user_id, role)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM auth.users LIMIT 1),
    'owner'
);
