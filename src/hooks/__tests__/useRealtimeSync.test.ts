import { renderHook } from '@testing-library/react';
import { useRealtimeSync } from '../useRealtimeSync';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => ({
        channel: jest.fn(() => ({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
        removeChannel: jest.fn(),
    })),
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

    it('should render without projectId', () => {
        renderHook(() => useRealtimeSync({
            projectId: '',
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setLinks: mockSetLinks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));
    });
});
