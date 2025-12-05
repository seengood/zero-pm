/**
 * Task Event Emitter
 * Central event management for task-related operations
 */

export type TaskEventType =
    | 'task:created'
    | 'task:updated'
    | 'task:deleted'
    | 'link:created'
    | 'link:updated'
    | 'link:deleted';

export interface TaskEvent {
    type: TaskEventType;
    payload: any;
    timestamp: number;
}

type EventListener = (event: TaskEvent) => void | Promise<void>;

class TaskEventEmitter {
    private listeners: Map<TaskEventType, Set<EventListener>> = new Map();

    /**
     * Register an event listener
     */
    on(eventType: TaskEventType, listener: EventListener): () => void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)!.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.get(eventType)?.delete(listener);
        };
    }

    /**
     * Emit an event to all registered listeners
     */
    async emit(eventType: TaskEventType, payload: any): Promise<void> {
        const event: TaskEvent = {
            type: eventType,
            payload,
            timestamp: Date.now()
        };

        const listeners = this.listeners.get(eventType);
        if (!listeners || listeners.size === 0) {
            console.log(`No listeners for event: ${eventType}`);
            return;
        }

        console.log(`Emitting event: ${eventType}`, payload);

        // Execute all listeners
        const promises = Array.from(listeners).map(listener =>
            Promise.resolve(listener(event))
        );

        await Promise.all(promises);
    }

    /**
     * Remove all listeners for an event type
     */
    removeAllListeners(eventType?: TaskEventType): void {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }
}

// Singleton instance
export const taskEventEmitter = new TaskEventEmitter();
