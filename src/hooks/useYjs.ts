import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getYjsDoc } from '@/lib/yjs';

export function useYjs(projectId: string) {
    const [doc, setDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        if (!projectId) return;

        const { doc: yDoc, provider: yProvider } = getYjsDoc(projectId);

        setDoc(yDoc);
        setProvider(yProvider);

        const onSync = (isSynced: boolean) => {
            setSynced(isSynced);
        };

        yProvider.on('sync', onSync);

        return () => {
            yProvider.off('sync', onSync);
        };
    }, [projectId]);

    return { doc, provider, synced };
}
