/**
 * Gantt Scheduler
 * Auto-scheduling logic for Gantt tasks
 */

import { calculateSuccessorDate, calculateEndDate, applyConstraint } from './scheduling';

export function createRecalculateFunction({ tasksRef, linksRef, handleTaskUpdate, toISOString }) {
    /**
     * Recursively recalculate all tasks downstream of changedTaskId.
     *
     * @param {string} changedTaskId
     * @param {Object|null} updatedTaskData - Use this instead of tasksRef (avoids stale React state)
     * @param {Set} visited - Cycle guard; shared across the entire cascade call tree
     */
    async function recalculateAffectedTasks(changedTaskId, updatedTaskData = null, visited = new Set()) {
        if (visited.has(String(changedTaskId))) return;
        visited.add(String(changedTaskId));

        const currentTasks = tasksRef.current;
        const currentLinks = linksRef.current;

        const successorLinks = currentLinks.filter(link => String(link.source) === String(changedTaskId));
        if (successorLinks.length === 0) return;

        // Prefer caller-supplied data — tasksRef.current may be stale because React
        // state updates are async and haven't flushed yet at this point.
        const predecessorTask = updatedTaskData || currentTasks.find(t => String(t.id) === String(changedTaskId));
        if (!predecessorTask) return;

        for (const link of successorLinks) {
            const successor = currentTasks.find(t => String(t.id) === String(link.target));
            if (!successor || visited.has(String(successor.id))) continue;

            const newStartDate = calculateSuccessorDate(predecessorTask, successor, link.type, link.lag || 0);
            if (!newStartDate) continue; // calculateSuccessorDate returns null when date is unchanged

            // Apply scheduling constraint (ASAP / SNET / MSO / MFO / FNLT / ALAP)
            const rawEndDate = calculateEndDate(newStartDate, successor.duration);
            const { start: constrainedStart, end: constrainedEnd } = applyConstraint(successor, newStartDate, rawEndDate);

            const updatedSuccessor = {
                ...successor,
                start: constrainedStart,
                start_date: toISOString(constrainedStart),
                end: constrainedEnd,
                end_date: toISOString(constrainedEnd),
            };

            // Save to DB + update SVAR Gantt; skipRecalculation=true so handleTaskUpdate
            // does NOT re-trigger this function (we handle cascading here).
            await handleTaskUpdate(updatedSuccessor, true);

            // Propagate further down the chain.
            // Pass updatedSuccessor directly so the next level uses current (not stale) data.
            await recalculateAffectedTasks(successor.id, updatedSuccessor, visited);
        }
    }

    return recalculateAffectedTasks;
}
