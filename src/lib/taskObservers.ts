/**
 * Task Observers
 * Handle different aspects of task changes
 */

import { TaskEvent } from './taskEventEmitter';
import { createTask, deleteTask, createLink, updateLink, deleteLink } from './tasks';
import { updateTaskWithOptimisticLock } from './optimisticLocking';
import { toISOString } from './dateUtils';
import { calculateTaskDuration } from './taskUpdateUtils';

interface TaskRef {
    current: Task[];
}

interface Task {
    id: string | number;
    text?: string;
    start?: Date | string;
    start_date?: string;
    end?: Date | string;
    duration?: number;
    version?: number;
    parent?: string | number | null;
    [key: string]: unknown;
}

interface TaskUpdates {
    text?: string;
    start_date?: string;
    duration?: number;
    parent_id?: string | null;
    [key: string]: unknown;
}

interface Link {
    id: string | number;
    source: string | number;
    target: string | number;
    type?: string;
    lag?: number;
    [key: string]: unknown;
}

/**
 * Database Observer
 * Persists task changes to the database
 */
export class DBObserver {
    private tasksRef: TaskRef | null;

    constructor(tasksRef?: TaskRef) {
        this.tasksRef = tasksRef || null;
    }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;

        // Get current task from ref if available
        const currentTask = this.tasksRef?.current?.find((t: Task) => String(t.id) === String(task.id));
        if (!currentTask) return;

        // Merge current task with updates
        const mergedTask = { ...currentTask, ...task };

        // Calculate duration using scheduling utility
        const calculatedDuration = calculateTaskDuration(task, currentTask);
        if (calculatedDuration !== undefined) {
            mergedTask.duration = calculatedDuration;
            // Update the original task object so UIObserver gets the calculated duration
            task.duration = calculatedDuration;
        }

        // Prepare updates for database
        const updates: TaskUpdates = {};
        if (task.text !== undefined) updates.text = task.text;
        if (task.start !== undefined) {
            const d = new Date(task.start);
            const normalized = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
            updates.start_date = toISOString(normalized);
        }
        if (task.start_date !== undefined) updates.start_date = mergedTask.start_date;

        if (mergedTask.duration !== currentTask.duration) updates.duration = mergedTask.duration;
        if (task.parent !== undefined) updates.parent_id = task.parent ? String(task.parent) : null;
        if (task.progress !== undefined) (updates as Record<string, unknown>).progress = mergedTask.progress;
        if (task.type !== undefined) (updates as Record<string, unknown>).type = task.type;
        if (task.description !== undefined) (updates as Record<string, unknown>).description = task.description;
        if (task.constraint_type !== undefined) (updates as Record<string, unknown>).constraint_type = task.constraint_type;
        if (task.constraint_date !== undefined) {
            (updates as Record<string, unknown>).constraint_date = task.constraint_date ? toISOString(task.constraint_date) : null;
        }
        if (task.sort_order !== undefined) (updates as Record<string, unknown>).sort_order = task.sort_order;

        if (Object.keys(updates).length === 0) return;

        const result = await updateTaskWithOptimisticLock(
            String(task.id),
            currentTask.version ?? 1,
            updates
        );
        if (!result.success) {
            console.error('[DBObserver] Failed to save task:', result.error);
            throw new Error(result.error);
        }
        // tasksRef에 새 버전 즉시 반영 — 빠른 연속 저장 시 불필요한 version conflict 방지
        if (result.newVersion !== undefined && this.tasksRef?.current) {
            this.tasksRef.current = this.tasksRef.current.map((t: Task) =>
                String(t.id) === String(task.id) ? { ...t, version: result.newVersion } : t
            );
        }
    }

    async handleTaskCreated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;

        const { data, error } = await createTask(task);
        if (error) {
            console.error('[DBObserver] Failed to create task:', error);
            throw error;
        }

        if (data && data.id) {
            task.id = data.id;
        }
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const { taskId } = event.payload;

        const { error } = await deleteTask(taskId);
        if (error) {
            console.error('[DBObserver] Failed to delete task:', error);
            throw error;
        }
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;

        const { data, error } = await createLink(link);
        if (error) {
            console.error('[DBObserver] Failed to create link:', error);
            throw error;
        }

        if (data && data.id) {
            link.id = data.id;
        }
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link, updates } = event.payload;
        const { error } = await updateLink(String(link.id), updates);
        if (error) {
            console.error('[DBObserver] Failed to update link:', error);
            throw error;
        }
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { linkId } = event.payload;
        const { error } = await deleteLink(linkId);
        if (error) {
            console.error('[DBObserver] Failed to delete link:', error);
            throw error;
        }
    }
}

/**
 * UI Observer
 * Updates the UI state
 */
export class UIObserver {
    constructor(
        private setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
        private setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>,
        private setLinks: React.Dispatch<React.SetStateAction<Link[]>>
    ) { }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;

        this.setTasks((prev: Task[]) => prev.map(t =>
            String(t.id) === String(task.id) ? { ...t, ...task, version: (t.version || 1) + 1 } : t
        ));

        this.setEditingTask((prev: Task | null) =>
            prev && String(prev.id) === String(task.id) ? { ...prev, ...task } : prev
        );
    }

    async handleTaskCreated(event: TaskEvent): Promise<void> {
        const { task } = event.payload;
        this.setTasks(prev => [...prev, task]);
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const { taskId } = event.payload;
        this.setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        this.setLinks(prev => [...prev, link]);
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        this.setLinks(prev => prev.map(l =>
            String(l.id) === String(link.id) ? link : l
        ));
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { linkId } = event.payload;
        this.setLinks(prev => prev.filter(l => String(l.id) !== String(linkId)));
    }
}

/**
 * Schedule Observer
 * Recalculates dependent tasks
 */
export class ScheduleObserver {
    constructor(
        private getTasks: () => Task[],
        private getLinks: () => Link[],
        private emitTaskUpdate: (task: Task, updates: Record<string, unknown>) => Promise<void>,
        private recalculateCallback?: (taskId: string) => Promise<void>
    ) { }

    async handleTaskUpdated(event: TaskEvent): Promise<void> {
        const { task, changesAffectSchedule } = event.payload;
        if (!changesAffectSchedule) return;
        await this.recalculateAffectedTasks(task.id);
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        await this.recalculateAffectedTasks(link.source);
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        await this.recalculateAffectedTasks(link.source);
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const { link } = event.payload;
        if (link) {
            // Source side: re-propagate successors; target side: may move earlier
            await this.recalculateAffectedTasks(link.source);
            await this.recalculateAffectedTasks(link.target);
        }
    }

    private async recalculateAffectedTasks(changedTaskId: string): Promise<void> {
        if (this.recalculateCallback) {
            await this.recalculateCallback(changedTaskId);
        }
    }
}
