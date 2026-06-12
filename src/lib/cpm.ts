/**
 * Critical Path Method (CPM) implementation.
 *
 * Works entirely in integer day offsets from a fixed base epoch (Unix epoch,
 * 1970-01-01 UTC) to avoid floating-point / DST ambiguity. All dates are
 * converted to/from Date objects only at the boundaries.
 *
 * Link-type semantics follow SVAR Gantt / constants.ts conventions:
 *   e2s → Finish-to-Start (FS)
 *   s2s → Start-to-Start  (SS)
 *   e2e → Finish-to-Finish (FF)
 *   s2e → Start-to-Finish  (SF)
 *
 * End dates are EXCLUSIVE (i.e. EF = ES + duration), consistent with the rest
 * of the scheduling engine.
 */

import { Task, Link } from '@/types/database';
import { parseToUTC, addDaysUTC } from '@/lib/dateUtils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CPMTaskResult {
  id: string;
  early_start: string;
  early_finish: string;
  late_start: string;
  late_finish: string;
  total_float: number;
  is_critical: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const BASE = new Date(0); // 1970-01-01 UTC

/** Convert a Date to an integer day offset from the Unix epoch (UTC). */
function dateToDays(date: Date): number {
  return Math.round(date.getTime() / MS_PER_DAY);
}

/** Convert an integer day offset back to a UTC Date. */
function daysToDate(days: number): Date {
  return addDaysUTC(BASE, days);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Run the Critical Path Method over a set of tasks and links.
 *
 * @param tasks  Array of Task records (only scheduled/non-summary tasks
 *               contribute, but all ids are handled gracefully).
 * @param links  Array of Link records describing dependencies.
 * @returns      Map from task id → CPMTaskResult.
 */
export function calculateCPM(
  tasks: Task[],
  links: Link[],
): Map<string, CPMTaskResult> {
  // -------------------------------------------------------------------------
  // 1. Build adjacency structures
  // -------------------------------------------------------------------------

  // Only process tasks that have a valid start_date and positive duration.
  // Summary tasks (type === 'summary') are included — they can appear in the
  // network; the caller is responsible for filtering if desired.
  const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));

  // successors[p] = list of links where p is the predecessor
  const successors = new Map<string, Link[]>();
  // predecessors[t] = list of links where t is the successor
  const predecessors = new Map<string, Link[]>();

  for (const task of tasks) {
    successors.set(task.id, []);
    predecessors.set(task.id, []);
  }

  for (const link of links) {
    if (!taskMap.has(link.source) || !taskMap.has(link.target)) continue;
    successors.get(link.source)!.push(link);
    predecessors.get(link.target)!.push(link);
  }

  // -------------------------------------------------------------------------
  // 2. Kahn's topological sort
  // -------------------------------------------------------------------------

  const inDegree = new Map<string, number>();
  for (const task of tasks) {
    inDegree.set(task.id, predecessors.get(task.id)!.length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    processed.add(id);

    for (const link of successors.get(id) ?? []) {
      const newDeg = inDegree.get(link.target)! - 1;
      inDegree.set(link.target, newDeg);
      if (newDeg === 0) queue.push(link.target);
    }
  }

  // Tasks not in topoOrder are part of a cycle — they will receive fallback
  // values (original start_date as ES, float = 0, is_critical = false).

  // -------------------------------------------------------------------------
  // 3. Parse task data into day offsets
  // -------------------------------------------------------------------------

  /** ES in days (integer) */
  const earlyStart = new Map<string, number>();
  /** EF in days (integer, exclusive) */
  const earlyFinish = new Map<string, number>();
  /** LF in days (integer, exclusive) */
  const lateFinish = new Map<string, number>();
  /** LS in days (integer) */
  const lateStart = new Map<string, number>();

  // Duration in days, clamped to ≥ 1 (milestones may have duration 0; we
  // treat them as 0-duration for EF = ES purposes but clamp at 0 for safety).
  const durDays = new Map<string, number>();

  for (const task of tasks) {
    const dur = Math.max(0, task.duration ?? 0);
    durDays.set(task.id, dur);
  }

  // -------------------------------------------------------------------------
  // 4. Forward pass (earliest dates)
  // -------------------------------------------------------------------------

  for (const id of topoOrder) {
    const task = taskMap.get(id)!;
    const dur = durDays.get(id)!;

    // Default ES = task's own start_date (root / unconstrained)
    const parsedStart = parseToUTC(task.start_date);
    const defaultES = parsedStart ? dateToDays(parsedStart) : 0;

    let es = defaultES;

    for (const link of predecessors.get(id) ?? []) {
      const p = link.source;
      const lag = link.lag ?? 0;
      const pES = earlyStart.get(p) ?? 0;
      const pDur = durDays.get(p) ?? 0;
      const pEF = pES + pDur;

      let candidateES: number;

      switch (link.type) {
        case 'e2s': // FS: ES_t = EF_p + lag
          candidateES = pEF + lag;
          break;
        case 's2s': // SS: ES_t = ES_p + lag
          candidateES = pES + lag;
          break;
        case 'e2e': // FF: EF_t = EF_p + lag  →  ES_t = EF_p + lag - dur_t
          candidateES = pEF + lag - dur;
          break;
        case 's2e': // SF: EF_t = ES_p + lag  →  ES_t = ES_p + lag - dur_t
          candidateES = pES + lag - dur;
          break;
        default:
          candidateES = pEF + lag;
      }

      if (candidateES > es) es = candidateES;
    }

    earlyStart.set(id, es);
    earlyFinish.set(id, es + dur);
  }

  // Fallback for cyclic tasks
  for (const task of tasks) {
    if (!processed.has(task.id)) {
      const parsedStart = parseToUTC(task.start_date);
      const es = parsedStart ? dateToDays(parsedStart) : 0;
      const dur = durDays.get(task.id)!;
      earlyStart.set(task.id, es);
      earlyFinish.set(task.id, es + dur);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Project deadline = max EF across all tasks
  // -------------------------------------------------------------------------

  let projectDeadline = 0;
  for (const [, ef] of earlyFinish) {
    if (ef > projectDeadline) projectDeadline = ef;
  }

  // -------------------------------------------------------------------------
  // 6. Backward pass (latest dates) — traverse topoOrder in reverse
  // -------------------------------------------------------------------------

  // Initialise LF for every task to the project deadline (leaf default)
  for (const task of tasks) {
    lateFinish.set(task.id, projectDeadline);
  }

  const reverseOrder = [...topoOrder].reverse();

  for (const id of reverseOrder) {
    const dur = durDays.get(id)!;

    for (const link of successors.get(id) ?? []) {
      const t = link.target;
      const lag = link.lag ?? 0;
      const tLF = lateFinish.get(t) ?? projectDeadline;
      const tDur = durDays.get(t) ?? 0;

      let maxLFp: number;

      switch (link.type) {
        case 'e2s': // FS: LF_p = LS_t - lag = (LF_t - dur_t) - lag
          maxLFp = tLF - tDur - lag;
          break;
        case 's2s': // SS: LS_p = LS_t - lag = (LF_t - dur_t) - lag  → LF_p = LS_p + dur_p
          maxLFp = tLF - tDur - lag + dur;
          break;
        case 'e2e': // FF: LF_p = LF_t - lag
          maxLFp = tLF - lag;
          break;
        case 's2e': // SF: LS_p = LF_t - lag  → LF_p = LS_p + dur_p = LF_t - lag + dur_p
          maxLFp = tLF - lag + dur;
          break;
        default:
          maxLFp = tLF - tDur - lag;
      }

      // LF_p should be the minimum of all successor-driven constraints
      const currentLF = lateFinish.get(id) ?? projectDeadline;
      if (maxLFp < currentLF) lateFinish.set(id, maxLFp);
    }

    lateStart.set(id, lateFinish.get(id)! - dur);
  }

  // Fallback LS for cyclic tasks
  for (const task of tasks) {
    if (!processed.has(task.id)) {
      const dur = durDays.get(task.id)!;
      lateFinish.set(task.id, projectDeadline);
      lateStart.set(task.id, projectDeadline - dur);
    }
  }

  // -------------------------------------------------------------------------
  // 7. Assemble results
  // -------------------------------------------------------------------------

  const result = new Map<string, CPMTaskResult>();

  for (const task of tasks) {
    const es = earlyStart.get(task.id)!;
    const ef = earlyFinish.get(task.id)!;
    const lf = lateFinish.get(task.id)!;
    const ls = lateStart.get(task.id) ?? lf - (durDays.get(task.id) ?? 0);

    const isCyclic = !processed.has(task.id);
    const totalFloat = isCyclic ? 0 : ls - es;
    const isCritical = !isCyclic && totalFloat === 0;

    result.set(task.id, {
      id: task.id,
      early_start: daysToDate(es).toISOString(),
      early_finish: daysToDate(ef).toISOString(),
      late_start: daysToDate(ls).toISOString(),
      late_finish: daysToDate(lf).toISOString(),
      total_float: totalFloat,
      is_critical: isCritical,
    });
  }

  return result;
}
