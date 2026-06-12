import { renderHook, act } from '@testing-library/react';
import { useGanttObservers } from '../useGanttObservers';

// Mock taskEventEmitter
const mockUnsubscribe = jest.fn();
const mockTaskEventEmitter = {
    on: jest.fn(() => mockUnsubscribe),
    emit: jest.fn(),
};

jest.mock('@/lib/taskEventEmitter', () => ({
    taskEventEmitter: mockTaskEventEmitter,
}));

// Mock taskObservers
const mockDBObserver = {
    handleTaskUpdated: jest.fn(),
    handleTaskCreated: jest.fn(),
    handleTaskDeleted: jest.fn(),
    handleLinkCreated: jest.fn(),
    handleLinkUpdated: jest.fn(),
    handleLinkDeleted: jest.fn(),
};

const mockUIObserver = {
    handleTaskUpdated: jest.fn(),
    handleTaskCreated: jest.fn(),
    handleTaskDeleted: jest.fn(),
    handleLinkCreated: jest.fn(),
    handleLinkUpdated: jest.fn(),
    handleLinkDeleted: jest.fn(),
};

const mockScheduleObserver = {
    handleLinkCreated: jest.fn(),
    handleLinkUpdated: jest.fn(),
    handleLinkDeleted: jest.fn(),
};

jest.mock('@/lib/taskObservers', () => ({
    DBObserver: jest.fn(() => mockDBObserver),
    UIObserver: jest.fn(() => mockUIObserver),
    ScheduleObserver: jest.fn(() => mockScheduleObserver),
}));

describe('useGanttObservers', () => {
    const mockTasksRef = { current: [] };
    const mockLinksRef = { current: [] };
    const mockSetTasks = jest.fn();
    const mockSetEditingTask = jest.fn();
    const mockSetLinks = jest.fn();
    const mockRecalculateAffectedTasks = jest.fn();
    const mockGanttApiRef = { current: { exec: jest.fn() } };
    const mockIsSchedulerUpdateRef = { current: false };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUnsubscribe.mockClear();
    });

    it('should render without crashing', () => {
        renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));
    });

    it('should return observers ref', () => {
        const { result } = renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        expect(result.current).toBeDefined();
        expect(result.current.db).toBe(mockDBObserver);
        expect(result.current.ui).toBe(mockUIObserver);
        expect(result.current.schedule).toBe(mockScheduleObserver);
    });

    it('should register event listeners on mount', () => {
        renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Should register 6 event listeners
        expect(mockTaskEventEmitter.on).toHaveBeenCalledTimes(6);
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('task:updated', expect.any(Function));
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('task:created', expect.any(Function));
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('task:deleted', expect.any(Function));
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('link:created', expect.any(Function));
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('link:updated', expect.any(Function));
        expect(mockTaskEventEmitter.on).toHaveBeenCalledWith('link:deleted', expect.any(Function));
    });

    it('should unregister event listeners on unmount', () => {
        const { unmount } = renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        unmount();

        expect(mockUnsubscribe).toHaveBeenCalledTimes(6);
    });

    it('should call SVAR exec when skipRecalculation is true', () => {
        const mockTask = {
            id: 'task-1',
            start_date: '2026-06-12',
            end_date: '2026-06-15',
            duration: 3
        };

        renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the task:updated event handler
        const taskUpdatedHandler = mockTaskEventEmitter.on.mock.calls.find(
            call => call[0] === 'task:updated'
        )[1];

        // Emit event with skipRecalculation=true
        act(() => {
            taskUpdatedHandler({
                payload: {
                    task: mockTask,
                    updates: {},
                    skipRecalculation: true
                }
            });
        });

        expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('update-task', {
            id: 'task-1',
            task: {
                start: expect.any(Date),
                end: expect.any(Date),
                duration: 3
            }
        });
        expect(mockIsSchedulerUpdateRef.current).toBe(false);
    });

    it('should not call SVAR exec when skipRecalculation is false', () => {
        const mockTask = {
            id: 'task-1',
            start_date: '2026-06-12',
            end_date: '2026-06-15',
            duration: 3
        };

        renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: mockGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the task:updated event handler
        const taskUpdatedHandler = mockTaskEventEmitter.on.mock.calls.find(
            call => call[0] === 'task:updated'
        )[1];

        // Emit event with skipRecalculation=false
        act(() => {
            taskUpdatedHandler({
                payload: {
                    task: mockTask,
                    updates: {},
                    skipRecalculation: false
                }
            });
        });

        expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
    });

    it('should not call SVAR exec when ganttApiRef is null', () => {
        const mockTask = {
            id: 'task-1',
            start_date: '2026-06-12',
            end_date: '2026-06-15',
            duration: 3
        };

        const nullGanttApiRef = { current: null };

        renderHook(() => useGanttObservers({
            tasksRef: mockTasksRef,
            linksRef: mockLinksRef,
            setTasks: mockSetTasks,
            setEditingTask: mockSetEditingTask,
            setLinks: mockSetLinks,
            recalculateAffectedTasks: mockRecalculateAffectedTasks,
            ganttApiRef: nullGanttApiRef,
            isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
        }));

        // Get the task:updated event handler
        const taskUpdatedHandler = mockTaskEventEmitter.on.mock.calls.find(
            call => call[0] === 'task:updated'
        )[1];

        // Emit event with skipRecalculation=true
        act(() => {
            taskUpdatedHandler({
                payload: {
                    task: mockTask,
                    updates: {},
                    skipRecalculation: true
                }
            });
        });

        expect(nullGanttApiRef.current.exec).not.toHaveBeenCalled();
    });
});