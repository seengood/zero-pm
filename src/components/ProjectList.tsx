'use client';

import React, { useState } from 'react';
import { Project, deleteProject } from '@/lib/projects';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import Link from 'next/link';
import { Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface ProjectListProps {
    initialProjects: Project[];
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleEditClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedProject(project);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedProject(project);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedProject) return;

        setDeleteLoading(true);
        const { success, error } = await deleteProject(selectedProject.id, supabase);

        if (success) {
            setIsDeleteDialogOpen(false);
            setSelectedProject(null);
            router.refresh();
        } else {
            alert(`삭제 실패: ${error}`);
        }
        setDeleteLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>내 프로젝트</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 500,
                    }}
                >
                    <Plus size={20} />
                    새 프로젝트
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
            }}>
                {initialProjects.map((project) => (
                    <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                        }}
                    >
                        <div style={{
                            border: '1px solid #eaeaea',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            transition: 'box-shadow 0.2s ease',
                            backgroundColor: 'white',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{project.title}</h3>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '9999px',
                                    backgroundColor:
                                        project.status === 'active' ? '#dcfce7' :
                                            project.status === 'completed' ? '#f3f4f6' :
                                                project.status === 'on-hold' ? '#ffedd5' :
                                                    project.status === 'cancelled' ? '#fee2e2' :
                                                        '#dbeafe', // planning
                                    color:
                                        project.status === 'active' ? '#166534' :
                                            project.status === 'completed' ? '#374151' :
                                                project.status === 'on-hold' ? '#9a3412' :
                                                    project.status === 'cancelled' ? '#991b1b' :
                                                        '#1e40af', // planning
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {
                                        project.status === 'active' ? '진행 중' :
                                            project.status === 'completed' ? '완료' :
                                                project.status === 'on-hold' ? '보류' :
                                                    project.status === 'cancelled' ? '취소' :
                                                        '계획 중'
                                    }
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} />
                                        <span suppressHydrationWarning>
                                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : '미정'}
                                            {' ~ '}
                                            {project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : '미정'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={(e) => handleEditClick(e, project)}
                                        style={{
                                            padding: '0.5rem',
                                            border: 'none',
                                            borderRadius: '4px',
                                            backgroundColor: '#f0f0f0',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                        title="프로젝트 수정"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, project)}
                                        style={{
                                            padding: '0.5rem',
                                            border: 'none',
                                            borderRadius: '4px',
                                            backgroundColor: '#fee',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdd'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee'}
                                        title="프로젝트 삭제"
                                    >
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {initialProjects.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '8px',
                        color: '#666',
                    }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>아직 생성된 프로젝트가 없습니다.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                color: '#0070f3',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                textDecoration: 'underline',
                            }}
                        >
                            첫 번째 프로젝트를 만들어보세요
                        </button>
                    </div>
                )}
            </div>

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            {selectedProject && (
                <>
                    <EditProjectModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        project={selectedProject}
                    />
                    <DeleteConfirmDialog
                        isOpen={isDeleteDialogOpen}
                        onClose={() => setIsDeleteDialogOpen(false)}
                        onConfirm={handleDeleteConfirm}
                        projectTitle={selectedProject.title}
                        loading={deleteLoading}
                    />
                </>
            )}
        </div>
    );
}
