import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresence } from '../usePresence';
import { supabase } from '@/lib/supabaseClient';

// Mock supabase
jest.mock('@/lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(),
                })),
            })),
        })),
        channel: jest.fn(),
    },
}));

describe('usePresence', () => {
    const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        track: jest.fn(),
        presenceState: jest.fn(),
        unsubscribe: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1', email: 'test@example.com' } },
        });
        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { display_name: 'Test User', avatar_url: 'avatar.png' },
                    }),
                }),
            }),
        });
    });

    it('should initialize presence channel', async () => {
        renderHook(() => usePresence('project-1'));

        await waitFor(() => {
            expect(supabase.channel).toHaveBeenCalledWith('project:project-1', expect.any(Object));
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });
    });

    it('should track presence on subscribe', async () => {
        // Mock subscribe callback execution
        mockChannel.subscribe.mockImplementation((callback) => {
            callback('SUBSCRIBED');
            return mockChannel;
        });

        renderHook(() => usePresence('project-1'));

        await waitFor(() => {
            expect(mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                displayName: 'Test User',
                avatarUrl: 'avatar.png',
            }));
        });
    });

    it('should update onlineUsers on sync', async () => {
        const mockPresenceState = {
            'user-1': [{ userId: 'user-1', displayName: 'User 1' }],
            'user-2': [{ userId: 'user-2', displayName: 'User 2' }],
        };
        mockChannel.presenceState.mockReturnValue(mockPresenceState);

        // Capture the sync callback
        let syncCallback: () => void;
        mockChannel.on.mockImplementation((event, filter, callback) => {
            if (filter.event === 'sync') {
                syncCallback = callback;
            }
            return mockChannel;
        });

        const { result } = renderHook(() => usePresence('project-1'));

        await waitFor(() => {
            expect(mockChannel.on).toHaveBeenCalled();
        });

        // Trigger sync
        act(() => {
            if (syncCallback) syncCallback();
        });

        expect(Object.keys(result.current.onlineUsers)).toHaveLength(2);
        expect(result.current.onlineUsers['user-1'].displayName).toBe('User 1');
    });

    it('should update editing task', async () => {
        // Mock subscribe callback execution to set the channel
        mockChannel.subscribe.mockImplementation((callback) => {
            if (callback) callback('SUBSCRIBED');
            return mockChannel;
        });

        const { result } = renderHook(() => usePresence('project-1'));

        // Wait for channel to be set (which happens after subscribe callback)
        await waitFor(() => {
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        await act(async () => {
            await result.current.updateEditingTask('task-1');
        });

        expect(mockChannel.track).toHaveBeenCalledWith(expect.objectContaining({
            editingTaskId: 'task-1',
        }));
    });

    it('should get users editing a task', async () => {
        const mockPresenceState = {
            'user-1': [{ userId: 'user-1', displayName: 'User 1', editingTaskId: 'task-1' }],
            'user-2': [{ userId: 'user-2', displayName: 'User 2', editingTaskId: 'task-2' }],
            'user-3': [{ userId: 'user-3', displayName: 'User 3', editingTaskId: 'task-1' }],
        };
        mockChannel.presenceState.mockReturnValue(mockPresenceState);

        let syncCallback: () => void;
        mockChannel.on.mockImplementation((event, filter, callback) => {
            if (filter.event === 'sync') {
                syncCallback = callback;
            }
            return mockChannel;
        });

        const { result } = renderHook(() => usePresence('project-1'));

        await waitFor(() => {
            expect(mockChannel.on).toHaveBeenCalled();
        });

        act(() => {
            if (syncCallback) syncCallback();
        });

        const editors = result.current.getUsersEditingTask('task-1');
        expect(editors).toHaveLength(2);
        expect(editors.map(u => u.userId)).toEqual(expect.arrayContaining(['user-1', 'user-3']));
    });

    it('should handle leave event', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        let leaveCallback: (payload: any) => void;
        mockChannel.on.mockImplementation((event, filter, callback) => {
            if (filter.event === 'leave') {
                leaveCallback = callback;
            }
            return mockChannel;
        });

        renderHook(() => usePresence('project-1'));

        await waitFor(() => {
            expect(mockChannel.on).toHaveBeenCalled();
        });

        act(() => {
            if (leaveCallback) {
                leaveCallback({ key: 'user-1', leftPresences: [] });
            }
        });

        expect(consoleSpy).toHaveBeenCalledWith('사용자 퇴장:', 'user-1', []);
        consoleSpy.mockRestore();
    });
});
