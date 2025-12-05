/**
 * Gantt Scheduler
 * Auto-scheduling logic for Gantt tasks
 */

import { calculateSuccessorDate, calculateEndDate } from './scheduling';

/**
 * Create a recalculate function with dependencies injected
 * @param {Object} deps - Dependencies
 * @param {React.MutableRefObject} deps.tasksRef - Ref to tasks array
 * @param {React.MutableRefObject} deps.linksRef - Ref to links array
 * @param {Function} deps.handleTaskUpdate - Task update handler
 * @param {Function} deps.toISOString - Date to ISO string converter
 * @returns {Function} - recalculateAffectedTasks function
 */
export function createRecalculateFunction({ tasksRef, linksRef, handleTaskUpdate, toISOString }) {
    /**
     * Recalculate all tasks affected by a change
     * @param {string} changedTaskId - ID of the changed task
     * @param {Object} updatedTaskData - Optional updated task data
     */
    return async function recalculateAffectedTasks(changedTaskId, updatedTaskData = null) {
        console.log(`Recalculating tasks affected by ${changedTaskId}...`);

        // Use refs to get latest state
        const currentTasks = tasksRef.current;
        const currentLinks = linksRef.current;

        // Find all links where the changed task is the source (predecessor)
        const successorLinks = currentLinks.filter(link => String(link.source) === String(changedTaskId));

        if (successorLinks.length === 0) {
            console.log('No successors to recalculate');
            return;
        }

        console.log(`Found ${successorLinks.length} successor(s) to recalculate`);

        // Use provided updated data or get from current state
        const updatedTask = updatedTaskData || currentTasks.find(t => String(t.id) === String(changedTaskId));
        if (!updatedTask) return;

        // Recalculate each successor
        for (const link of successorLinks) {
            const successor = currentTasks.find(t => String(t.id) === String(link.target));
            console.log('[recalculate] Processing link:', { link, successor: successor?.text });

            if (successor) {
                console.log('[recalculate] Calling calculateSuccessorDate with:', {
                    predecessor: updatedTask.text,
                    successor: successor.text,
                    linkType: link.type,
                    lag: link.lag || 0
                });

                const newStartDate = calculateSuccessorDate(updatedTask, successor, link.type, link.lag || 0);
                console.log('[recalculate] calculateSuccessorDate returned:', newStartDate);

                if (newStartDate) {
                    const newEndDate = calculateEndDate(newStartDate, successor.duration);
                    console.log(`Auto-updating successor ${successor.text}: ${newStartDate.toISOString()}`);

                    // Use handleTaskUpdate to emit event (event-driven approach)
                    // Skip recalculation to prevent infinite loop
                    await handleTaskUpdate({
                        ...successor,
                        start: newStartDate,
                        start_date: toISOString(newStartDate),
                        end: newEndDate,
                        end_date: toISOString(newEndDate)
                    }, true); // skipRecalculation = true
                } else {
                    console.log('[recalculate] newStartDate is null, skipping update');
                }
            }
        }
    };
}
