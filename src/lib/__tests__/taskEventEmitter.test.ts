/**
 * TaskEventEmitter unit tests
 * Covers H-3 fix: a throwing listener must not prevent other listeners from executing.
 */

import { taskEventEmitter, TaskEvent, TaskEventType } from '../taskEventEmitter';

// Reset singleton listener state between tests
afterEach(() => {
  taskEventEmitter.removeAllListeners();
  jest.clearAllMocks();
});

describe('TaskEventEmitter', () => {
  describe('on / emit — basic delivery', () => {
    it('calls all registered listeners when an event is emitted', async () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      taskEventEmitter.on('task:updated', listenerA);
      taskEventEmitter.on('task:updated', listenerB);

      const payload = { task: { id: '1', text: 'Task A' } };
      await taskEventEmitter.emit('task:updated', payload);

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it('does not call listeners registered for a different event type', async () => {
      const createdListener = jest.fn();
      const deletedListener = jest.fn();

      taskEventEmitter.on('task:created', createdListener);
      taskEventEmitter.on('task:deleted', deletedListener);

      await taskEventEmitter.emit('task:created', { task: { id: '2' } });

      expect(createdListener).toHaveBeenCalledTimes(1);
      expect(deletedListener).not.toHaveBeenCalled();
    });

    it('resolves without error when there are no listeners', async () => {
      await expect(
        taskEventEmitter.emit('link:created', { link: { id: '99' } })
      ).resolves.toBeUndefined();
    });
  });

  describe('event shape', () => {
    it('listener receives an object with type, payload, and timestamp', async () => {
      const listener = jest.fn();
      taskEventEmitter.on('task:created', listener);

      const payload = { task: { id: '3', text: 'New task' } };
      const before = Date.now();
      await taskEventEmitter.emit('task:created', payload);
      const after = Date.now();

      expect(listener).toHaveBeenCalledTimes(1);
      const received: TaskEvent = listener.mock.calls[0][0];

      expect(received.type).toBe('task:created');
      expect(received.payload).toBe(payload);
      expect(typeof received.timestamp).toBe('number');
      expect(received.timestamp).toBeGreaterThanOrEqual(before);
      expect(received.timestamp).toBeLessThanOrEqual(after);
    });

    it('timestamp is a reasonable Unix epoch milliseconds value', async () => {
      const listener = jest.fn();
      taskEventEmitter.on('task:deleted', listener);

      await taskEventEmitter.emit('task:deleted', { taskId: '5' });

      const { timestamp } = listener.mock.calls[0][0] as TaskEvent;
      // Should be in the same order of magnitude as Date.now()
      expect(timestamp).toBeGreaterThan(1_000_000_000_000); // after year 2001
    });
  });

  describe('H-3 fix — listener isolation', () => {
    it('remaining listeners still execute when a synchronous listener throws', async () => {
      const throwingListener = jest.fn().mockImplementation(() => {
        throw new Error('sync listener error');
      });
      const safeListener = jest.fn();

      taskEventEmitter.on('task:updated', throwingListener);
      taskEventEmitter.on('task:updated', safeListener);

      // emit must not propagate the error to the caller
      await expect(
        taskEventEmitter.emit('task:updated', { task: { id: '10' } })
      ).resolves.toBeUndefined();

      expect(throwingListener).toHaveBeenCalledTimes(1);
      expect(safeListener).toHaveBeenCalledTimes(1);
    });

    it('remaining listeners still execute when an async listener rejects', async () => {
      const rejectingListener = jest.fn().mockRejectedValue(new Error('async listener error'));
      const safeListener = jest.fn();

      taskEventEmitter.on('link:created', rejectingListener);
      taskEventEmitter.on('link:created', safeListener);

      await expect(
        taskEventEmitter.emit('link:created', { link: { id: '20', source: 'a', target: 'b' } })
      ).resolves.toBeUndefined();

      expect(rejectingListener).toHaveBeenCalledTimes(1);
      expect(safeListener).toHaveBeenCalledTimes(1);
    });

    it('all three listeners run even when the middle one throws', async () => {
      const firstListener = jest.fn();
      const middleListener = jest.fn().mockImplementation(() => {
        throw new Error('middle throws');
      });
      const lastListener = jest.fn();

      taskEventEmitter.on('task:updated', firstListener);
      taskEventEmitter.on('task:updated', middleListener);
      taskEventEmitter.on('task:updated', lastListener);

      await taskEventEmitter.emit('task:updated', { task: { id: '11' } });

      expect(firstListener).toHaveBeenCalledTimes(1);
      expect(middleListener).toHaveBeenCalledTimes(1);
      expect(lastListener).toHaveBeenCalledTimes(1);
    });

    it('emit resolves even when every listener rejects', async () => {
      const badA = jest.fn().mockRejectedValue(new Error('A'));
      const badB = jest.fn().mockRejectedValue(new Error('B'));

      taskEventEmitter.on('task:deleted', badA);
      taskEventEmitter.on('task:deleted', badB);

      await expect(
        taskEventEmitter.emit('task:deleted', { taskId: '30' })
      ).resolves.toBeUndefined();

      expect(badA).toHaveBeenCalledTimes(1);
      expect(badB).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribed listener no longer receives events', async () => {
      const listener = jest.fn();
      const unsubscribe = taskEventEmitter.on('task:updated', listener);

      await taskEventEmitter.emit('task:updated', { task: { id: '50' } });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      await taskEventEmitter.emit('task:updated', { task: { id: '51' } });
      expect(listener).toHaveBeenCalledTimes(1); // still 1, not called again
    });

    it('unsubscribing one listener does not affect others on the same event', async () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      const unsubscribeA = taskEventEmitter.on('link:updated', listenerA);
      taskEventEmitter.on('link:updated', listenerB);

      unsubscribeA();

      await taskEventEmitter.emit('link:updated', { link: { id: '60' } });

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it('calling unsubscribe multiple times does not throw', () => {
      const listener = jest.fn();
      const unsubscribe = taskEventEmitter.on('task:created', listener);

      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('removeAllListeners', () => {
    it('removes all listeners for the specified event type', async () => {
      const listener = jest.fn();
      taskEventEmitter.on('task:updated', listener);

      taskEventEmitter.removeAllListeners('task:updated');
      await taskEventEmitter.emit('task:updated', { task: { id: '70' } });

      expect(listener).not.toHaveBeenCalled();
    });

    it('removes listeners for all event types when called without argument', async () => {
      const updatedListener = jest.fn();
      const deletedListener = jest.fn();

      taskEventEmitter.on('task:updated', updatedListener);
      taskEventEmitter.on('task:deleted', deletedListener);

      taskEventEmitter.removeAllListeners();

      await taskEventEmitter.emit('task:updated', { task: { id: '80' } });
      await taskEventEmitter.emit('task:deleted', { taskId: '81' });

      expect(updatedListener).not.toHaveBeenCalled();
      expect(deletedListener).not.toHaveBeenCalled();
    });
  });

  describe('link events', () => {
    const linkEventTypes: TaskEventType[] = [
      'link:created',
      'link:updated',
      'link:deleted',
    ];

    it.each(linkEventTypes)(
      'delivers %s events to registered listeners with correct shape',
      async (eventType) => {
        const listener = jest.fn();
        taskEventEmitter.on(eventType, listener);

        const payload = { link: { id: 'L1', source: 'a', target: 'b' } };
        await taskEventEmitter.emit(eventType, payload);

        expect(listener).toHaveBeenCalledTimes(1);
        const received: TaskEvent = listener.mock.calls[0][0];
        expect(received.type).toBe(eventType);
        expect(received.payload).toBe(payload);
      }
    );
  });
});
