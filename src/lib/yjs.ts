import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Singleton map to hold Y.Docs per project/room to prevent multiple connections
const docs: Map<string, Y.Doc> = new Map();
const providers: Map<string, WebsocketProvider> = new Map();

export const getYjsDoc = (roomId: string) => {
    if (docs.has(roomId)) {
        return { doc: docs.get(roomId)!, provider: providers.get(roomId)! };
    }

    const doc = new Y.Doc();

    // Use environment variable for WS URL or default to local
    // For Zero-Cost production, this should point to a hosted y-websocket server 
    // or replaced with a Supabase Realtime provider.
    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL || 'ws://localhost:1234';

    const provider = new WebsocketProvider(
        wsUrl,
        roomId,
        doc
    );

    docs.set(roomId, doc);
    providers.set(roomId, provider);

    return { doc, provider };
};

export const disconnectYjs = (roomId: string) => {
    if (providers.has(roomId)) {
            providers.get(roomId)?.destroy();
        providers.delete(roomId);
    }
    if (docs.has(roomId)) {
        docs.get(roomId)?.destroy();
        docs.delete(roomId);
    }
};
