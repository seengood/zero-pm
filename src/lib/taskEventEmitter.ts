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
            return;
        }

        // Execute all listeners — wrap each call so a synchronous throw is
        // captured as a rejected promise instead of propagating out of map().
        const promises = Array.from(listeners).map(listener => {
            try {
                return Promise.resolve(listener(event));
            } catch (err) {
                return Promise.reject(err);
            }
        });

        const results = await Promise.allSettled(promises);
        results.forEach(result => {
            if (result.status === 'rejected') {
                console.error(`[TaskEventEmitter] Listener failed for event: ${eventType}`, result.reason);
            }
        });
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
