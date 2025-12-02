'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <header className="header">
            <div className="header-container">
                <Link href="/" className="logo-link">
                    <Image
                        src="/header-logo.png"
                        alt="ZeroPM - Zero-based Project Management"
                        width={200}
                        height={60}
                        priority
                        className="logo"
                    />
                </Link>
                <nav className="nav">
                    <Link href="/" className="nav-link">
                        프로젝트
                    </Link>
                    <Link href="/calendar" className="nav-link">
                        캘린더
                    </Link>
                    <Link href="/settings" className="nav-link">
                        설정
                    </Link>
                    {user && (
                        <>
                            <span className="nav-user">{user.email}</span>
                            <button onClick={handleLogout} className="logout-button">
                                로그아웃
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
