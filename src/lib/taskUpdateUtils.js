/**
 * Task Update Utilities
 * Scheduling-related helper functions for processing task updates
 */

/**
 * Calculate task duration from start and end dates
 * This is a scheduling utility function
 *
 * @param {Object} task - Task with potential start/end updates
 * @returns {number|undefined} - Calculated duration in days, or undefined if not calculable
 */
export function calculateTaskDuration(task) {
    // If duration is already explicitly set, use it
    if (task.duration !== undefined) {
        return task.duration;
    }

    // Do not calculate duration from start/end dates implicitly.
    // If explicit duration is missing, we assume it hasn't changed.
    return undefined;
}

/**
 * Prepare database updates from task changes
 * @param {Object} task - Task with updates
 * @param {Object} currentTask - Current task state
 * @param {Function} toISOString - Date to ISO string converter
 * @returns {Object} - Updates object for database
 */
export function prepareTaskUpdates(task, currentTask, toISOString) {
    const updates = {};

    if (task.text !== undefined) updates.text = task.text;
    if (task.start !== undefined) updates.start_date = toISOString(task.start);
    if (task.start_date !== undefined) updates.start_date = task.start_date;

    // Calculate and add duration if it changed
    const calculatedDuration = calculateTaskDuration(task);
    if (calculatedDuration !== undefined && calculatedDuration !== currentTask.duration) {
        updates.duration = calculatedDuration;
    }

    if (task.parent !== undefined) updates.parent_id = task.parent ? String(task.parent) : null;
    if (task.progress !== undefined) updates.progress = task.progress;
    if (task.type !== undefined) updates.type = task.type;
    if (task.description !== undefined) updates.description = task.description;
    if (task.constraint_type !== undefined) updates.constraint_type = task.constraint_type;
    if (task.constraint_date !== undefined) {
        updates.constraint_date = task.constraint_date ? toISOString(task.constraint_date) : null;
    }

    return updates;
}

/**
 * Check if task changes affect schedule
 * @param {Object} task - Task with updates
 * @returns {boolean} - True if changes affect schedule
 */
export function changesAffectSchedule(task) {
    return task.start !== undefined || task.duration !== undefined || task.start_date !== undefined;
}
