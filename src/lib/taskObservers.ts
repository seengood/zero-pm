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
        const task = event.payload.task as Task;

        // Get current task from ref if available
        const currentTask = this.tasksRef?.current?.find((t: Task) => String(t.id) === String(task.id));
        if (!currentTask) return;

        // Merge current task with updates
        const mergedTask = { ...currentTask, ...task };

        // Calculate duration using scheduling utility
        const calculatedDuration = calculateTaskDuration(task);
        if (calculatedDuration !== undefined) {
            mergedTask.duration = calculatedDuration;
            // Update the original task object so UIObserver gets the calculated duration
            task.duration = calculatedDuration;
        }

        // Prepare updates for database
        const updates: TaskUpdates = {};
        if (task.text !== undefined) updates.text = task.text as string;
        if (task.start !== undefined) {
            const d = new Date(task.start as string | Date);
            const normalized = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
            updates.start_date = toISOString(normalized);
        } else if (task.start_date !== undefined) {
            updates.start_date = task.start_date as string;
        }

        if (mergedTask.duration !== currentTask.duration) updates.duration = mergedTask.duration as number;
        if (task.parent !== undefined) updates.parent_id = task.parent ? String(task.parent) : null;
        if (task.progress !== undefined) updates.progress = mergedTask.progress;
        if (task.type !== undefined) updates.type = task.type;
        if (task.description !== undefined) updates.description = task.description;
        if (task.constraint_type !== undefined) updates.constraint_type = task.constraint_type;
        if (task.constraint_date !== undefined) {
            updates.constraint_date = task.constraint_date ? toISOString(task.constraint_date as string | Date) : null;
        }
        if (task.sort_order !== undefined) updates.sort_order = task.sort_order;

        if (Object.keys(updates).length === 0) return;

        const result = await updateTaskWithOptimisticLock(
            String(task.id),
            (currentTask.version ?? 1) as number,
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
        const task = event.payload.task as Task;

        const { data, error } = await createTask(task as Parameters<typeof createTask>[0]);
        if (error) {
            console.error('[DBObserver] Failed to create task:', error);
            throw error;
        }

        if (data && data.id) {
            task.id = data.id;
        }
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const taskId = event.payload.taskId as string;

        const { error } = await deleteTask(taskId);
        if (error) {
            console.error('[DBObserver] Failed to delete task:', error);
            throw error;
        }
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;

        const { data, error } = await createLink(link as Parameters<typeof createLink>[0]);
        if (error) {
            console.error('[DBObserver] Failed to create link:', error);
            throw error;
        }

        if (data && data.id) {
            link.id = data.id;
        }
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;
        const updates = event.payload.updates as Partial<Link>;
        const { error } = await updateLink(String(link.id), updates as Parameters<typeof updateLink>[1]);
        if (error) {
            console.error('[DBObserver] Failed to update link:', error);
            throw error;
        }
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const linkId = event.payload.linkId as string;
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
        const task = event.payload.task as Task;

        this.setTasks((prev: Task[]) => prev.map(t =>
            String(t.id) === String(task.id) ? { ...t, ...task, version: (t.version || 1) + 1 } : t
        ));

        this.setEditingTask((prev: Task | null) =>
            prev && String(prev.id) === String(task.id) ? { ...prev, ...task } : prev
        );
    }

    async handleTaskCreated(event: TaskEvent): Promise<void> {
        const task = event.payload.task as Task;
        this.setTasks(prev => [...prev, task]);
    }

    async handleTaskDeleted(event: TaskEvent): Promise<void> {
        const taskId = event.payload.taskId as string;
        this.setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;
        this.setLinks(prev => [...prev, link]);
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;
        this.setLinks(prev => prev.map(l =>
            String(l.id) === String(link.id) ? link : l
        ));
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const linkId = event.payload.linkId as string;
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
        const task = event.payload.task as Task;
        const changesAffectSchedule = event.payload.changesAffectSchedule as boolean;
        if (!changesAffectSchedule) return;
        await this.recalculateAffectedTasks(String(task.id));
    }

    async handleLinkCreated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;
        await this.recalculateAffectedTasks(String(link.source));
    }

    async handleLinkUpdated(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link;
        await this.recalculateAffectedTasks(String(link.source));
    }

    async handleLinkDeleted(event: TaskEvent): Promise<void> {
        const link = event.payload.link as Link | undefined;
        if (link) {
            // Source side: re-propagate successors; target side: may move earlier
            await this.recalculateAffectedTasks(String(link.source));
            await this.recalculateAffectedTasks(String(link.target));
        }
    }

    private async recalculateAffectedTasks(changedTaskId: string): Promise<void> {
        if (this.recalculateCallback) {
            await this.recalculateCallback(changedTaskId);
        }
    }
}
