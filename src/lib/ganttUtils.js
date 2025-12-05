/**
 * Gantt Utility Functions
 * Validation and normalization functions for Gantt tasks
 */

/**
 * Helper function to convert Date objects to ISO strings for Supabase
 */
const toISOString = (value) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
};

/**
 * Validate task object
 * @param {Object} task - Task object to validate
 * @returns {boolean} - Returns true if valid
 * @throws {Error} - Throws error if validation fails
 */
export function validateTask(task) {
    if (!task.id) {
        throw new Error('Task must have an id');
    }
    if (task.duration !== undefined && task.duration < 0) {
        throw new Error('Duration must be non-negative');
    }
    // Add more validation rules as needed
    return true;
}

/**
 * Normalize task object for consistent state
 * @param {Object} task - Task object to normalize
 * @returns {Object} - Normalized task object
 */
export function normalizeTask(task) {
    const normalized = { ...task };

    // Ensure duration is a number
    if (normalized.duration !== undefined) {
        normalized.duration = Number(normalized.duration);
    }

    // Ensure progress is a number between 0 and 1
    if (normalized.progress !== undefined) {
        normalized.progress = Math.max(0, Math.min(1, Number(normalized.progress)));
    }

    // Normalize dates to ISO strings
    if (normalized.start && typeof normalized.start !== 'string') {
        normalized.start_date = toISOString(normalized.start);
    }
    if (normalized.start_date && typeof normalized.start_date !== 'string') {
        normalized.start_date = toISOString(normalized.start_date);
    }

    // Remove undefined/null values
    Object.keys(normalized).forEach(key => {
        if (normalized[key] === undefined || normalized[key] === null) {
            delete normalized[key];
        }
    });

    return normalized;
}
