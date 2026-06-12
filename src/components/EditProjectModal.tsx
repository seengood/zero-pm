'use client';

import React, { useState, useEffect } from 'react';
import { updateProject, UpdateProjectSchema, Project } from '@/lib/projects';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/client';

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

export default function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
    const [title, setTitle] = useState(project.title);
    const [description, setDescription] = useState(project.description || '');
    const [startDate, setStartDate] = useState(project.start_date || '');
    const [targetEndDate, setTargetEndDate] = useState(project.target_end_date || '');
    const [status, setStatus] = useState<'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled'>(project.status);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setTitle(project.title);
        setDescription(project.description || '');
        setStartDate(project.start_date || '');
        setTargetEndDate(project.target_end_date || '');
        setStatus(project.status);
    }, [project]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validate input
            UpdateProjectSchema.parse({
                title,
                description: description || undefined,
                start_date: startDate || undefined,
                target_end_date: targetEndDate || undefined,
                status
            });

            const { data, error: apiError } = await updateProject(project.id, {
                title,
                description: description || undefined,
                start_date: startDate || undefined,
                target_end_date: targetEndDate || undefined,
                status
            }, supabase);

            if (apiError) {
                setError(apiError);
            } else if (data) {
                onClose();
                router.refresh();
            }
        } catch (err) {
            if (err instanceof ZodError) {
                setError(err.issues[0].message);
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    width: '500px',
                    maxWidth: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    프로젝트 수정
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            프로젝트 이름
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="프로젝트 이름을 입력하세요"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            설명 (선택사항)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                                minHeight: '80px',
                                resize: 'vertical',
                            }}
                            placeholder="프로젝트 설명을 입력하세요"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label htmlFor="startDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                시작일 (선택사항)
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>
                        <div>
                            <label htmlFor="targetEndDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                목표 완료일 (선택사항)
                            </label>
                            <input
                                type="date"
                                id="targetEndDate"
                                value={targetEndDate}
                                onChange={(e) => setTargetEndDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            상태
                        </label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled')}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                            }}
                        >
                            <option value="planning">계획 중</option>
                            <option value="active">진행 중</option>
                            <option value="completed">완료</option>
                            <option value="on-hold">보류</option>
                            <option value="cancelled">취소</option>
                        </select>
                    </div>

                    {error && (
                        <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                backgroundColor: loading ? '#ccc' : '#0070f3',
                                color: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
