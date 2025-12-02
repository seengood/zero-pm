'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/database';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // 초기 세션 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // 인증 상태 변경 리스너
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('프로필 로드 오류:', error);
            } else if (data) {
                setProfile(data);
            } else {
                // 프로필이 없으면 자동 생성
                console.log('프로필이 없습니다. 자동 생성합니다...');
                const { data: user } = await supabase.auth.getUser();
                if (user.user) {
                    const { error: insertError } = await supabase
                        .from('user_profiles')
                        .insert({
                            id: userId,
                            display_name: user.user.email?.split('@')[0] || 'User',
                            role: 'member',
                        });

                    if (insertError) {
                        console.error('프로필 생성 오류:', insertError);
                    } else {
                        // 생성 후 다시 로드
                        await loadUserProfile(userId);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('프로필 로드 중 예외 발생:', error);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string, displayName?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                },
            },
        });

        if (!error && data.user) {
            // 사용자 프로필 생성
            await supabase.from('user_profiles').insert({
                id: data.user.id,
                display_name: displayName || email.split('@')[0],
                role: 'member',
            });
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password/confirm`,
        });
        return { error };
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) {
            return { error: new Error('사용자가 로그인되어 있지 않습니다.') };
        }

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            // 프로필 다시 로드
            await loadUserProfile(user.id);

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const value = {
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다.');
    }
    return context;
}
