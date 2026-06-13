/**
 * @jest-environment jsdom
 */

import { createRecalculateFunction } from '../ganttScheduler';
import { calculateSuccessorDate, calculateEndDate } from '../scheduling';

// Mock the scheduling functions
jest.mock('../scheduling', () => ({
    calculateSuccessorDate: jest.fn(),
    calculateEndDate: jest.fn(),
    applyConstraint: jest.fn((task, start, end) => ({ start, end })),
}));

describe('ganttScheduler', () => {
    let tasksRef;
    let linksRef;
    let handleTaskUpdate;
    let toISOString;
    let recalculateAffectedTasks;

    beforeEach(() => {
        // Setup refs
        tasksRef = {
            current: [
                { id: 'task-1', text: 'Task 1', start_date: '2025-12-01T00:00:00.000Z', duration: 3 },
                { id: 'task-2', text: 'Task 2', start_date: '2025-12-05T00:00:00.000Z', duration: 2 }
            ]
        };
        linksRef = {
            current: [
                { id: 'link-1', source: 'task-1', target: 'task-2', type: 'e2s', lag: 0 }
            ]
        };

        // Mock functions
        handleTaskUpdate = jest.fn().mockResolvedValue(undefined);
        toISOString = jest.fn(date => date instanceof Date ? date.toISOString() : date);

        // Create recalculate function
        recalculateAffectedTasks = createRecalculateFunction({
            tasksRef,
            linksRef,
            handleTaskUpdate,
            toISOString
        });

        // Reset mocks
        calculateSuccessorDate.mockClear();
        calculateEndDate.mockClear();
    });

    test('should recalculate successor tasks when predecessor changes', async () => {
        const newStartDate = new Date('2025-12-04T00:00:00.000Z');
        const newEndDate = new Date('2025-12-06T00:00:00.000Z');

        calculateSuccessorDate.mockReturnValue(newStartDate);
        calculateEndDate.mockReturnValue(newEndDate);

        await recalculateAffectedTasks('task-1');

        expect(calculateSuccessorDate).toHaveBeenCalledWith(
            tasksRef.current[0],
            tasksRef.current[1],
            'e2s',
            0
        );
        expect(calculateEndDate).toHaveBeenCalledWith(newStartDate, 2);
        expect(handleTaskUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'task-2',
                start: newStartDate,
                end: newEndDate
            }),
            true // skipRecalculation
        );
    });

    test('should skip recalculation when no successors exist', async () => {
        await recalculateAffectedTasks('task-2'); // task-2 has no successors

        expect(calculateSuccessorDate).not.toHaveBeenCalled();
        expect(handleTaskUpdate).not.toHaveBeenCalled();
    });

    test('should skip update when calculateSuccessorDate returns null', async () => {
        calculateSuccessorDate.mockReturnValue(null);

        await recalculateAffectedTasks('task-1');

        expect(calculateSuccessorDate).toHaveBeenCalled();
        expect(handleTaskUpdate).not.toHaveBeenCalled();
    });

    test('should use provided updatedTaskData instead of finding in state', async () => {
        const updatedTask = { id: 'task-1', text: 'Updated Task 1', start_date: '2025-12-02T00:00:00.000Z', duration: 5 };
        const newStartDate = new Date('2025-12-07T00:00:00.000Z');

        calculateSuccessorDate.mockReturnValue(newStartDate);
        calculateEndDate.mockReturnValue(new Date('2025-12-09T00:00:00.000Z'));

        await recalculateAffectedTasks('task-1', updatedTask);

        expect(calculateSuccessorDate).toHaveBeenCalledWith(
            updatedTask, // Should use provided data
            tasksRef.current[1],
            'e2s',
            0
        );
    });

    test('should handle multiple successors', async () => {
        linksRef.current = [
            { id: 'link-1', source: 'task-1', target: 'task-2', type: 'e2s', lag: 0 },
            { id: 'link-2', source: 'task-1', target: 'task-3', type: 'e2s', lag: 1 }
        ];
        tasksRef.current.push({ id: 'task-3', text: 'Task 3', start_date: '2025-12-10T00:00:00.000Z', duration: 1 });

        calculateSuccessorDate.mockReturnValue(new Date('2025-12-04T00:00:00.000Z'));
        calculateEndDate.mockReturnValue(new Date('2025-12-06T00:00:00.000Z'));

        await recalculateAffectedTasks('task-1');

        expect(calculateSuccessorDate).toHaveBeenCalledTimes(2);
        expect(handleTaskUpdate).toHaveBeenCalledTimes(2);
    });
});
