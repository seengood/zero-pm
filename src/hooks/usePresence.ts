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

    useEffect(() => {
        if (!projectId) return;

        const initChannel = async () => {
            // 현재 사용자 정보 가져오기
            const {
                data: { user },
            } = await supabase.auth.getUser();

            // Presence 채널 생성
            const presenceChannel = supabase.channel(`project:${projectId}`, {
                config: {
                    presence: {
                        key: user?.id || 'anonymous',
                    },
                },
            });

            // Presence 상태 동기화
            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState();
                    const users: Record<string, PresenceState> = {};

                    Object.keys(state).forEach((key) => {
                        const presences = state[key] as any[];
                        if (presences.length > 0) {
                            users[key] = presences[0] as PresenceState;
                        }
                    });

                    setOnlineUsers(users);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('사용자 참여:', key, newPresences);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('사용자 퇴장:', key, leftPresences);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('display_name, avatar_url')
                            .eq('id', user?.id)
                            .single();

                        // Presence 상태 추적
                        await presenceChannel.track({
                            userId: user?.id || 'anonymous',
                            displayName: profile?.display_name || user?.email || 'Anonymous',
                            avatarUrl: profile?.avatar_url,
                            editingTaskId: currentTaskId,
                            timestamp: Date.now(),
                        });
                    }
                });

            setChannel(presenceChannel);
        };

        initChannel();

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [projectId, currentTaskId, channel]);

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
