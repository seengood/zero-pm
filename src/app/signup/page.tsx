'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './signup.module.css';

export default function SignupPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 유효성 검사
        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (password.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        if (!agreedToTerms) {
            setError('이용약관에 동의해주세요.');
            return;
        }

        setLoading(true);

        const { error } = await signUp(email, password, displayName);

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
                    <h1 className={styles.title}>회원가입 완료!</h1>
                    <p className={styles.successMessage}>
                        이메일 인증 링크를 발송했습니다.
                        <br />
                        이메일을 확인하여 계정을 활성화해주세요.
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
                <h1 className={styles.title}>ZeroPM 회원가입</h1>
                <p className={styles.subtitle}>무료로 시작하세요</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSignup} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="displayName" className={styles.label}>
                            이름
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className={styles.input}
                            placeholder="홍길동"
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            이메일 *
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

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            비밀번호 *
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
                            비밀번호 확인 *
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

                    <div className={styles.checkboxGroup}>
                        <input
                            id="terms"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className={styles.checkbox}
                            disabled={loading}
                        />
                        <label htmlFor="terms" className={styles.checkboxLabel}>
                            <a href="/terms" target="_blank" className={styles.termsLink}>
                                이용약관
                            </a>
                            에 동의합니다
                        </label>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? '가입 중...' : '회원가입'}
                    </button>
                </form>

                <div className={styles.links}>
                    <Link href="/login" className={styles.link}>
                        이미 계정이 있으신가요? <strong>로그인</strong>
                    </Link>
                </div>
            </div>
        </div>
    );
}
