/**
 * Date utility functions for consistent timezone handling
 * Uses local timezone to match Svar Gantt behavior
 */

/**
 * Parse a date string or Date object and return a Date normalized to local midnight
 */
export function parseToUTC(dateInput: string | Date | null | undefined): Date | null {
    if (!dateInput) return null;

    console.log('[parseToUTC] Input:', dateInput, 'Type:', typeof dateInput);

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;

    // If input is a string with UTC timezone (Z or +00:00), it's already at UTC midnight
    // Don't modify it, just return as-is
    if (typeof dateInput === 'string' && (dateInput.endsWith('Z') || dateInput.includes('+00:00'))) {
        console.log('[parseToUTC] UTC string detected, returning as-is:', date.toISOString());
        return date;
    }

    // If input is a Date object and it's already at UTC midnight (00:00:00.000), keep it
    if (dateInput instanceof Date) {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        const ms = date.getUTCMilliseconds();

        if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
            console.log('[parseToUTC] Date object already at UTC midnight, returning as-is:', date.toISOString());
            return date;
        }
    }

    // Otherwise, set to local midnight (not UTC)
    date.setHours(0, 0, 0, 0);
    console.log('[parseToUTC] Set to local midnight:', date.toISOString());
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
 * Add days to a date (local timezone)
 */
export function addDaysUTC(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
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
