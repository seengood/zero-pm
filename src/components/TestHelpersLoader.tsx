'use client';

import { useEffect } from 'react';

/**
 * 개발 환경에서만 테스트 헬퍼 함수를 로드하는 컴포넌트
 */
export function TestHelpersLoader() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            import('@/lib/test-helpers');
        }
    }, []);

    return null;
}
