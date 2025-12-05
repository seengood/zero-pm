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
    recalculateAffectedTasks
}) {
    const observersRef = useRef(null);

    useEffect(() => {
        console.log('[useGanttObservers] Initializing observers...');

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

        console.log('[useGanttObservers] Observers created');

        // Store for later use
        observersRef.current = {
            db: dbObserver,
            ui: uiObserver,
            schedule: scheduleObserver
        };

        // Register event listeners
        const unsubscribers = [
            taskEventEmitter.on('task:updated', (event) => {
                console.log('[useGanttObservers] task:updated event received:', event);
                dbObserver.handleTaskUpdated(event);
                uiObserver.handleTaskUpdated(event);
            }),
            taskEventEmitter.on('task:created', async (event) => {
                console.log('[useGanttObservers] task:created event received:', event);
                await dbObserver.handleTaskCreated(event);
                await uiObserver.handleTaskCreated(event);
            }),
            taskEventEmitter.on('task:deleted', async (event) => {
                console.log('[useGanttObservers] task:deleted event received:', event);
                await dbObserver.handleTaskDeleted(event);
                await uiObserver.handleTaskDeleted(event);
            }),
            taskEventEmitter.on('link:created', async (event) => {
                console.log('[useGanttObservers] link:created event received:', event);
                await dbObserver.handleLinkCreated(event);
                await uiObserver.handleLinkCreated(event);
                await scheduleObserver.handleLinkCreated(event);
            }),
            taskEventEmitter.on('link:updated', async (event) => {
                console.log('[useGanttObservers] link:updated event received:', event);
                await dbObserver.handleLinkUpdated(event);
                await uiObserver.handleLinkUpdated(event);
                await scheduleObserver.handleLinkUpdated(event);
            }),
            taskEventEmitter.on('link:deleted', async (event) => {
                console.log('[useGanttObservers] link:deleted event received:', event);
                await dbObserver.handleLinkDeleted(event);
                await uiObserver.handleLinkDeleted(event);
                await scheduleObserver.handleLinkDeleted(event);
            })
        ];

        console.log('[useGanttObservers] Event listeners registered');

        // Cleanup on unmount
        return () => {
            console.log('[useGanttObservers] Cleaning up observers...');
            unsubscribers.forEach(unsub => unsub());
        };
    }, [tasksRef, linksRef, setTasks, setEditingTask, setLinks, recalculateAffectedTasks]);

    return observersRef;
}
