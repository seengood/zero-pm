import { applyConstraint } from '../scheduling';
import { CONSTRAINT_TYPES } from '@/lib/constants';
import { Task } from '@/types/database';

// Helper: build a minimal Task fixture, overriding only the fields needed per test
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'proj-1',
    parent_id: null,
    text: 'Test Task',
    start_date: '2025-01-01',
    duration: 5,
    progress: 0,
    type: 'task',
    sort_order: 0,
    constraint_type: null,
    constraint_date: null,
    early_start: null,
    early_finish: null,
    late_start: null,
    late_finish: null,
    total_float: null,
    is_critical: false,
    version: 1,
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper: build a UTC Date from a YYYY-MM-DD string
function utc(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

// Helper: extract just the date portion of a Date as YYYY-MM-DD
function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

describe('applyConstraint', () => {
  // Shared calculated dates used across multiple tests
  const calcStart = utc('2025-03-10');
  const calcEnd   = utc('2025-03-15'); // duration 5 (exclusive end = start + 5)

  describe('ALAP', () => {
    it('uses late_start as start date when task.late_start is set', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.ALAP,
        late_start: '2025-04-01',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-04-01');
      // end must be late_start + duration (exclusive)
      expect(isoDate(result.end)).toBe('2025-04-06');
    });

    it('falls back to calculatedStart when task.late_start is null', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.ALAP,
        late_start: null,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });

  describe('ASAP', () => {
    it('returns calculatedStart and calculatedEnd unchanged', () => {
      const task = makeTask({ constraint_type: CONSTRAINT_TYPES.ASAP });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });

    it('also returns calculated dates when constraint_type is null (default ASAP)', () => {
      const task = makeTask({ constraint_type: null });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });

  describe('MSO (Must Start On)', () => {
    it('uses constraint_date as start and derives end from duration', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.MSO,
        constraint_date: '2025-05-01',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-05-01');
      expect(isoDate(result.end)).toBe('2025-05-06'); // 2025-05-01 + 5 days
    });

    it('falls back to calculated dates when constraint_date is missing', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.MSO,
        constraint_date: null,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });

  describe('MFO (Must Finish On)', () => {
    it('adjusts start so that finish equals constraint_date', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.MFO,
        constraint_date: '2025-05-10',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      // end === constraint_date
      expect(isoDate(result.end)).toBe('2025-05-10');
      // start === constraint_date - duration = 2025-05-10 - 5 = 2025-05-05
      expect(isoDate(result.start)).toBe('2025-05-05');
    });

    it('falls back to calculated dates when constraint_date is missing', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.MFO,
        constraint_date: null,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });

  describe('SNET (Start No Earlier Than)', () => {
    it('uses constraintDate when calculatedStart is before the constraint', () => {
      // calcStart 2025-03-10 < constraint 2025-04-01 → must shift forward
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.SNET,
        constraint_date: '2025-04-01',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-04-01');
      expect(isoDate(result.end)).toBe('2025-04-06');
    });

    it('keeps calculatedStart when it is already on or after the constraint date', () => {
      // calcStart 2025-03-10 >= constraint 2025-03-01 → no change
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.SNET,
        constraint_date: '2025-03-01',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });

    it('keeps calculatedStart when it equals the constraint date exactly', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.SNET,
        constraint_date: '2025-03-10', // same as calcStart
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });

  describe('FNLT (Finish No Later Than)', () => {
    it('adjusts start backward when calculatedEnd exceeds constraint_date', () => {
      // calcEnd 2025-03-15 > constraint 2025-03-12 → must pull start back
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.FNLT,
        constraint_date: '2025-03-12',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.end)).toBe('2025-03-12');
      // start = constraint_date - duration = 2025-03-12 - 5 = 2025-03-07
      expect(isoDate(result.start)).toBe('2025-03-07');
    });

    it('keeps calculated dates when calculatedEnd is within the constraint', () => {
      // calcEnd 2025-03-15 <= constraint 2025-03-20 → no change
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.FNLT,
        constraint_date: '2025-03-20',
        duration: 5,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });

    it('falls back to calculated dates when constraint_date is missing', () => {
      const task = makeTask({
        constraint_type: CONSTRAINT_TYPES.FNLT,
        constraint_date: null,
      });

      const result = applyConstraint(task, calcStart, calcEnd);

      expect(isoDate(result.start)).toBe('2025-03-10');
      expect(isoDate(result.end)).toBe('2025-03-15');
    });
  });
});
