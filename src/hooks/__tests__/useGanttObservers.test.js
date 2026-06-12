import { renderHook, act } from '@testing-library/react';
import { useGanttObservers } from '../useGanttObservers';
import { taskEventEmitter } from '@/lib/taskEventEmitter';
import { DBObserver, UIObserver, ScheduleObserver } from '@/lib/taskObservers';

jest.mock('@/lib/taskEventEmitter', () => ({
    taskEventEmitter: {
        on: jest.fn(() => jest.fn()),
        emit: jest.fn(),
    },
}));

jest.mock('@/lib/taskObservers', () => ({
    DBObserver: jest.fn(),
    UIObserver: jest.fn(),
    ScheduleObserver: jest.fn(),
}));

const makeObserverInstance = () => ({
    handleTaskUpdated: jest.fn(),
    handleTaskCreated: jest.fn(),
    handleTaskDeleted: jest.fn(),
    handleLinkCreated: jest.fn(),
    handleLinkUpdated: jest.fn(),
    handleLinkDeleted: jest.fn(),
});

describe('useGanttObservers', () => {
    const mockTasksRef = { current: [] };
    const mockLinksRef = { current: [] };
    const mockSetTasks = jest.fn();
    const mockSetEditingTask = jest.fn();
    const mockSetLinks = jest.fn();
    const mockRecalculateAffectedTasks = jest.fn();
    const mockGanttApiRef = { current: { exec: jest.fn() } };
    const mockIsSchedulerUpdateRef = { current: false };

    const defaultProps = {
        tasksRef: mockTasksRef,
        linksRef: mockLinksRef,
        setTasks: mockSetTasks,
        setEditingTask: mockSetEditingTask,
        setLinks: mockSetLinks,
        recalculateAffectedTasks: mockRecalculateAffectedTasks,
        ganttApiRef: mockGanttApiRef,
        isSchedulerUpdateRef: mockIsSchedulerUpdateRef,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsSchedulerUpdateRef.current = false;
        DBObserver.mockImplementation(makeObserverInstance);
        UIObserver.mockImplementation(makeObserverInstance);
        ScheduleObserver.mockImplementation(makeObserverInstance);
    });

    const getRegisteredListener = (eventName) => {
        const call = taskEventEmitter.on.mock.calls.find(([event]) => event === eventName);
        return call ? call[1] : null;
    };

    it('should render without crashing', () => {
        renderHook(() => useGanttObservers(defaultProps));
    });

    it('should return observers ref', () => {
        const { result } = renderHook(() => useGanttObservers(defaultProps));
        expect(result.current).toBeDefined();
    });

    it('should register listeners for all 6 event types', () => {
        renderHook(() => useGanttObservers(defaultProps));

        const registeredEvents = taskEventEmitter.on.mock.calls.map(([event]) => event);
        expect(registeredEvents).toEqual(expect.arrayContaining([
            'task:updated', 'task:created', 'task:deleted',
            'link:created', 'link:updated', 'link:deleted',
        ]));
    });

    it('should cleanup all event listeners on unmount', () => {
        const unsubscribers = Array.from({ length: 6 }, () => jest.fn());
        let callIndex = 0;
        taskEventEmitter.on.mockImplementation(() => unsubscribers[callIndex++] ?? jest.fn());

        const { unmount } = renderHook(() => useGanttObservers(defaultProps));
        unmount();

        unsubscribers.slice(0, callIndex).forEach(unsub => {
            expect(unsub).toHaveBeenCalled();
        });
    });

    describe('skipRecalculation=true branch (task:updated)', () => {
        it('should call ganttApiRef.exec("update-task") when skipRecalculation is true', () => {
            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');

            const start = new Date('2026-06-01T00:00:00Z');
            const end = new Date('2026-06-06T00:00:00Z');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: { skipRecalculation: true, task: { id: '42', start, end, duration: 5 } },
                    timestamp: Date.now(),
                });
            });

            expect(mockGanttApiRef.current.exec).toHaveBeenCalledWith('update-task', {
                id: '42',
                task: { start, end, duration: 5 },
            });
        });

        it('should set isSchedulerUpdateRef.current=true during exec, then reset to false', () => {
            let capturedDuringExec;
            mockGanttApiRef.current.exec.mockImplementation(() => {
                capturedDuringExec = mockIsSchedulerUpdateRef.current;
            });

            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: {
                        skipRecalculation: true,
                        task: { id: '1', start: new Date(), end: new Date(), duration: 3 },
                    },
                    timestamp: Date.now(),
                });
            });

            expect(capturedDuringExec).toBe(true);
            expect(mockIsSchedulerUpdateRef.current).toBe(false);
        });

        it('should parse start_date / end_date strings when task.start|end are not Date instances', () => {
            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: {
                        skipRecalculation: true,
                        task: {
                            id: '7',
                            start_date: '2026-06-01T00:00:00Z',
                            end_date: '2026-06-06T00:00:00Z',
                            duration: 5,
                        },
                    },
                    timestamp: Date.now(),
                });
            });

            const [, execArg] = mockGanttApiRef.current.exec.mock.calls[0];
            expect(execArg.task.start).toEqual(new Date('2026-06-01T00:00:00Z'));
            expect(execArg.task.end).toEqual(new Date('2026-06-06T00:00:00Z'));
        });

        it('should fall back to start_date when end_date is absent', () => {
            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');
            const start = new Date('2026-06-01T00:00:00Z');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: {
                        skipRecalculation: true,
                        task: { id: '8', start_date: '2026-06-01T00:00:00Z', duration: 1 },
                    },
                    timestamp: Date.now(),
                });
            });

            const [, execArg] = mockGanttApiRef.current.exec.mock.calls[0];
            expect(execArg.task.start).toEqual(start);
            expect(execArg.task.end).toEqual(start);
        });

        it('should NOT call ganttApiRef.exec when skipRecalculation is false', () => {
            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: {
                        skipRecalculation: false,
                        task: { id: '1', start: new Date(), end: new Date(), duration: 3 },
                    },
                    timestamp: Date.now(),
                });
            });

            expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
        });

        it('should NOT call ganttApiRef.exec when skipRecalculation is absent', () => {
            renderHook(() => useGanttObservers(defaultProps));
            const listener = getRegisteredListener('task:updated');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: { task: { id: '1', start: new Date(), end: new Date(), duration: 3 } },
                    timestamp: Date.now(),
                });
            });

            expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
        });

        it('should NOT call ganttApiRef.exec when ganttApiRef.current is null', () => {
            const nullGanttApiRef = { current: null };
            renderHook(() => useGanttObservers({ ...defaultProps, ganttApiRef: nullGanttApiRef }));
            const listener = getRegisteredListener('task:updated');

            act(() => {
                listener({
                    type: 'task:updated',
                    payload: {
                        skipRecalculation: true,
                        task: { id: '1', start: new Date(), end: new Date(), duration: 3 },
                    },
                    timestamp: Date.now(),
                });
            });

            expect(mockGanttApiRef.current.exec).not.toHaveBeenCalled();
        });
    });
});
