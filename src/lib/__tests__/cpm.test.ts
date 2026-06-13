import { calculateCPM } from '../cpm';
import { Task, Link } from '@/types/database';
import { LINK_TYPES } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(id: string, startDate: string, duration: number): Task {
  return {
    id,
    project_id: 'proj-1',
    parent_id: null,
    text: `Task ${id}`,
    start_date: startDate,
    duration,
    progress: 0,
    type: 'task',
    sort_order: null,
    constraint_type: null,
    constraint_date: null,
    early_start: null,
    early_finish: null,
    late_start: null,
    late_finish: null,
    total_float: null,
    is_critical: false,
    version: 1,
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

function makeLink(
  id: string,
  source: string,
  target: string,
  type: 'e2s' | 's2s' | 'e2e' | 's2e',
  lag = 0,
): Link {
  return { id, source, target, type, lag, project_id: 'proj-1' };
}

/** Extract YYYY-MM-DD from an ISO date string. */
function toDate(iso: string): string {
  return iso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateCPM', () => {
  // -------------------------------------------------------------------------
  // (1) Linear chain: A(10d) -> B(5d) -> C(7d), all FS
  //
  // Forward pass (exclusive end dates):
  //   A: ES=2024-01-01, EF=2024-01-11
  //   B: ES=2024-01-11, EF=2024-01-16
  //   C: ES=2024-01-16, EF=2024-01-23  (project deadline)
  //
  // Backward pass:
  //   C: LF=2024-01-23, LS=2024-01-16, float=0
  //   B: LF=2024-01-16, LS=2024-01-11, float=0
  //   A: LF=2024-01-11, LS=2024-01-01, float=0
  //
  // All three tasks are on the critical path.
  // -------------------------------------------------------------------------
  describe('linear chain: A(10d) -> B(5d) -> C(7d), all FS', () => {
    const tasks = [
      makeTask('A', '2024-01-01', 10),
      makeTask('B', '2024-01-01', 5),
      makeTask('C', '2024-01-01', 7),
    ];
    const links = [
      makeLink('L1', 'A', 'B', LINK_TYPES.FINISH_TO_START as 'e2s'),
      makeLink('L2', 'B', 'C', LINK_TYPES.FINISH_TO_START as 'e2s'),
    ];

    let result: ReturnType<typeof calculateCPM>;

    beforeAll(() => {
      result = calculateCPM(tasks, links);
    });

    it('returns a Map with 3 entries', () => {
      expect(result.size).toBe(3);
    });

    it('task A: ES=2024-01-01, EF=2024-01-11, LS=2024-01-01, LF=2024-01-11', () => {
      const a = result.get('A')!;
      expect(toDate(a.early_start)).toBe('2024-01-01');
      expect(toDate(a.early_finish)).toBe('2024-01-11');
      expect(toDate(a.late_start)).toBe('2024-01-01');
      expect(toDate(a.late_finish)).toBe('2024-01-11');
    });

    it('task B: ES=2024-01-11, EF=2024-01-16, LS=2024-01-11, LF=2024-01-16', () => {
      const b = result.get('B')!;
      expect(toDate(b.early_start)).toBe('2024-01-11');
      expect(toDate(b.early_finish)).toBe('2024-01-16');
      expect(toDate(b.late_start)).toBe('2024-01-11');
      expect(toDate(b.late_finish)).toBe('2024-01-16');
    });

    it('task C: ES=2024-01-16, EF=2024-01-23, LS=2024-01-16, LF=2024-01-23', () => {
      const c = result.get('C')!;
      expect(toDate(c.early_start)).toBe('2024-01-16');
      expect(toDate(c.early_finish)).toBe('2024-01-23');
      expect(toDate(c.late_start)).toBe('2024-01-16');
      expect(toDate(c.late_finish)).toBe('2024-01-23');
    });

    it('all tasks have total_float = 0', () => {
      expect(result.get('A')!.total_float).toBe(0);
      expect(result.get('B')!.total_float).toBe(0);
      expect(result.get('C')!.total_float).toBe(0);
    });

    it('all tasks are critical', () => {
      expect(result.get('A')!.is_critical).toBe(true);
      expect(result.get('B')!.is_critical).toBe(true);
      expect(result.get('C')!.is_critical).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // (2) Diamond: A(5d) -> B(10d) -> D(5d), A(5d) -> C(3d) -> D(5d), all FS
  //
  // Forward pass:
  //   A: ES=2024-01-01, EF=2024-01-06
  //   B: ES=2024-01-06, EF=2024-01-16
  //   C: ES=2024-01-06, EF=2024-01-09
  //   D: ES=max(2024-01-16, 2024-01-09)=2024-01-16, EF=2024-01-21 (deadline)
  //
  // Backward pass:
  //   D: LF=2024-01-21, LS=2024-01-16, float=0  → critical
  //   B: LF=2024-01-16, LS=2024-01-06, float=0  → critical
  //   C: LF=2024-01-16, LS=2024-01-13, float=7  → not critical
  //   A: min(LF from B path, LF from C path) = min(2024-01-06, 2024-01-13) = 2024-01-06
  //      LS=2024-01-01, float=0 → critical
  // -------------------------------------------------------------------------
  describe('diamond: A(5d)->B(10d)->D(5d) and A(5d)->C(3d)->D(5d), all FS', () => {
    const tasks = [
      makeTask('A', '2024-01-01', 5),
      makeTask('B', '2024-01-01', 10),
      makeTask('C', '2024-01-01', 3),
      makeTask('D', '2024-01-01', 5),
    ];
    const links = [
      makeLink('L1', 'A', 'B', LINK_TYPES.FINISH_TO_START as 'e2s'),
      makeLink('L2', 'A', 'C', LINK_TYPES.FINISH_TO_START as 'e2s'),
      makeLink('L3', 'B', 'D', LINK_TYPES.FINISH_TO_START as 'e2s'),
      makeLink('L4', 'C', 'D', LINK_TYPES.FINISH_TO_START as 'e2s'),
    ];

    let result: ReturnType<typeof calculateCPM>;

    beforeAll(() => {
      result = calculateCPM(tasks, links);
    });

    it('returns a Map with 4 entries', () => {
      expect(result.size).toBe(4);
    });

    it('task A is critical with float=0', () => {
      const a = result.get('A')!;
      expect(a.total_float).toBe(0);
      expect(a.is_critical).toBe(true);
    });

    it('task B is critical with float=0 (longer path)', () => {
      const b = result.get('B')!;
      expect(toDate(b.early_start)).toBe('2024-01-06');
      expect(toDate(b.early_finish)).toBe('2024-01-16');
      expect(b.total_float).toBe(0);
      expect(b.is_critical).toBe(true);
    });

    it('task C is not critical and has float=7', () => {
      const c = result.get('C')!;
      expect(toDate(c.early_start)).toBe('2024-01-06');
      expect(toDate(c.early_finish)).toBe('2024-01-09');
      expect(toDate(c.late_start)).toBe('2024-01-13');
      expect(toDate(c.late_finish)).toBe('2024-01-16');
      expect(c.total_float).toBe(7);
      expect(c.is_critical).toBe(false);
    });

    it('task D is critical with float=0', () => {
      const d = result.get('D')!;
      expect(toDate(d.early_start)).toBe('2024-01-16');
      expect(toDate(d.late_start)).toBe('2024-01-16');
      expect(d.total_float).toBe(0);
      expect(d.is_critical).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // (3) SS link with lag=2: B.ES = A.ES + 2
  //
  // A starts 2024-01-01. SS + lag=2 means B.ES = A.ES + 2 = 2024-01-03.
  // -------------------------------------------------------------------------
  describe('SS link with lag=2', () => {
    const tasks = [
      makeTask('A', '2024-01-01', 5),
      makeTask('B', '2024-01-01', 3),
    ];
    const links = [
      makeLink('L1', 'A', 'B', LINK_TYPES.START_TO_START as 's2s', 2),
    ];

    let result: ReturnType<typeof calculateCPM>;

    beforeAll(() => {
      result = calculateCPM(tasks, links);
    });

    it('B.early_start = A.early_start + 2 days = 2024-01-03', () => {
      const b = result.get('B')!;
      expect(toDate(b.early_start)).toBe('2024-01-03');
    });

    it('B.early_finish = 2024-01-06 (ES + duration 3d)', () => {
      const b = result.get('B')!;
      expect(toDate(b.early_finish)).toBe('2024-01-06');
    });
  });

  // -------------------------------------------------------------------------
  // (4) FF link (no lag): B.EF = A.EF
  //
  // A: ES=2024-01-01, dur=8, EF=2024-01-09
  // FF (lag=0): candidateES for B = pEF + lag - dur_B = 2024-01-09 + 0 - 5 = 2024-01-04
  // B: ES=2024-01-04, EF=2024-01-09  (== A.EF)
  // -------------------------------------------------------------------------
  describe('FF link (no lag): B.EF = A.EF', () => {
    const tasks = [
      makeTask('A', '2024-01-01', 8),
      makeTask('B', '2024-01-01', 5),
    ];
    const links = [
      makeLink('L1', 'A', 'B', LINK_TYPES.FINISH_TO_FINISH as 'e2e'),
    ];

    let result: ReturnType<typeof calculateCPM>;

    beforeAll(() => {
      result = calculateCPM(tasks, links);
    });

    it('B.early_finish equals A.early_finish (2024-01-09)', () => {
      const a = result.get('A')!;
      const b = result.get('B')!;
      expect(toDate(a.early_finish)).toBe('2024-01-09');
      expect(toDate(b.early_finish)).toBe('2024-01-09');
    });

    it('B.early_start is pushed to 2024-01-04', () => {
      const b = result.get('B')!;
      expect(toDate(b.early_start)).toBe('2024-01-04');
    });
  });

  // -------------------------------------------------------------------------
  // (5) Single task with no links: is_critical=true, float=0
  //
  // A single task has no predecessors and no successors. It is the only task,
  // so it is the entire critical path (project deadline = its own EF).
  // -------------------------------------------------------------------------
  describe('single task with no links', () => {
    const tasks = [makeTask('A', '2024-03-15', 6)];
    const links: Link[] = [];

    let result: ReturnType<typeof calculateCPM>;

    beforeAll(() => {
      result = calculateCPM(tasks, links);
    });

    it('returns a Map with 1 entry', () => {
      expect(result.size).toBe(1);
    });

    it('task A is critical', () => {
      expect(result.get('A')!.is_critical).toBe(true);
    });

    it('task A has total_float = 0', () => {
      expect(result.get('A')!.total_float).toBe(0);
    });

    it('task A early_start = 2024-03-15', () => {
      expect(toDate(result.get('A')!.early_start)).toBe('2024-03-15');
    });

    it('task A early_finish = late_finish (EF = ES + duration)', () => {
      const a = result.get('A')!;
      expect(toDate(a.early_finish)).toBe('2024-03-21');
      expect(toDate(a.late_finish)).toBe('2024-03-21');
    });
  });

  // -------------------------------------------------------------------------
  // (6) Return type: Map with correct size
  //
  // calculateCPM must return a Map whose size equals the number of input tasks,
  // regardless of link structure.
  // -------------------------------------------------------------------------
  describe('return value is a Map with correct size', () => {
    it('returns a Map instance', () => {
      const tasks = [makeTask('X', '2024-01-01', 3)];
      const result = calculateCPM(tasks, []);
      expect(result).toBeInstanceOf(Map);
    });

    it('size equals number of input tasks when there are no links', () => {
      const tasks = [
        makeTask('T1', '2024-01-01', 2),
        makeTask('T2', '2024-01-05', 4),
        makeTask('T3', '2024-01-10', 1),
      ];
      const result = calculateCPM(tasks, []);
      expect(result.size).toBe(3);
    });

    it('size equals number of input tasks when links are present', () => {
      const tasks = [
        makeTask('P', '2024-01-01', 5),
        makeTask('Q', '2024-01-01', 3),
        makeTask('R', '2024-01-01', 2),
      ];
      const links = [
        makeLink('L1', 'P', 'Q', LINK_TYPES.FINISH_TO_START as 'e2s'),
        makeLink('L2', 'Q', 'R', LINK_TYPES.FINISH_TO_START as 'e2s'),
      ];
      const result = calculateCPM(tasks, links);
      expect(result.size).toBe(3);
    });

    it('each entry in the Map is keyed by the task id', () => {
      const tasks = [
        makeTask('alpha', '2024-01-01', 4),
        makeTask('beta', '2024-01-01', 2),
      ];
      const result = calculateCPM(tasks, []);
      expect(result.has('alpha')).toBe(true);
      expect(result.has('beta')).toBe(true);
      expect(result.get('alpha')!.id).toBe('alpha');
      expect(result.get('beta')!.id).toBe('beta');
    });
  });
});
