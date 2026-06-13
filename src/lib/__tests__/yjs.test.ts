import { getYjsDoc, disconnectYjs } from '../yjs';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

// Mock y-websocket
jest.mock('y-websocket', () => {
    return {
        WebsocketProvider: jest.fn().mockImplementation(() => ({
            destroy: jest.fn(),
        })),
    };
});

describe('yjs', () => {
    beforeEach(() => {
        // Clear mocks and reset modules to clear singleton state if possible
        // Since singletons are module-level, we might need to rely on disconnectYjs to clean up
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up singletons
        disconnectYjs('room-1');
        disconnectYjs('room-2');
    });

    describe('getYjsDoc', () => {
        it('should create a new doc and provider if not exists', () => {
            const { doc } = getYjsDoc('room-1');

            expect(doc).toBeInstanceOf(Y.Doc);
            expect(WebsocketProvider).toHaveBeenCalledTimes(1);
            expect(WebsocketProvider).toHaveBeenCalledWith(
                expect.any(String),
                'room-1',
                doc
            );
        });

        it('should return existing doc and provider if already exists', () => {
            const first = getYjsDoc('room-1');
            const second = getYjsDoc('room-1');

            expect(first.doc).toBe(second.doc);
            expect(first.provider).toBe(second.provider);
            expect(WebsocketProvider).toHaveBeenCalledTimes(1); // Should not create new provider
        });

        it('should create distinct docs for different rooms', () => {
            const room1 = getYjsDoc('room-1');
            const room2 = getYjsDoc('room-2');

            expect(room1.doc).not.toBe(room2.doc);
            expect(WebsocketProvider).toHaveBeenCalledTimes(2);
        });
    });

    describe('disconnectYjs', () => {
        it('should destroy provider and doc', () => {
            const { doc, provider } = getYjsDoc('room-1');
            const destroySpy = jest.spyOn(doc, 'destroy');

            disconnectYjs('room-1');

            expect(provider.destroy).toHaveBeenCalled();
            expect(destroySpy).toHaveBeenCalled();
        });

        it('should handle non-existent room gracefully', () => {
            expect(() => disconnectYjs('non-existent')).not.toThrow();
        });
    });
});
