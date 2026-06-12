'use client';

import React, { useState } from 'react';
import { createProject, CreateProjectSchema } from '@/lib/projects';
import { useRouter } from 'next/navigation';
import { z, ZodError } from 'zod';
import { createClient } from '@/lib/supabase/client';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [targetEndDate, setTargetEndDate] = useState('');
    const [status, setStatus] = useState<'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled'>('planning');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validate input
            CreateProjectSchema.parse({
                title,
                description: description || undefined,
                start_date: startDate || undefined,
                target_end_date: targetEndDate || undefined,
                status
            });

            const { data, error: apiError } = await createProject({
                title,
                description: description || undefined,
                start_date: startDate || undefined,
                target_end_date: targetEndDate || undefined,
                status
            }, supabase);

            if (apiError) {
                setError(apiError);
            } else if (data) {
                router.refresh(); // Refresh server data
                onClose();
                setTitle('');
                setDescription('');
                setStartDate('');
                setTargetEndDate('');
                setStatus('planning');
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
        <div style={{
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
        }}>
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    width: '600px',
                    maxWidth: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>새 프로젝트 생성</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                            프로젝트 이름
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                            }}
                            placeholder="프로젝트 이름을 입력하세요"
                            autoFocus
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
                            disabled={loading}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#0070f3',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                            disabled={loading}
                        >
                            {loading ? '생성 중...' : '생성'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
