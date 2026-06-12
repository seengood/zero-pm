import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceState {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    editingTaskId?: string;
    timestamp: number;
}

export function usePresence(projectId: string, currentTaskId?: string) {
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>({});

    // 채널 초기화
    useEffect(() => {
        if (!projectId) return;

        let newChannel: RealtimeChannel | null = null;

        const initChannel = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            newChannel = supabase.channel(`project:${projectId}`, {
                config: {
                    presence: {
                        key: user?.id || 'anonymous',
                    },
                },
            });

            newChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = newChannel!.presenceState();
                    const users: Record<string, PresenceState> = {};

                    Object.keys(state).forEach((key) => {
                        const presences = state[key] as unknown[];
                        if (presences.length > 0) {
                            users[key] = presences[0] as PresenceState;
                        }
                    });

                    setOnlineUsers(users);
                })
                .on('presence', { event: 'join' }, ({ key: _key, newPresences: _newPresences }) => {
                })
                .on('presence', { event: 'leave' }, ({ key: _key, leftPresences: _leftPresences }) => {
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        setChannel(newChannel);
                    }
                });
        };

        initChannel();

        return () => {
            if (newChannel) {
                newChannel.unsubscribe();
            }
        };
    }, [projectId]);

    // Presence 상태 업데이트 (currentTaskId 변경 시)
    useEffect(() => {
        if (!channel || !projectId) return;

        const updatePresence = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('display_name, avatar_url')
                .eq('id', user?.id)
                .single();

            await channel.track({
                userId: user?.id || 'anonymous',
                displayName: profile?.display_name || user?.email || 'Anonymous',
                avatarUrl: profile?.avatar_url,
                editingTaskId: currentTaskId,
                timestamp: Date.now(),
            });
        };

        updatePresence();
    }, [channel, currentTaskId, projectId]);

    // Task 편집 상태 업데이트
    const updateEditingTask = useCallback(
        async (taskId?: string) => {
            if (!channel) return;

            const {
                data: { user },
            } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('display_name, avatar_url')
                .eq('id', user?.id)
                .single();

            await channel.track({
                userId: user?.id || 'anonymous',
                displayName: profile?.display_name || user?.email || 'Anonymous',
                avatarUrl: profile?.avatar_url,
                editingTaskId: taskId,
                timestamp: Date.now(),
            });
        },
        [channel]
    );

    // 특정 Task를 편집 중인 사용자 목록
    const getUsersEditingTask = useCallback(
        (taskId: string) => {
            return Object.values(onlineUsers).filter(
                (user) => user.editingTaskId === taskId
            );
        },
        [onlineUsers]
    );

    return {
        onlineUsers,
        updateEditingTask,
        getUsersEditingTask,
    };
}
