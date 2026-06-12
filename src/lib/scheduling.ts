import { Task, ConstraintType } from '@/types/database';
import { LINK_TYPES, CONSTRAINT_TYPES } from '@/lib/constants';
import { parseToUTC, addDaysUTC } from '@/lib/dateUtils';

export function calculateSuccessorDate(
    predecessor: any,
    successor: any,
    linkType: string,
    lag: number = 0
): Date | null {
    if (!predecessor || !successor) return null;

    const predStart = parseToUTC(predecessor.start_date || predecessor.start);
    if (!predStart) return null;

    const succStart = parseToUTC(successor.start_date || successor.start);

    let predEnd = parseToUTC(predecessor.end_date || predecessor.end);

    // If predEnd is invalid, calculate it from start + duration
    if (!predEnd) {
        const predDuration = predecessor.duration || 1;
        predEnd = addDaysUTC(predStart, predDuration); // Exclusive end date
    }

    const succDuration = successor.duration || 1;

    let newStart: Date;

    switch (linkType) {
        case LINK_TYPES.FINISH_TO_START: // FS
            newStart = addDaysUTC(predEnd, 1 + lag);
            break;

        case LINK_TYPES.START_TO_START: // SS
            newStart = addDaysUTC(predStart, lag);
            break;

        case LINK_TYPES.FINISH_TO_FINISH: // FF
            // Successor ends when predecessor ends (inclusive end date from DB/SVAR)
            // Target End = PredEnd + lag (inclusive)
            // NewStart = TargetEnd - Duration + 1 (inclusive start from inclusive end)
            const targetEndFF = addDaysUTC(predEnd, lag);
            newStart = addDaysUTC(targetEndFF, -succDuration + 1);
            break;

        case LINK_TYPES.START_TO_FINISH: // SF
            // Successor ends when predecessor starts (inclusive end date)
            // Target End = PredStart + lag (inclusive)
            // NewStart = TargetEnd - Duration + 1 (inclusive start from inclusive end)
            const targetEndSF = addDaysUTC(predStart, lag);
            newStart = addDaysUTC(targetEndSF, -succDuration + 1);
            break;

        default:
            return null;
    }

    // Return null if the calculated date equals the successor's current start (no change needed)
    if (succStart && newStart.getTime() === succStart.getTime()) {
        return null;
    }

    return newStart;
}

export function calculateEndDate(startDate: Date, duration: number): Date {
    return addDaysUTC(startDate, duration); // Exclusive end date
}

/**
 * Apply scheduling constraints to a task
 * Returns adjusted start and end dates based on constraint type
 */
export function applyConstraint(
    task: Task,
    calculatedStart: Date,
    calculatedEnd: Date
): { start: Date; end: Date } {
    const constraintType = task.constraint_type || CONSTRAINT_TYPES.ASAP;
    const constraintDate = task.constraint_date ? parseToUTC(task.constraint_date) : null;
    const duration = task.duration || 1;

    switch (constraintType) {
        case CONSTRAINT_TYPES.ASAP:
            // Use calculated dates (default behavior)
            return { start: calculatedStart, end: calculatedEnd };

        case CONSTRAINT_TYPES.MSO:
            // Must start on constraint date
            if (!constraintDate) return { start: calculatedStart, end: calculatedEnd };
            return {
                start: constraintDate,
                end: addDaysUTC(constraintDate, duration)
            };

        case CONSTRAINT_TYPES.MFO:
            // Must finish on constraint date
            if (!constraintDate) return { start: calculatedStart, end: calculatedEnd };
            return {
                start: addDaysUTC(constraintDate, -duration),
                end: constraintDate
            };

        case CONSTRAINT_TYPES.SNET:
            // Start no earlier than constraint date
            if (!constraintDate) return { start: calculatedStart, end: calculatedEnd };
            if (calculatedStart < constraintDate) {
                return {
                    start: constraintDate,
                    end: addDaysUTC(constraintDate, duration)
                };
            }
            return { start: calculatedStart, end: calculatedEnd };

        case CONSTRAINT_TYPES.FNLT:
            // Finish no later than constraint date
            if (!constraintDate) return { start: calculatedStart, end: calculatedEnd };
            if (calculatedEnd > constraintDate) {
                return {
                    start: addDaysUTC(constraintDate, -duration),
                    end: constraintDate
                };
            }
            return { start: calculatedStart, end: calculatedEnd };

        case CONSTRAINT_TYPES.ALAP:
            // As late as possible — use CPM late_start if available
            if (task.late_start != null) {
                const alapStart = parseToUTC(task.late_start);
                if (alapStart) {
                    return { start: alapStart, end: addDaysUTC(alapStart, duration) };
                }
            }
            // CPM not yet run — fall back to calculated dates
            return { start: calculatedStart, end: calculatedEnd };

        default:
            return { start: calculatedStart, end: calculatedEnd };
    }
}
