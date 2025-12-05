
import { calculateSuccessorDate, calculateEndDate } from '../scheduling';
import { LINK_TYPES } from '../constants';

describe('calculateSuccessorDate - Specific Scenarios', () => {
    it('should correctly calculate start date when changing from FS to SS', () => {
        const predecessor = {
            id: '1',
            text: 'Task A',
            start_date: '2025-11-28',
            duration: 5,
            end_date: '2025-12-02' // Inclusive end date
        };

        const successor = {
            id: '2',
            text: 'Task B',
            start_date: '2025-12-18', // Current wrong date
            duration: 5
        };

        // Test SS link
        const newDateSS = calculateSuccessorDate(
            predecessor,
            successor,
            LINK_TYPES.START_TO_START,
            0
        );

        expect(newDateSS).not.toBeNull();
        // Should be same as predecessor start
        expect(newDateSS?.toISOString().split('T')[0]).toBe('2025-11-28');

        // Test FS link
        const newDateFS = calculateSuccessorDate(
            predecessor,
            successor,
            LINK_TYPES.FINISH_TO_START,
            0
        );

        expect(newDateFS).not.toBeNull();
        // Should be predecessor end + 1 day
        // Dec 2 + 1 = Dec 3
        expect(newDateFS?.toISOString().split('T')[0]).toBe('2025-12-03');
    });
});
