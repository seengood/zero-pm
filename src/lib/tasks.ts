import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Task, Link } from '@/types/database';

// Create a default client instance for browser use
const defaultSupabase = createClient();

export async function getTasks(projectId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Task[] | null; error: any }> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function getLinks(projectId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Link[] | null; error: any }> {
    const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('project_id', projectId);

    if (error) {
        console.error('Error fetching links:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function createTask(task: Partial<Task>, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Task | null; error: any }> {
    const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function updateTask(taskId: string, updates: Partial<Task>, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Task | null; error: any }> {
    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function deleteTask(taskId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ success: boolean; error: any }> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error deleting task:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

export async function createLink(link: Partial<Link>, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Link | null; error: any }> {
    const { data, error } = await supabase
        .from('links')
        .insert(link)
        .select()
        .single();

    if (error) {
        console.error('Error creating link:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

export async function deleteLink(linkId: string, supabase: SupabaseClient = defaultSupabase): Promise<{ success: boolean; error: any }> {
    const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId);

    if (error) {
        console.error('Error deleting link:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

export async function updateLink(linkId: string, updates: Partial<Link>, supabase: SupabaseClient = defaultSupabase): Promise<{ data: Link | null; error: any }> {
    const { data, error } = await supabase
        .from('links')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();

    if (error) {
        console.error('Error updating link:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}
