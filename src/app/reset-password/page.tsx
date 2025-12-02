'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './reset-password.module.css';

export default function ResetPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await resetPassword(email);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successIcon}>✓</div>
                    <h1 className={styles.title}>이메일 전송 완료!</h1>
                    <p className={styles.successMessage}>
                        비밀번호 재설정 링크를 이메일로 발송했습니다.
                        <br />
                        이메일을 확인하여 비밀번호를 재설정해주세요.
                    </p>
                    <Link href="/login" className={styles.successButton}>
                        로그인 페이지로 이동
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>비밀번호 재설정</h1>
                <p className={styles.subtitle}>
                    가입하신 이메일 주소를 입력하시면
                    <br />
                    비밀번호 재설정 링크를 보내드립니다.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleResetPassword} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            이메일
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="your@email.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? '전송 중...' : '재설정 링크 보내기'}
                    </button>
                </form>

                <div className={styles.links}>
                    <Link href="/login" className={styles.link}>
                        로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
