import { renderHook } from '@testing-library/react';
import { useGanttObservers } from '../useGanttObservers';

// Mock taskEventEmitter
jest.mock('@/lib/taskEventEmitter', () => ({
    taskEventEmitter: {
        on: jest.fn(() => jest.fn()),
    },
}));

// Mock taskObservers
jest.mock('@/lib/taskObservers', () => ({
    DBObserver: jest.fn(),
    UIObserver: jest.fn(),
    ScheduleObserver: jest.fn(),
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
    });
});