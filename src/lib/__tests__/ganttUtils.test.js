/**
 * @jest-environment jsdom
 */

import { validateTask, normalizeTask } from '../ganttUtils';

describe('ganttUtils', () => {
    describe('validateTask', () => {
        test('should return true for valid task', () => {
            const validTask = {
                id: 'task-1',
                text: 'Test Task',
                duration: 5
            };
            expect(validateTask(validTask)).toBe(true);
        });

        test('should throw error if task has no id', () => {
            const invalidTask = {
                text: 'Test Task',
                duration: 5
            };
            expect(() => validateTask(invalidTask)).toThrow('Task must have an id');
        });

        test('should throw error if duration is negative', () => {
            const invalidTask = {
                id: 'task-1',
                text: 'Test Task',
                duration: -5
            };
            expect(() => validateTask(invalidTask)).toThrow('Duration must be non-negative');
        });

        test('should allow task with undefined duration', () => {
            const validTask = {
                id: 'task-1',
                text: 'Test Task'
            };
            expect(validateTask(validTask)).toBe(true);
        });
    });

    describe('normalizeTask', () => {
        test('should normalize task data', () => {
            const task = {
                id: 'task-1',
                text: 'Test Task',
                duration: '5',
                progress: '0.5'
            };
            const normalized = normalizeTask(task);

            expect(normalized.duration).toBe(5);
            expect(normalized.progress).toBe(0.5);
        });

        test('should clamp progress between 0 and 1', () => {
            const task1 = {
                id: 'task-1',
                progress: 1.5
            };
            const normalized1 = normalizeTask(task1);
            expect(normalized1.progress).toBe(1);

            const task2 = {
                id: 'task-2',
                progress: -0.5
            };
            const normalized2 = normalizeTask(task2);
            expect(normalized2.progress).toBe(0);
        });

        test('should convert Date objects to ISO strings', () => {
            const date = new Date('2025-12-05T00:00:00.000Z');
            const task = {
                id: 'task-1',
                start: date
            };
            const normalized = normalizeTask(task);

            expect(normalized.start_date).toBe('2025-12-05T00:00:00.000Z');
        });

        test('should remove undefined and null values', () => {
            const task = {
                id: 'task-1',
                text: 'Test Task',
                duration: 5,
                undefinedField: undefined,
                nullField: null
            };
            const normalized = normalizeTask(task);

            expect(normalized).toHaveProperty('id');
            expect(normalized).toHaveProperty('text');
            expect(normalized).toHaveProperty('duration');
            expect(normalized).not.toHaveProperty('undefinedField');
            expect(normalized).not.toHaveProperty('nullField');
        });

        test('should not mutate original task', () => {
            const task = {
                id: 'task-1',
                duration: '5'
            };
            const original = { ...task };
            normalizeTask(task);

            expect(task).toEqual(original);
        });
    });
});
