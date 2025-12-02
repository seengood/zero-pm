import React from 'react';
import { PresenceState } from '@/hooks/usePresence';
import styles from './PresenceIndicator.module.css';

interface PresenceIndicatorProps {
    users: PresenceState[];
    maxDisplay?: number;
}

export default function PresenceIndicator({
    users,
    maxDisplay = 3,
}: PresenceIndicatorProps) {
    if (users.length === 0) return null;

    const displayUsers = users.slice(0, maxDisplay);
    const remainingCount = users.length - maxDisplay;

    // 사용자별 색상 생성 (userId 기반 해시)
    const getUserColor = (userId: string) => {
        const colors = [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#43e97b',
            '#fa709a',
            '#fee140',
            '#30cfd0',
        ];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className={styles.container}>
            <div className={styles.avatars}>
                {displayUsers.map((user) => (
                    <div
                        key={user.userId}
                        className={styles.avatar}
                        style={{ backgroundColor: getUserColor(user.userId) }}
                        title={user.displayName}
                    >
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} />
                        ) : (
                            <span>{user.displayName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                ))}
                {remainingCount > 0 && (
                    <div className={styles.avatar} title={`+${remainingCount} more`}>
                        <span>+{remainingCount}</span>
                    </div>
                )}
            </div>
            <span className={styles.label}>
                {users.length === 1
                    ? `${users[0].displayName}님이 편집 중`
                    : `${users.length}명이 편집 중`}
            </span>
        </div>
    );
}
