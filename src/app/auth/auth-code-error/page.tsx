'use client';

import Link from 'next/link';
import styles from './auth-error.module.css';

export default function AuthCodeErrorPage() {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.icon}>⚠️</div>
                <h1 className={styles.title}>인증 오류</h1>
                <p className={styles.message}>
                    로그인 과정에서 문제가 발생했습니다.
                    <br />
                    잠시 후 다시 시도해주세요.
                </p>
                <div className={styles.actions}>
                    <Link href="/login" className={styles.button}>
                        로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
