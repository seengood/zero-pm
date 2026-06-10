/**
 * useRealtimeSync — subscribes to Supabase postgres_changes for tasks and links
 * and applies remote changes (from other tabs/users) to local React state and
 * SVAR Gantt's internal store.
 *
 * Dedup strategy: when we receive an UPDATE, compare the incoming row with what
 * is already in tasksRef.current. If the key scheduling fields (start, duration,
 * text) already match, we sent this change ourselves — skip it.
 * For INSERT, check if the id already exists in local state.
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseToUTC } from '@/lib/dateUtils';

function toMs(value: Date | string | null | undefined): number | null {
    if (!value) return null;
    const d = value instanceof Date ? value : parseToUTC(value as string);
    return d ? d.getTime() : null;
}

function buildGanttDates(startDateStr: string, duration: number) {
    const start = parseToUTC(startDateStr);
    if (!start) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + (duration || 1) - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

interface UseRealtimeSyncParams {
    projectId: string;
    tasksRef: React.MutableRefObject<any[]>;
    linksRef: React.MutableRefObject<any[]>;
    setTasks: React.Dispatch<React.SetStateAction<any[]>>;
    setLinks: React.Dispatch<React.SetStateAction<any[]>>;
    ganttApiRef: React.MutableRefObject<any>;
    isSchedulerUpdateRef: React.MutableRefObject<boolean>;
}

export function useRealtimeSync({
    projectId,
    tasksRef,
    linksRef,
    setTasks,
    setLinks,
    ganttApiRef,
    isSchedulerUpdateRef,
}: UseRealtimeSyncParams) {
    useEffect(() => {
        if (!projectId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`data-sync:${projectId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
                (payload: any) => {
                    const { eventType, new: newRow, old: oldRow } = payload;

                    if (eventType === 'UPDATE') {
                        const taskId = String(newRow.id);
                        const localTask = tasksRef.current?.find((t: any) => String(t.id) === taskId);

                        // Skip echo from our own save: compare key scheduling + display fields
                        if (localTask) {
                            const localMs = toMs(localTask.start ?? localTask.start_date);
                            const remoteMs = toMs(newRow.start_date);
                            const sameStart = localMs !== null && localMs === remoteMs;
                            const sameDuration = localTask.duration === newRow.duration;
                            const sameText = localTask.text === newRow.text;
                            if (sameStart && sameDuration && sameText) return;
                        }

                        const dates = buildGanttDates(newRow.start_date, newRow.duration);
                        if (!dates) return;

                        setTasks((prev: any[]) => prev.map((t: any) =>
                            String(t.id) === taskId
                                ? { ...t, ...newRow, start: dates.start, end: dates.end }
                                : t
                        ));

                        if (ganttApiRef?.current) {
                            isSchedulerUpdateRef.current = true;
                            ganttApiRef.current.exec('update-task', {
                                id: taskId,
                                task: {
                                    start: dates.start,
                                    end: dates.end,
                                    duration: newRow.duration,
                                    text: newRow.text,
                                }
                            });
                            isSchedulerUpdateRef.current = false;
                        }

                    } else if (eventType === 'INSERT') {
                        const taskId = String(newRow.id);
                        if (tasksRef.current?.find((t: any) => String(t.id) === taskId)) return;

                        const dates = buildGanttDates(newRow.start_date, newRow.duration);
                        if (!dates) return;

                        setTasks((prev: any[]) => [...prev, { ...newRow, start: dates.start, end: dates.end }]);

                        if (ganttApiRef?.current) {
                            isSchedulerUpdateRef.current = true;
                            ganttApiRef.current.exec('add-task', {
                                task: {
                                    id: taskId,
                                    text: newRow.text,
                                    start: dates.start,
                                    end: dates.end,
                                    duration: newRow.duration,
                                }
                            });
                            isSchedulerUpdateRef.current = false;
                        }

                    } else if (eventType === 'DELETE') {
                        const taskId = String(oldRow.id);
                        setTasks((prev: any[]) => prev.filter((t: any) => String(t.id) !== taskId));

                        if (ganttApiRef?.current) {
                            isSchedulerUpdateRef.current = true;
                            ganttApiRef.current.exec('delete-task', { id: taskId });
                            isSchedulerUpdateRef.current = false;
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'links', filter: `project_id=eq.${projectId}` },
                (payload: any) => {
                    const { eventType, new: newRow, old: oldRow } = payload;

                    if (eventType === 'INSERT') {
                        const linkId = String(newRow.id);
                        if (linksRef.current?.find((l: any) => String(l.id) === linkId)) return;

                        setLinks((prev: any[]) => [...prev, newRow]);

                        if (ganttApiRef?.current) {
                            isSchedulerUpdateRef.current = true;
                            ganttApiRef.current.exec('add-link', {
                                link: {
                                    id: linkId,
                                    source: String(newRow.source),
                                    target: String(newRow.target),
                                    type: newRow.type,
                                    lag: newRow.lag || 0,
                                }
                            });
                            isSchedulerUpdateRef.current = false;
                        }

                    } else if (eventType === 'DELETE') {
                        const linkId = String(oldRow.id);
                        setLinks((prev: any[]) => prev.filter((l: any) => String(l.id) !== linkId));

                        if (ganttApiRef?.current) {
                            isSchedulerUpdateRef.current = true;
                            ganttApiRef.current.exec('delete-link', { id: linkId });
                            isSchedulerUpdateRef.current = false;
                        }

                    } else if (eventType === 'UPDATE') {
                        setLinks((prev: any[]) => prev.map((l: any) =>
                            String(l.id) === String(newRow.id) ? { ...l, ...newRow } : l
                        ));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);
}
