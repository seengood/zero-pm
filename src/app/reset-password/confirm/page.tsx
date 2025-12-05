'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './confirm.module.css';

export default function ResetPasswordConfirmPage() {
    const router = useRouter();
    const { updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // URL 해시에서 access_token 확인 (Supabase Auth 동작 방식)
    useEffect(() => {
        // 실제 토큰 검증은 Supabase 클라이언트가 자동으로 처리하지만,
        // 여기서는 UI 상태 관리를 위해 간단히 체크할 수 있습니다.
        // 하지만 Next.js App Router에서는 해시 접근이 까다로울 수 있으므로
        // 사용자가 이 페이지에 도달했다는 것은 링크를 타고 왔다는 가정하에 진행합니다.
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        setLoading(true);

        const { error } = await updatePassword(password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // 3초 후 로그인 페이지로 이동
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        }
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successIcon}>✓</div>
                    <h1 className={styles.title}>비밀번호 변경 완료!</h1>
                    <p className={styles.successMessage}>
                        비밀번호가 성공적으로 변경되었습니다.
                        <br />
                        잠시 후 로그인 페이지로 이동합니다.
                    </p>
                    <Link href="/login" className={styles.successButton}>
                        지금 로그인하기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>새 비밀번호 설정</h1>
                <p className={styles.subtitle}>
                    새로운 비밀번호를 입력해주세요.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleUpdatePassword} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            새 비밀번호
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="최소 6자 이상"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            비밀번호 확인
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.input}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? '변경 중...' : '비밀번호 변경'}
                    </button>
                </form>
            </div>
        </div>
    );
}
