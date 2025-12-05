import { createProject, getProjects, getProject, updateProject, deleteProject } from '../projects';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock supabase client structure
const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(() => ({
        insert: jest.fn(() => ({
            select: jest.fn(() => ({
                single: jest.fn(),
            })),
        })),
        select: jest.fn(() => ({
            order: jest.fn(),
            eq: jest.fn(() => ({
                single: jest.fn(),
            })),
        })),
        update: jest.fn(() => ({
            eq: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(),
                })),
            })),
        })),
        delete: jest.fn(() => ({
            eq: jest.fn(),
        })),
    })),
} as unknown as SupabaseClient;

describe('projects', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createProject', () => {
        it('should return error if user is not logged in', async () => {
            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

            const result = await createProject({ title: 'New Project' }, mockSupabase);

            expect(result.error).toBe('로그인이 필요합니다.');
            expect(result.data).toBeNull();
        });

        it('should create project successfully', async () => {
            const mockUser = { id: 'user-1' };
            const mockProject = { id: 'proj-1', title: 'New Project', owner_id: 'user-1' };

            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

            const mockSingle = jest.fn().mockResolvedValue({ data: mockProject, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
            (mockSupabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

            const result = await createProject({ title: 'New Project' }, mockSupabase);

            expect(result.data).toEqual(mockProject);
            expect(result.error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('projects');
            expect(mockInsert).toHaveBeenCalledWith({
                title: 'New Project',
                description: undefined,
                start_date: undefined,
                target_end_date: undefined,
                status: 'planning',
                owner_id: 'user-1'
            });
        });
    });

    describe('getProjects', () => {
        it('should fetch projects successfully', async () => {
            const mockProjects = [{ id: 'proj-1', title: 'Project 1' }];

            const mockOrder = jest.fn().mockResolvedValue({ data: mockProjects, error: null });
            const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
            (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            const result = await getProjects(mockSupabase);

            expect(result.data).toEqual(mockProjects);
            expect(result.error).toBeNull();
        });
    });

    describe('getProject', () => {
        it('should fetch single project successfully', async () => {
            const mockProject = { id: 'proj-1', title: 'Project 1' };

            const mockSingle = jest.fn().mockResolvedValue({ data: mockProject, error: null });
            const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
            const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            const result = await getProject('proj-1', mockSupabase);

            expect(result.data).toEqual(mockProject);
            expect(result.error).toBeNull();
        });
    });

    describe('updateProject', () => {
        it('should return error if user is not logged in', async () => {
            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

            const result = await updateProject('proj-1', { title: 'Updated Title' }, mockSupabase);

            expect(result.error).toBe('로그인이 필요합니다.');
            expect(result.data).toBeNull();
        });

        it('should update project successfully', async () => {
            const mockUser = { id: 'user-1' };
            const mockUpdatedProject = { id: 'proj-1', title: 'Updated Title', owner_id: 'user-1' };

            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

            const mockSingle = jest.fn().mockResolvedValue({ data: mockUpdatedProject, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

            const result = await updateProject('proj-1', { title: 'Updated Title' }, mockSupabase);

            expect(result.data).toEqual(mockUpdatedProject);
            expect(result.error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('projects');
            expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Title' });
        });
    });

    describe('deleteProject', () => {
        it('should return error if user is not logged in', async () => {
            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

            const result = await deleteProject('proj-1', mockSupabase);

            expect(result.success).toBe(false);
            expect(result.error).toBe('로그인이 필요합니다.');
        });

        it('should delete project successfully', async () => {
            const mockUser = { id: 'user-1' };

            (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

            const mockEq = jest.fn().mockResolvedValue({ error: null });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

            const result = await deleteProject('proj-1', mockSupabase);

            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('projects');
        });
    });
});
