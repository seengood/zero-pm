import { supabase as defaultSupabase } from './supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { Baseline, Task, Link } from '@/types/database';

export async function createBaseline(
    projectId: string,
    name: string,
    description: string | undefined,
    tasks: Task[],
    links: Link[],
    supabase: SupabaseClient = defaultSupabase
): Promise<{ data: Baseline | null; error: any }> {
    const baselineData = {
        tasks: tasks.map(t => ({
            id: t.id,
            text: t.text,
            start_date: t.start_date,
            duration: t.duration,
            progress: t.progress,
            parent: t.parent_id,
            type: t.type
        })),
        links: links
    };

    const { data, error } = await supabase
        .from('baselines')
        .insert({
            project_id: projectId,
            name,
            description,
            data: baselineData
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating baseline:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function getBaselines(projectId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Baseline[] | null; error: any }> {
    const { data, error } = await supabase
        .from('baselines')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching baselines:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function deleteBaseline(baselineId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ success: boolean; error: any }> {
    const { error } = await supabase
        .from('baselines')
        .delete()
        .eq('id', baselineId);

    if (error) {
        console.error('Error deleting baseline:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}
