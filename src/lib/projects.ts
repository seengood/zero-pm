import { supabase as defaultSupabase } from '@/lib/supabaseClient';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

export const CreateProjectSchema = z.object({
    title: z.string().min(1, '프로젝트 이름을 입력해주세요.'),
    description: z.string().optional(),
    start_date: z.string().optional(),
    target_end_date: z.string().optional(),
    status: z.enum(['planning', 'active', 'completed', 'on-hold', 'cancelled']).default('planning'),
}).refine((data) => {
    if (data.start_date && data.target_end_date) {
        return new Date(data.start_date) <= new Date(data.target_end_date);
    }
    return true;
}, {
    message: '시작일은 목표 완료일보다 늦을 수 없습니다.',
    path: ['target_end_date'],
});

export const UpdateProjectSchema = z.object({
    title: z.string().min(1, '프로젝트 이름을 입력해주세요.'),
    description: z.string().optional(),
    start_date: z.string().optional(),
    target_end_date: z.string().optional(),
    status: z.enum(['planning', 'active', 'completed', 'on-hold', 'cancelled']).optional(),
}).refine((data) => {
    if (data.start_date && data.target_end_date) {
        return new Date(data.start_date) <= new Date(data.target_end_date);
    }
    return true;
}, {
    message: '시작일은 목표 완료일보다 늦을 수 없습니다.',
    path: ['target_end_date'],
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export interface Project {
    id: string;
    title: string;
    description?: string;
    start_date?: string;
    target_end_date?: string;
    status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
    owner_id: string;
    owner_name?: string;
    created_at: string;
    updated_at?: string;
    calendar_settings: any;
}

export async function createProject(input: CreateProjectInput, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Project | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: '로그인이 필요합니다.' };
    }

    const { data, error } = await supabase
        .from('projects')
        .insert({
            title: input.title,
            description: input.description,
            start_date: input.start_date,
            target_end_date: input.target_end_date,
            status: input.status || 'planning',
            owner_id: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating project:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function getProjects(supabase: SupabaseClient = defaultSupabase): Promise<{ data: Project[] | null; error: any }> {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function getProject(id: string, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Project | null; error: any }> {
    const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching project:', error);
        return { data: null, error: error.message };
    }

    // Fetch owner profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', project.owner_id)
        .single();

    return {
        data: {
            ...project,
            owner_name: profile?.display_name
        },
        error: null
    };
}

export async function updateProject(id: string, updates: UpdateProjectInput, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Project | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: '로그인이 필요합니다.' };
    }

    const { data, error } = await supabase
        .from('projects')
        .update({
            title: updates.title,
            description: updates.description,
            start_date: updates.start_date,
            target_end_date: updates.target_end_date,
            status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating project:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function deleteProject(id: string, supabase: SupabaseClient = defaultSupabase): Promise<{ success: boolean; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' };
    }

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting project:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

