'use client';

import React from 'react';
import { Project } from '@/lib/projects';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';

interface ProjectInfoPanelProps {
    project: Project;
    children?: React.ReactNode;
}

export default function ProjectInfoPanel({ project, children }: ProjectInfoPanelProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { bg: '#dcfce7', text: '#166534', label: '진행 중' };
            case 'completed': return { bg: '#f3f4f6', text: '#374151', label: '완료' };
            case 'on-hold': return { bg: '#ffedd5', text: '#9a3412', label: '보류' };
            case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', label: '취소' };
            default: return { bg: '#dbeafe', text: '#1e40af', label: '계획 중' };
        }
    };

    const statusInfo = getStatusColor(project.status);

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid #eaeaea',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold' }}>{project.title}</h1>
                        <span style={{
                            fontSize: '0.875rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.text,
                            fontWeight: 600,
                        }}>
                            {statusInfo.label}
                        </span>
                    </div>
                    {project.description && (
                        <p style={{ margin: '0.5rem 0 0 0', color: '#4b5563', lineHeight: 1.5 }}>
                            {project.description}
                        </p>
                    )}
                </div>
                {children && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {children}
                    </div>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f3f4f6'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                        <Calendar size={20} color="#4b5563" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>프로젝트 기간</div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : '미정'}
                            {' ~ '}
                            {project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : '미정'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                        <Clock size={20} color="#4b5563" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>최종 수정</div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                            {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : new Date(project.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                        <User size={20} color="#4b5563" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>관리자</div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                            {project.owner_name || `User ${project.owner_id.substring(0, 8)}...`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
