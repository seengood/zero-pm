'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import GanttView from '@/components/GanttView';
import EditProjectModal from '@/components/EditProjectModal';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { getProject, deleteProject, Project } from '@/lib/projects';
import { getTasks, getLinks } from '@/lib/tasks';
import { notFound, redirect, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Edit2, Trash2 } from 'lucide-react';
import ProjectInfoPanel from '@/components/ProjectInfoPanel';
import { Task, Link } from '@/types/database';

interface ProjectPageProps {
    params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function loadProject() {
            const { id } = await params;
            const { data: projectData } = await getProject(id, supabase);

            if (!projectData) {
                notFound();
            }

            const { data: tasksData } = await getTasks(id, supabase);
            const { data: linksData } = await getLinks(id, supabase);

            setProject(projectData);
            setTasks(tasksData || []);
            setLinks(linksData || []);
            setLoading(false);
        }

        loadProject();
    }, [params, supabase]);

    const handleDeleteConfirm = async () => {
        if (!project) return;

        setDeleteLoading(true);
        const { success, error } = await deleteProject(project.id, supabase);

        if (success) {
            router.push('/');
        } else {
            alert(`삭제 실패: ${error}`);
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>로딩 중...</p>
                </main>
            </>
        );
    }

    if (!project) {
        notFound();
    }

    return (
        <>
            <Header />
            <main>
                <div style={{ padding: '2rem' }}>
                    <ProjectInfoPanel project={project}>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#f0f0f0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                            }}
                        >
                            <Edit2 size={16} />
                            수정
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#fee',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                color: '#ef4444',
                            }}
                        >
                            <Trash2 size={16} />
                            삭제
                        </button>
                    </ProjectInfoPanel>

                    <GanttView
                        projectId={project.id}
                        initialTasks={tasks}
                        initialLinks={links}
                    />
                </div>
            </main>

            <EditProjectModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    // Reload project data
                    loadProjectData();
                }}
                project={project}
            />
            <DeleteConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                projectTitle={project.title}
                loading={deleteLoading}
            />
        </>
    );

    async function loadProjectData() {
        const { id } = await params;
        const { data } = await getProject(id, supabase);
        if (data) setProject(data);
    }
}
