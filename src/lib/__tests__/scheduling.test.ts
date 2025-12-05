import { calculateSuccessorDate } from '../scheduling';
import { LINK_TYPES } from '@/lib/constants';

describe('calculateSuccessorDate', () => {
    const predecessor = {
        id: '1',
        text: 'Predecessor',
        start_date: '2023-01-01',
        end_date: '2023-01-05', // 5 days duration (1,2,3,4,5)
        duration: 5
    };

    const successor = {
        id: '2',
        text: 'Successor',
        start_date: '2023-01-01',
        duration: 2
    };

    it('should calculate FS date correctly', () => {
        // Pred End: Jan 5. FS means start Jan 6.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.FINISH_TO_START, 0);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-06');
    });

    it('should calculate FS date with lag correctly', () => {
        // Pred End: Jan 5. FS + 2 days lag means start Jan 8.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.FINISH_TO_START, 2);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-08');
    });

    it('should calculate SS date correctly', () => {
        // Pred Start: Jan 1. SS means start Jan 1.
        // Current succ start is Jan 1. So should return null (no change).
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.START_TO_START, 0);
        expect(newDate).toBeNull();
    });

    it('should calculate SS date with lag correctly', () => {
        // Pred Start: Jan 1. SS + 2 days lag means start Jan 3.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.START_TO_START, 2);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-03');
    });

    it('should calculate FF date correctly', () => {
        // Pred End: Jan 5. FF means Succ End = Jan 5.
        // Succ Duration: 2. Start = End - Duration + 1 = 5 - 2 + 1 = 4. Jan 4.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.FINISH_TO_FINISH, 0);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-04');
    });

    it('should calculate SF date correctly', () => {
        // Pred Start: Jan 1. SF means Succ End = Jan 1.
        // Succ Duration: 2. Start = End - Duration + 1 = 1 - 2 + 1 = Dec 31 2022.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.START_TO_FINISH, 0);
        expect(newDate?.toISOString().split('T')[0]).toBe('2022-12-31');
    });

    // Negative Lag Tests
    it('should calculate FS date with negative lag correctly', () => {
        // Pred End: Jan 5. FS - 2 days lag means start Jan 4. (Jan 6 - 2 = Jan 4)
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.FINISH_TO_START, -2);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-04');
    });

    it('should calculate SS date with negative lag correctly', () => {
        // Pred Start: Jan 1. SS - 1 day lag means start Dec 31 2022.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.START_TO_START, -1);
        expect(newDate?.toISOString().split('T')[0]).toBe('2022-12-31');
    });

    it('should calculate FF date with negative lag correctly', () => {
        // Pred End: Jan 5. FF - 1 day lag means Succ End = Jan 4.
        // Succ Duration: 2. Start = End - Duration + 1 = 4 - 2 + 1 = 3. Jan 3.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.FINISH_TO_FINISH, -1);
        expect(newDate?.toISOString().split('T')[0]).toBe('2023-01-03');
    });

    it('should calculate SF date with negative lag correctly', () => {
        // Pred Start: Jan 1. SF - 1 day lag means Succ End = Dec 31 2022.
        // Succ Duration: 2. Start = End - Duration + 1 = Dec 31 - 2 + 1 = Dec 30 2022.
        const newDate = calculateSuccessorDate(predecessor, successor, LINK_TYPES.START_TO_FINISH, -1);
        expect(newDate?.toISOString().split('T')[0]).toBe('2022-12-30');
    });
});
