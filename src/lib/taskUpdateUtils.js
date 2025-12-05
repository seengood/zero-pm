/**
 * Task Update Utilities
 * Helper functions for processing task updates
 */

import { parseToUTC } from './dateUtils';

/**
 * Calculate duration from start and end dates
 * @param {Object} task - Task with potential start/end updates
 * @param {Object} currentTask - Current task state
 * @returns {number|undefined} - Calculated duration in days, or undefined if not calculable
 */
export function calculateDurationFromDates(task, currentTask) {
    // Skip if duration is already explicitly set
    if (task.duration !== undefined) {
        return task.duration;
    }

    if (task.start && task.end) {
        // Both start and end provided
        const startDate = parseToUTC(task.start);
        const endDate = parseToUTC(task.end);
        const durationInMs = endDate - startDate;
        const durationInDays = Math.ceil(durationInMs / (1000 * 60 * 60 * 24));
        return durationInDays;
    } else if (task.end && currentTask.start_date) {
        // Only end provided, use current start_date
        const startDate = parseToUTC(currentTask.start_date);
        const endDate = parseToUTC(task.end);
        const durationInMs = endDate - startDate;
        const durationInDays = Math.ceil(durationInMs / (1000 * 60 * 60 * 24));
        return durationInDays;
    } else if (task.start && currentTask.duration) {
        // Only start provided, keep current duration
        return currentTask.duration;
    }

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
    const calculatedDuration = calculateDurationFromDates(task, currentTask);
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
