/**
 * Date utility functions for consistent UTC-based date handling
 */

/**
 * Parse a date string or Date object and return a Date normalized to UTC midnight
 */
export function parseToUTC(dateInput: string | Date | null | undefined): Date | null {
    if (!dateInput) return null;

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;

    // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight per spec — return as-is
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return date;
    }

    // Strings with explicit UTC timezone are already at UTC midnight
    if (typeof dateInput === 'string' && (dateInput.endsWith('Z') || dateInput.includes('+00:00'))) {
        return date;
    }

    // If already at UTC midnight, keep it
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
        return date;
    }

    // Otherwise normalize to UTC midnight
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

/**
 * Convert a UTC date to local timezone for display (YYYY-MM-DD format)
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // Get local date components
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Convert a local date string (YYYY-MM-DD) to UTC Date object
 */
export function parseLocalDateToUTC(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Parse as local date
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;

    // Create UTC date
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return date;
}

/**
 * Add days to a UTC date
 */
export function addDaysUTC(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/**
 * Calculate end date from start date and duration
 * NOTE: Svar Gantt uses EXCLUSIVE end date
 * Duration 1 = 1 day task = end is start + 1 day (e.g., Nov 28 to Nov 29)
 * Duration 2 = 2 day task = end is start + 2 days (e.g., Nov 28 to Nov 30)
 */
export function calculateEndDateUTC(startDate: Date, duration: number): Date {
    return addDaysUTC(startDate, duration); // Exclusive end date
}

/**
 * Convert Date to ISO string for Supabase storage
 */
export function toISOString(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}
