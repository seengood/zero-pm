'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectTitle: string;
    loading?: boolean;
}

export default function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    projectTitle,
    loading = false
}: DeleteConfirmDialogProps) {
    if (!isOpen) return null;

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
                    width: '400px',
                    maxWidth: '90%',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <AlertTriangle size={24} color="#ef4444" />
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                        프로젝트 삭제
                    </h2>
                </div>
                <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    정말 "<strong>{projectTitle}</strong>" 프로젝트를 삭제하시겠습니까?
                </p>
                <div
                    style={{
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        borderLeft: '4px solid #ef4444',
                        marginBottom: '1.5rem',
                    }}
                >
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
                        ⚠️ 이 작업은 되돌릴 수 없으며, 프로젝트와 관련된 모든 작업과 링크도 함께 삭제됩니다.
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            backgroundColor: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            backgroundColor: loading ? '#ccc' : '#ef4444',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '삭제 중...' : '삭제'}
                    </button>
                </div>
            </div>
        </div>
    );
}
