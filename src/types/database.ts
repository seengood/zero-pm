export type UserRole = 'admin' | 'member' | 'observer';

export interface UserProfile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    title: string;
    owner_id: string;
    calendar_settings: {
        weekends: number[];
        holidays: string[];
    };
    created_at: string;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: UserRole;
    created_at: string;
}

export interface Task {
    id: string;
    project_id: string;
    parent_id: string | null;
    text: string;
    start_date: string;
    duration: number;
    progress: number;
    type: 'task' | 'milestone' | 'summary';
    sort_order: number | null;
    constraint_type: string | null;
    constraint_date: string | null;
    early_start: string | null;
    early_finish: string | null;
    late_start: string | null;
    late_finish: string | null;
    total_float: number | null;
    is_critical: boolean;
    version: number;
    updated_at: string;
}

export interface Link {
    id: string;
    source: string;
    target: string;
    type: 'e2s' | 's2s' | 'e2e' | 's2e';
    lag: number;
    project_id: string;
}
