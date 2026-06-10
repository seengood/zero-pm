/**
 * Custom Hook: useGanttObservers
 * Manages Observer initialization and event listeners for Gantt chart
 */

import { useEffect, useRef } from 'react';
import { taskEventEmitter } from '@/lib/taskEventEmitter';
import { DBObserver, UIObserver, ScheduleObserver } from '@/lib/taskObservers';

/**
 * Initialize and manage Gantt observers
 * @param {Object} params - Hook parameters
 * @param {React.MutableRefObject} params.tasksRef - Ref to tasks array
 * @param {React.MutableRefObject} params.linksRef - Ref to links array
 * @param {Function} params.setTasks - State setter for tasks
 * @param {Function} params.setEditingTask - State setter for editing task
 * @param {Function} params.setLinks - State setter for links
 * @param {Function} params.recalculateAffectedTasks - Recalculation function
 * @returns {React.MutableRefObject} - Ref to observers object
 */
export function useGanttObservers({
    tasksRef,
    linksRef,
    setTasks,
    setEditingTask,
    setLinks,
    recalculateAffectedTasks,
    ganttApiRef,
    isSchedulerUpdateRef
}) {
    const observersRef = useRef(null);

    useEffect(() => {
        // Create observer instances
        const dbObserver = new DBObserver(tasksRef);
        const uiObserver = new UIObserver(setTasks, setEditingTask, setLinks);

        // ScheduleObserver will call recalculateAffectedTasks directly
        const scheduleObserver = new ScheduleObserver(
            () => tasksRef.current,
            () => linksRef.current,
            async (task, updates) => {
                taskEventEmitter.emit('task:updated', {
                    task,
                    updates,
                    changesAffectSchedule: true
                });
            },
            recalculateAffectedTasks
        );

        // Store for later use
        observersRef.current = {
            db: dbObserver,
            ui: uiObserver,
            schedule: scheduleObserver
        };

        // Register event listeners
        const unsubscribers = [
            taskEventEmitter.on('task:updated', (event) => {
                dbObserver.handleTaskUpdated(event);
                uiObserver.handleTaskUpdated(event);

                // Scheduler-triggered updates (skipRecalculation=true) must also be pushed
                // directly into SVAR Gantt's internal store — it ignores React prop changes.
                const skipRecalculation = event.payload?.skipRecalculation;
                if (skipRecalculation && ganttApiRef?.current) {
                    const { task } = event.payload;
                    const startDate = task.start instanceof Date ? task.start : new Date(task.start_date);
                    const endDate = task.end instanceof Date ? task.end : new Date(task.end_date || task.start_date);
                    isSchedulerUpdateRef.current = true;
                    ganttApiRef.current.exec('update-task', {
                        id: String(task.id),
                        task: { start: startDate, end: endDate, duration: task.duration }
                    });
                    isSchedulerUpdateRef.current = false;
                }
            }),
            taskEventEmitter.on('task:created', async (event) => {
                await dbObserver.handleTaskCreated(event);
                await uiObserver.handleTaskCreated(event);
            }),
            taskEventEmitter.on('task:deleted', async (event) => {
                await dbObserver.handleTaskDeleted(event);
                await uiObserver.handleTaskDeleted(event);
            }),
            taskEventEmitter.on('link:created', async (event) => {
                await dbObserver.handleLinkCreated(event);
                await uiObserver.handleLinkCreated(event);
                await scheduleObserver.handleLinkCreated(event);
            }),
            taskEventEmitter.on('link:updated', async (event) => {
                await dbObserver.handleLinkUpdated(event);
                await uiObserver.handleLinkUpdated(event);
                await scheduleObserver.handleLinkUpdated(event);
            }),
            taskEventEmitter.on('link:deleted', async (event) => {
                await dbObserver.handleLinkDeleted(event);
                await uiObserver.handleLinkDeleted(event);
                await scheduleObserver.handleLinkDeleted(event);
            })
        ];

        // Cleanup on unmount
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [tasksRef, linksRef, setTasks, setEditingTask, setLinks, recalculateAffectedTasks]);

    return observersRef;
}
