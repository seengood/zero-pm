// 환경 변수 로드 (가장 먼저)
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '없음');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 테스트 설정
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'paul@seengood.co.kr';
const TEST_PASSWORD = process.env.LOGIN_PASSWORD || 'seengood';

// 색상 출력
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// 테스트 결과
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name, testFn) {
    totalTests++;
    logInfo(`테스트 실행: ${name}`);
    try {
        await testFn();
        passedTests++;
        logSuccess(`통과: ${name}`);
    } catch (error) {
        failedTests++;
        logError(`실패: ${name}`);
        console.error(error.message);
    }
    console.log('');
}

// 테스트 1: Supabase 연결
async function testSupabaseConnection() {
    const { data, error } = await supabase.from('projects').select('count');
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Supabase 연결 실패: ${error.message}`);
    }
}

// 테스트 2: 로그인
async function testEmailPasswordLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (error) {
        throw new Error(`로그인 실패: ${error.message}`);
    }

    if (!data.user) {
        throw new Error('사용자 정보가 없습니다');
    }

    logInfo(`로그인 성공: ${data.user.email}`);
}

// 테스트 3: 프로필 조회
async function testUserProfileFetch() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('로그인된 사용자가 없습니다');
    }

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        throw new Error(`프로필 조회 실패: ${error.message}`);
    }

    if (!profile) {
        logInfo('프로필이 없습니다. 자동 생성을 시도합니다...');

        // 프로필 자동 생성
        const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                id: user.id,
                display_name: user.email.split('@')[0],
                role: 'member',
            });

        if (insertError) {
            throw new Error(`프로필 생성 실패: ${insertError.message}`);
        }

        logInfo('프로필이 자동으로 생성되었습니다');
        return;
    }

    logInfo(`프로필: ${profile.display_name || '이름 없음'} (${profile.role})`);
}

// 테스트 4: 프로필 업데이트
async function testProfileUpdate() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('로그인된 사용자가 없습니다');
    }

    const testDisplayName = `테스트 ${Date.now()}`;

    const { error } = await supabase
        .from('user_profiles')
        .update({
            display_name: testDisplayName,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (error) {
        throw new Error(`프로필 업데이트 실패: ${error.message}`);
    }

    logInfo(`프로필 업데이트 성공: ${testDisplayName}`);
}

// 테스트 5: 낙관적 잠금
async function testOptimisticLocking() {
    const { data: { user } } = await supabase.auth.getUser();

    // 테스트 프로젝트 생성
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
            title: '테스트 프로젝트',
            owner_id: user.id,
        })
        .select()
        .single();

    if (projectError) {
        throw new Error(`프로젝트 생성 실패: ${projectError.message}`);
    }

    // 테스트 태스크 생성
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
            project_id: project.id,
            text: '테스트 태스크',
            start_date: new Date().toISOString(),
            duration: 60,
            version: 1,
        })
        .select()
        .single();

    if (taskError) {
        await supabase.from('projects').delete().eq('id', project.id);
        throw new Error(`태스크 생성 실패: ${taskError.message}`);
    }

    // 낙관적 잠금 함수 테스트
    const { data: result, error: rpcError } = await supabase.rpc(
        'update_task_with_version',
        {
            p_task_id: task.id,
            p_expected_version: 1,
            p_updates: {
                text: '업데이트된 태스크',
                duration: 120,
            },
        }
    );

    // 정리
    await supabase.from('projects').delete().eq('id', project.id);

    if (rpcError) {
        throw new Error(`RPC 호출 실패: ${rpcError.message}`);
    }

    if (!result.success) {
        throw new Error(`낙관적 잠금 실패: ${result.error}`);
    }

    logInfo(`낙관적 잠금 성공: 버전 ${result.new_version}`);
}

// 테스트 6: 로그아웃
async function testSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error(`로그아웃 실패: ${error.message}`);
    }

    logInfo('로그아웃 성공');
}

// 메인 실행
async function runAllTests() {
    console.log('\n');
    log('='.repeat(60), 'blue');
    log('ZeroPM 인증 시스템 테스트', 'blue');
    log('='.repeat(60), 'blue');
    console.log('\n');

    await runTest('1. Supabase 연결 확인', testSupabaseConnection);
    await runTest('2. 이메일/비밀번호 로그인', testEmailPasswordLogin);
    await runTest('3. 사용자 프로필 조회', testUserProfileFetch);
    await runTest('4. 프로필 업데이트', testProfileUpdate);
    await runTest('5. 낙관적 잠금 함수', testOptimisticLocking);
    await runTest('6. 로그아웃', testSignOut);

    // 결과 요약
    console.log('\n');
    log('='.repeat(60), 'blue');
    log('테스트 결과', 'blue');
    log('='.repeat(60), 'blue');
    console.log(`총 테스트: ${totalTests}`);
    logSuccess(`통과: ${passedTests}`);
    if (failedTests > 0) {
        logError(`실패: ${failedTests}`);
    }
    console.log('\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
    logError('테스트 실행 중 오류 발생');
    console.error(error);
    process.exit(1);
});
