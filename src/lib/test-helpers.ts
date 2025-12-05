/**
 * 로컬 개발용 테스트 헬퍼 함수
 * 
 * 브라우저 개발자 도구 콘솔에서 사용:
 * 
 * import { loginAsTestUser, logout, getCurrentSession } from '@/lib/test-helpers'
 * 
 * // 또는 window 객체에 노출되어 있으므로:
 * window.testHelpers.loginAsTestUser()
 * window.testHelpers.logout()
 * window.testHelpers.getCurrentSession()
 */

import { createClient } from '@/lib/supabase/client';

const TEST_USER = {
    email: 'paul@seengood.co.kr',
    password: 'seengood',
};

/**
 * 테스트 사용자로 로그인
 * @returns Promise<{ success: boolean; message: string }>
 */
export async function loginAsTestUser() {
    const supabase = createClient();

    console.log('🔐 테스트 사용자로 로그인 중...');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
    });

    if (error) {
        console.error('❌ 로그인 실패:', error.message);
        return { success: false, message: error.message };
    }

    console.log('✅ 로그인 성공!');
    console.log('👤 사용자:', data.user?.email);
    console.log('🔑 세션:', data.session?.access_token ? '활성' : '없음');

    // 페이지 새로고침하여 AuthContext 업데이트
    setTimeout(() => {
        window.location.reload();
    }, 500);

    return {
        success: true,
        message: '로그인 성공! 페이지를 새로고침합니다...',
        user: data.user,
        session: data.session,
    };
}

/**
 * 로그아웃
 * @returns Promise<{ success: boolean; message: string }>
 */
export async function logout() {
    const supabase = createClient();

    console.log('🚪 로그아웃 중...');

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('❌ 로그아웃 실패:', error.message);
        return { success: false, message: error.message };
    }

    console.log('✅ 로그아웃 성공!');

    // 페이지 새로고침
    setTimeout(() => {
        window.location.reload();
    }, 500);

    return {
        success: true,
        message: '로그아웃 성공! 페이지를 새로고침합니다...'
    };
}

/**
 * 현재 세션 정보 확인
 * @returns Promise<{ session: Session | null; user: User | null }>
 */
export async function getCurrentSession() {
    const supabase = createClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('❌ 세션 조회 실패:', error.message);
        return { session: null, user: null };
    }

    if (session) {
        console.log('✅ 활성 세션 있음');
        console.log('👤 사용자:', session.user.email);
        console.log('⏰ 만료 시간:', new Date(session.expires_at! * 1000).toLocaleString('ko-KR'));
    } else {
        console.log('❌ 활성 세션 없음 (로그인 필요)');
    }

    return { session, user: session?.user || null };
}

/**
 * 테스트 사용자 정보 확인
 */
export function getTestUserInfo() {
    console.log('📋 테스트 사용자 정보:');
    console.log('  이메일:', TEST_USER.email);
    console.log('  비밀번호:', TEST_USER.password);
    return TEST_USER;
}

// 개발 환경에서만 window 객체에 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).testHelpers = {
        loginAsTestUser,
        logout,
        getCurrentSession,
        getTestUserInfo,
    };

    console.log('🔧 테스트 헬퍼 함수가 window.testHelpers에 노출되었습니다.');
    console.log('사용 예시:');
    console.log('  window.testHelpers.loginAsTestUser()');
    console.log('  window.testHelpers.logout()');
    console.log('  window.testHelpers.getCurrentSession()');
    console.log('  window.testHelpers.getTestUserInfo()');
}
