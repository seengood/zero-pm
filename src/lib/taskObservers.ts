/**
 * Task Observers
 * Handle different aspects of task changes
 */

import { TaskEvent } from './taskEventEmitter';
import { updateTask, createTask, deleteTask, createLink, updateLink, deleteLink } from './tasks';
import { toISOString } from './dateUtils';
import { calculateTaskDuration } from './taskUpdateUtils';

/**
 * Database Observer
 * Persists task changes to the database
 */
export class DBObserver {
    private tasksRef: any;

    constructor(tasksRef?: any) {
        this.tasksRef = tasksRef;
    }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task, updates: providedUpdates, changesAffectSchedule } = event.payload;

        console.log('[DBObserver] handleTaskUpdated - task:', task);

        // Get current task from ref if available
        const currentTask = this.tasksRef?.current?.find((t: any) => String(t.id) === String(task.id));
        if (!currentTask) {
            console.error('[DBObserver] Task not found:', task.id);
            return;
        }

        console.log('[DBObserver] currentTask:', currentTask);

        // Merge current task with updates
        let mergedTask = { ...currentTask, ...task };

        console.log('[DBObserver] mergedTask before duration calc:', mergedTask);

        // Calculate duration using scheduling utility
        const calculatedDuration = calculateTaskDuration(task, currentTask);
        console.log('[DBObserver] calculatedDuration:', calculatedDuration);

        if (calculatedDuration !== undefined) {
            mergedTask.duration = calculatedDuration;
            // Update the original task object so UIObserver gets the calculated duration
            task.duration = calculatedDuration;
        }

        console.log('[DBObserver] mergedTask after duration calc:', mergedTask);

        // Prepare updates for database
        const updates: any = {};
        if (task.text !== undefined) updates.text = task.text;
        if (task.start !== undefined) {
            const d = new Date(task.start);
            const normalized = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
            updates.start_date = toISOString(normalized);
        }
        if (task.start_date !== undefined) updates.start_date = mergedTask.start_date;


        console.log('[DBObserver] Duration comparison:', {
            mergedDuration: mergedTask.duration,
            currentDuration: currentTask.duration,
            changed: mergedTask.duration !== currentTask.duration
        });

        if (mergedTask.duration !== currentTask.duration) updates.duration = mergedTask.duration;
        if (task.parent !== undefined) updates.parent_id = task.parent ? String(task.parent) : null;
        if (task.progress !== undefined) updates.progress = mergedTask.progress;
        if (task.type !== undefined) updates.type = task.type;
        if (task.description !== undefined) updates.description = task.description;
        if (task.constraint_type !== undefined) updates.constraint_type = task.constraint_type;
        if (task.constraint_date !== undefined) {
            updates.constraint_date = task.constraint_date ? toISOString(task.constraint_date) : null;
        }
        if (task.sort_order !== undefined) updates.sort_order = task.sort_order;

        console.log('[DBObserver] Prepared updates:', updates);

        // Skip DB update if there are no changes
        if (Object.keys(updates).length === 0) {
            console.log('[DBObserver] No updates to save');
            return;
        }

        console.log('[DBObserver] Saving to DB...');
        const { error } = await updateTask(String(task.id), updates);
        if (error) {
            console.error('[DBObserver] Failed to save task:', error);
            throw error;
        }
        console.log('[DBObserver] Saved successfully');
    }

    async handleTaskCreated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;
        console.log('[DBObserver] Creating task in database:', task);

        const { data, error } = await createTask(task);
        if (error) {
            console.error('[DBObserver] Failed to create task:', error);
            throw error;
        }

        // Update the task object with the ID from DB
        if (data && data.id) {
            task.id = data.id;
        }

        console.log('[DBObserver] Task created successfully with ID:', data?.id);
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const { taskId } = event.payload;

        console.log('[DBObserver] Deleting task from database:', taskId);

        const { error } = await deleteTask(taskId);
        if (error) {
            console.error('[DBObserver] Failed to delete task:', error);
            throw error;
        }

        console.log('[DBObserver] Task deleted successfully');
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        console.log('[DBObserver] Creating link in database:', link);

        const { data, error } = await createLink(link);
        if (error) {
            console.error('[DBObserver] Failed to create link:', error);
            throw error;
        }

        // Update the link object with the ID from DB
        if (data && data.id) {
            link.id = data.id;
        }

        console.log('[DBObserver] Link created successfully with ID:', data?.id);
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link, updates } = event.payload;
        console.log('[DBObserver] Updating link in database:', link.id);
        const { error } = await updateLink(String(link.id), updates);
        if (error) {
            console.error('[DBObserver] Failed to update link:', error);
            throw error;
        }
        console.log('[DBObserver] Link updated successfully');
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { linkId } = event.payload;
        console.log('[DBObserver] Deleting link from database:', linkId);
        const { error } = await deleteLink(linkId);
        if (error) {
            console.error('[DBObserver] Failed to delete link:', error);
            throw error;
        }
        console.log('[DBObserver] Link deleted successfully');
    }
}

/**
 * UI Observer
 * Updates the UI state
 */
export class UIObserver {
    constructor(
        private setTasks: React.Dispatch<React.SetStateAction<any[]>>,
        private setEditingTask: React.Dispatch<React.SetStateAction<any | null>>,
        private setLinks: React.Dispatch<React.SetStateAction<any[]>>
    ) { }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;

        console.log('[UIObserver] Updating UI for task:', task.id);

        // Update tasks list - merge updates with existing task data
        this.setTasks((prev: any[]) => prev.map(t =>
            String(t.id) === String(task.id) ? { ...t, ...task } : t
        ));

        // Update editing task if it's the same - merge updates
        this.setEditingTask((prev: any | null) =>
            prev && String(prev.id) === String(task.id) ? { ...prev, ...task } : prev
        );

        console.log('[UIObserver] UI updated successfully');
    }

    async handleTaskCreated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;
        console.log('[UIObserver] Adding task to UI:', task.id);
        this.setTasks(prev => [...prev, task]);
        console.log('[UIObserver] Task added to UI');
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const { taskId } = event.payload;
        console.log('[UIObserver] Removing task from UI:', taskId);
        this.setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
        console.log('[UIObserver] Task removed from UI');
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        console.log('[UIObserver] Adding link to UI:', link.id);
        this.setLinks(prev => [...prev, link]);
        console.log('[UIObserver] Link added to UI');
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        console.log('[UIObserver] Updating link in UI:', link.id);
        this.setLinks(prev => prev.map(l =>
            String(l.id) === String(link.id) ? link : l
        ));
        console.log('[UIObserver] Link updated in UI');
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { linkId } = event.payload;
        console.log('[UIObserver] Removing link from UI:', linkId);
        this.setLinks(prev => prev.filter(l => String(l.id) !== String(linkId)));
        console.log('[UIObserver] Link removed from UI');
    }
}

/**
 * Schedule Observer
 * Recalculates dependent tasks
 */
export class ScheduleObserver {
    constructor(
        private getTasks: () => any[],
        private getLinks: () => any[],
        private emitTaskUpdate: (task: any, updates: any) => Promise<void>,
        private recalculateCallback?: (taskId: string) => Promise<void>
    ) { }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task, changesAffectSchedule } = event.payload;

        if (!changesAffectSchedule) {
            console.log('[ScheduleObserver] No schedule impact, skipping recalculation');
            return;
        }

        console.log('[ScheduleObserver] Recalculating affected tasks for:', task.id);
        await this.recalculateAffectedTasks(task.id);
        console.log('[ScheduleObserver] Recalculation complete');
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        console.log('[ScheduleObserver] Recalculating due to new link:', link);
        // Recalculate starting from the source of the link
        await this.recalculateAffectedTasks(link.source);
        console.log('[ScheduleObserver] Link recalculation complete');
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        console.log('[ScheduleObserver] Recalculating due to updated link:', link);
        // Recalculate starting from the source of the link
        await this.recalculateAffectedTasks(link.source);
        console.log('[ScheduleObserver] Link update recalculation complete');
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { link } = event.payload; // We might need the full link object or at least the source/target to recalculate
        // If we only have linkId, we can't easily know which tasks to recalculate unless we looked it up before deletion.
        // For now, let's assume the payload includes the link object or we might need to fetch it.
        // Actually, for delete, we typically need to know the target task to recalculate its schedule (since a constraint/predecessor is removed).

        if (link) {
            console.log('[ScheduleObserver] Recalculating due to deleted link:', link);
            // When a link is deleted, the target task might need to move earlier.
            await this.recalculateAffectedTasks(link.source); // And potentially everything downstream of source/target?
            // Actually, usually deleting a link affects the *target* task (successor).
            await this.recalculateAffectedTasks(link.target);
            console.log('[ScheduleObserver] Link deletion recalculation complete');
        } else {
            console.log('[ScheduleObserver] Link object missing in delete event, skipping recalculation');
        }
    }

    private async recalculateAffectedTasks(changedTaskId: string): Promise<void> {
        if (this.recalculateCallback) {
            await this.recalculateCallback(changedTaskId);
        } else {
            console.log('[ScheduleObserver] No recalculate callback provided');
        }
    }
}
