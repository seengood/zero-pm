'use client';

import { useEffect } from 'react';

/**
 * 개발 환경에서만 테스트 헬퍼 함수를 로드하는 컴포넌트
 */
export function TestHelpersLoader() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            import('@/lib/test-helpers').then(() => {
                console.log('✅ 테스트 헬퍼 함수가 로드되었습니다.');
                console.log('💡 사용 방법:');
                console.log('   window.testHelpers.loginAsTestUser()  - 테스트 사용자로 로그인');
                console.log('   window.testHelpers.logout()           - 로그아웃');
                console.log('   window.testHelpers.getCurrentSession() - 현재 세션 확인');
                console.log('   window.testHelpers.getTestUserInfo()  - 테스트 사용자 정보');
            });
        }
    }, []);

    return null;
}
