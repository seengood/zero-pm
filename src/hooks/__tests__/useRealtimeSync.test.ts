import { renderHook, act } from '@testing-library/react';
import { useRealtimeSync } from '../useRealtimeSync';

// Mock Supabase client
const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => mockChannel),
};

const mockSupabaseClient = {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
};

jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock dateUtils
jest.mock('@/lib/dateUtils', () => ({
    parseToUTC: jest.fn((dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }),
}));

describe('useRealtimeSync', () => {
    const mockTasksRef = { current: [] };
    const mockLinksRef = { current: [] };
    const mockSetTasks = jest.fn();
    const mockSetLinks = jest.fn();
    const mockGanttApiRef = { current: { exec: jest.fn() } };
    const mockIsSchedulerUpdateRef = { current: false };

    beforeEach(() => {
        jest.clearAllMocks();
        mockTasksRef.current = [];
        mockLinksRef.current = [];
        mockChannel.on.mockClear();
        mockChannel.subscribe.mockClear();
    });

    it('should render without crashing', () => {
        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));
    });

    it('should not subscribe when projectId is empty', () => {
        renderHook(() => useRealtimeSync({
            projectId: '',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
    });

    it('should subscribe to tasks and links channels', () => {
        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        expect(mockSupabaseClient.channel).toHaveBeenCalledWith('data-sync:project-1');
        expect(mockChannel.on).toHaveBeenCalledTimes(2);
    });

    it('should dedup UPDATE events from own changes (echo filtering)', () => {
        mockTasksRef.current = [
            { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the tasks event handler
        const tasksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'tasks'
        )[2];

        // Emit UPDATE with same values (echo from own change)
        act(() => {
            tasksHandler({
                eventType: 'UPDATE',
                new: { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' },
                old: {}
            });
        });

        // Should skip update (dedup)
        expect(mockSetTasks).not.toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
    });

    it('should apply remote UPDATE events when values differ', () => {
        mockTasksRef.current = [
            { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the tasks event handler
        const tasksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'tasks'
        )[2];

        // Emit UPDATE with different values (remote change)
        act(() => {
            tasksHandler({
                eventType: 'UPDATE',
                new: { id: 'task-1', start_date: '2026-06-15', duration: 5, text: 'Task 1 Updated' },
                old: {}
            });
        });

        // Should apply update
        expect(mockSetTasks).toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('update-task', expect.objectContaining({
            id: 'task-1',
        }));
    });

    it('should dedup INSERT events when task already exists', () => {
        mockTasksRef.current = [
            { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the tasks event handler
        const tasksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'tasks'
        )[2];

        // Emit INSERT for existing task
        act(() => {
            tasksHandler({
                eventType: 'INSERT',
                new: { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' },
                old: {}
            });
        });

        // Should skip insert (dedup)
        expect(mockSetTasks).not.toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
    });

    it('should apply remote INSERT events for new tasks', () => {
        mockTasksRef.current = [];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the tasks event handler
        const tasksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'tasks'
        )[2];

        // Emit INSERT for new task
        act(() => {
            tasksHandler({
                eventType: 'INSERT',
                new: { id: 'task-2', start_date: '2026-06-12', duration: 3, text: 'Task 2' },
                old: {}
            });
        });

        // Should apply insert
        expect(mockSetTasks).toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('add-task', expect.objectContaining({
            task: expect.objectContaining({ id: 'task-2' }),
        }));
    });

    it('should apply DELETE events', () => {
        mockTasksRef.current = [
            { id: 'task-1', start_date: '2026-06-12', duration: 3, text: 'Task 1' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the tasks event handler
        const tasksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'tasks'
        )[2];

        // Emit DELETE
        act(() => {
            tasksHandler({
                eventType: 'DELETE',
                new: {},
                old: { id: 'task-1' }
            });
        });

        // Should apply delete
        expect(mockSetTasks).toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('delete-task', { id: 'task-1' });
    });

    it('should dedup link INSERT events when link already exists', () => {
        mockLinksRef.current = [
            { id: 'link-1', source: 'task-1', target: 'task-2', type: '0' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the links event handler
        const linksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'links'
        )[2];

        // Emit INSERT for existing link
        act(() => {
            linksHandler({
                eventType: 'INSERT',
                new: { id: 'link-1', source: 'task-1', target: 'task-2', type: '0' },
                old: {}
            });
        });

        // Should skip insert (dedup)
        expect(mockSetLinks).not.toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
    });

    it('should apply remote link INSERT events', () => {
        mockLinksRef.current = [];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the links event handler
        const linksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'links'
        )[2];

        // Emit INSERT for new link
        act(() => {
            linksHandler({
                eventType: 'INSERT',
                new: { id: 'link-1', source: 'task-1', target: 'task-2', type: '0', lag: 0 },
                old: {}
            });
        });

        // Should apply insert
        expect(mockSetLinks).toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('add-link', expect.objectContaining({
            link: expect.objectContaining({ id: 'link-1' }),
        }));
    });

    it('should apply link DELETE events', () => {
        mockLinksRef.current = [
            { id: 'link-1', source: 'task-1', target: 'task-2', type: '0' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the links event handler
        const linksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'links'
        )[2];

        // Emit DELETE
        act(() => {
            linksHandler({
                eventType: 'DELETE',
                new: {},
                old: { id: 'link-1' }
            });
        });

        // Should apply delete
        expect(mockSetLinks).toHaveBeenCalled();
        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('delete-link', { id: 'link-1' });
    });

    it('should apply link UPDATE events', () => {
        mockLinksRef.current = [
            { id: 'link-1', source: 'task-1', target: 'task-2', type: '0' }
        ];

        renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the links event handler
        const linksHandler = mockChannel.on.mock.calls.find(
            call => call[1]?.table === 'links'
        )[2];

        // Emit UPDATE
        act(() => {
            linksHandler({
                eventType: 'UPDATE',
                new: { id: 'link-1', source: 'task-1', target: 'task-3', type: '1' },
                old: {}
            });
        });

        // Should apply update
        expect(mockSetLinks).toHaveBeenCalled();
    });

    it('should cleanup channel on unmount', () => {
        const { unmount } = renderHook(() => useRealtimeSync({
            projectId: 'project-1',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        unmount();

        expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
});
