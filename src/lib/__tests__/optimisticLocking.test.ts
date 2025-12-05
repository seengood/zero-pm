import { updateTaskWithOptimisticLock, saveCPMResults, createBaseline } from '../optimisticLocking';
import { supabase } from '../supabaseClient';

// Mock supabase client
jest.mock('../supabaseClient', () => ({
    supabase: {
        rpc: jest.fn(),
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(),
                })),
            })),
        })),
    },
}));

describe('optimisticLocking', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateTaskWithOptimisticLock', () => {
        it('should return success when rpc call succeeds', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: { success: true, new_version: 2 },
                error: null,
            });

            const result = await updateTaskWithOptimisticLock('task-1', 1, { text: 'Updated' });

            expect(result.success).toBe(true);
            expect(result.newVersion).toBe(2);
            expect(supabase.rpc).toHaveBeenCalledWith('update_task_with_version', {
                p_task_id: 'task-1',
                p_expected_version: 1,
                p_updates: { text: 'Updated' },
            });
        });

        it('should return error when rpc call fails with non-conflict error', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const result = await updateTaskWithOptimisticLock('task-1', 1, { text: 'Updated' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });

        it('should retry on version conflict and succeed if subsequent call works', async () => {
            // First call: Version conflict
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
                data: { error: 'Version conflict', current_version: 2, expected_version: 1 },
                error: null,
            });

            // Mock fetching latest task
            const mockSelect = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'task-1', version: 2 },
                        error: null,
                    }),
                }),
            });
            (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            // Second call: Success
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
                data: { success: true, new_version: 3 },
                error: null,
            });

            const result = await updateTaskWithOptimisticLock('task-1', 1, { text: 'Updated' });

            expect(result.success).toBe(true);
            expect(result.newVersion).toBe(3);
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries', async () => {
            // Always return version conflict
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: { error: 'Version conflict', current_version: 2, expected_version: 1 },
                error: null,
            });

            // Mock fetching latest task
            const mockSelect = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'task-1', version: 2 },
                        error: null,
                    }),
                }),
            });
            (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            const result = await updateTaskWithOptimisticLock('task-1', 1, { text: 'Updated' }, 2);

            expect(result.success).toBe(false);
            expect(result.error).toContain('최대 재시도 횟수(2)를 초과했습니다');
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
        });
    });

    describe('saveCPMResults', () => {
        it('should return success when rpc call succeeds', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: { success: true, updated_count: 5 },
                error: null,
            });

            const results = [{ id: '1', early_start: '2023-01-01', early_finish: '2023-01-02', late_start: '2023-01-01', late_finish: '2023-01-02', total_float: 0, is_critical: true }];
            const result = await saveCPMResults(results);

            expect(result.success).toBe(true);
            expect(result.updatedCount).toBe(5);
        });

        it('should return error when rpc call fails', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: null,
                error: { message: 'RPC error' },
            });

            const result = await saveCPMResults([]);

            expect(result.success).toBe(false);
            expect(result.error).toBe('RPC error');
        });
    });

    describe('createBaseline', () => {
        it('should return success when rpc call succeeds', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: { success: true, baseline_id: 'base-1', snapshot_count: 10 },
                error: null,
            });

            const result = await createBaseline('proj-1', 'Baseline 1', 'Desc', 1);

            expect(result.success).toBe(true);
            expect(result.baselineId).toBe('base-1');
            expect(result.snapshotCount).toBe(10);
        });
    });
});
