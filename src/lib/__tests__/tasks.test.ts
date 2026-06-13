import { getTasks, createTask, updateTask, deleteTask, updateLink } from '../tasks';
import { LINK_TYPES } from '@/lib/constants';
import { Link } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

const mockSupabase = {
    from: jest.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
    })),
} as unknown as SupabaseClient;

// Chain mocks
// Common return object for select/insert/update/eq to allow chaining
const mockQueryBuilder = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
};

mockSelect.mockReturnValue(mockQueryBuilder);
mockInsert.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);
mockDelete.mockReturnValue(mockQueryBuilder);
mockEq.mockReturnValue(mockQueryBuilder);
mockOrder.mockResolvedValue({ data: [], error: null });
mockSingle.mockResolvedValue({ data: {}, error: null });

describe('Tasks Library', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mockEq to return query builder by default (for chainable methods)
        mockEq.mockReturnValue(mockQueryBuilder);
        mockSelect.mockReturnValue(mockQueryBuilder);
        mockInsert.mockReturnValue(mockQueryBuilder);
        mockUpdate.mockReturnValue(mockQueryBuilder);
        mockDelete.mockReturnValue(mockQueryBuilder);
    });

    describe('getTasks', () => {
        it('should fetch tasks for a project', async () => {
            const projectId = 'project-1';
            const mockData = [{ id: '1', text: 'Task 1' }];
            mockOrder.mockResolvedValue({ data: mockData, error: null });

            const result = await getTasks(projectId, mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
            expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true, nullsFirst: false });
            expect(result.data).toEqual(mockData);
        });
    });

    describe('createTask', () => {
        it('should create a task', async () => {
            const newTask = { text: 'New Task', project_id: 'project-1' };
            const createdTask = { id: '1', ...newTask };
            mockSingle.mockResolvedValue({ data: createdTask, error: null });

            const result = await createTask(newTask, mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
            expect(mockInsert).toHaveBeenCalledWith(newTask);
            expect(result.data).toEqual(createdTask);
        });
    });

    describe('updateTask', () => {
        it('should update a task', async () => {
            const taskId = '1';
            const updates = { text: 'Updated Task' };
            const updatedTask = { id: taskId, ...updates };
            mockSingle.mockResolvedValue({ data: updatedTask, error: null });

            const result = await updateTask(taskId, updates, mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
            expect(mockUpdate).toHaveBeenCalledWith(updates);
            expect(mockEq).toHaveBeenCalledWith('id', taskId);
            expect(result.data).toEqual(updatedTask);
        });
    });

    describe('deleteTask', () => {
        it('should delete a task', async () => {
            const taskId = '1';
            mockEq.mockResolvedValue({ error: null }); // delete returns directly promise-like in real supabase but here we mock chain

            // Fix mock for delete: delete() -> eq() -> Promise
            // In our implementation: .delete().eq('id', taskId) returns { error }
            // So mockEq should return the promise result
            mockEq.mockResolvedValue({ error: null });

            const result = await deleteTask(taskId, mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
            expect(mockDelete).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('id', taskId);
            expect(result.success).toBe(true);
        });
    });

    describe('updateLink', () => {
        it('should update a link', async () => {
            const linkId = '1';
            const updates: Partial<Link> = { type: LINK_TYPES.START_TO_START, lag: 2 };
            const updatedLink = { id: linkId, ...updates };
            mockSingle.mockResolvedValue({ data: updatedLink, error: null });

            const result = await updateLink(linkId, updates, mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('links');
            expect(mockUpdate).toHaveBeenCalledWith(updates);
            expect(mockEq).toHaveBeenCalledWith('id', linkId);
            expect(result.data).toEqual(updatedLink);
        });
    });
});
