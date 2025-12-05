# 로컬 RLS 테스트 가이드

## 개요

이 문서는 로컬 개발 환경에서 Row Level Security(RLS) 정책을 테스트하는 방법을 설명합니다.

## 왜 RLS를 테스트해야 하나요?

RLS는 데이터베이스 레벨에서 사용자별 데이터 접근을 제어하는 중요한 보안 기능입니다. 로컬에서 RLS를 우회하고 개발하면:

- ❌ Remote 환경에서 예상치 못한 권한 오류 발생
- ❌ 보안 취약점을 늦게 발견
- ❌ 디버깅 시간 증가

로컬에서도 RLS를 활성화하여 테스트하면:

- ✅ Remote와 동일한 환경에서 개발
- ✅ 권한 문제를 즉시 발견하고 수정
- ✅ 안전한 배포

## 테스트 사용자 정보

로컬 Supabase에는 다음 테스트 사용자가 자동으로 생성됩니다:

- **이메일**: `paul@seengood.co.kr`
- **비밀번호**: `seengood`
- **역할**: `admin`
- **프로젝트**: `ZeroPM Development` (자동 생성됨)

## 방법 1: 브라우저에서 로그인

가장 일반적인 방법입니다.

1. 브라우저에서 http://localhost:3005/login 접속
2. 테스트 사용자 정보로 로그인
3. 로그인 후 정상적으로 작업

## 방법 2: 개발자 콘솔에서 빠른 로그인

개발 중 빠르게 로그인/로그아웃하려면 브라우저 개발자 도구 콘솔을 사용하세요.

### 사용 가능한 함수

개발 환경에서는 `window.testHelpers` 객체에 다음 함수들이 자동으로 노출됩니다:

#### 1. 테스트 사용자로 로그인

```javascript
window.testHelpers.loginAsTestUser()
```

- 테스트 사용자로 자동 로그인
- 로그인 후 페이지 자동 새로고침

#### 2. 로그아웃

```javascript
window.testHelpers.logout()
```

- 현재 세션 종료
- 로그아웃 후 페이지 자동 새로고침

#### 3. 현재 세션 확인

```javascript
window.testHelpers.getCurrentSession()
```

- 현재 로그인 상태 확인
- 세션 만료 시간 확인

#### 4. 테스트 사용자 정보 확인

```javascript
window.testHelpers.getTestUserInfo()
```

- 테스트 사용자 이메일과 비밀번호 확인

### 사용 예시

```javascript
// 1. 현재 세션 확인
await window.testHelpers.getCurrentSession()
// ❌ 활성 세션 없음 (로그인 필요)

// 2. 로그인
await window.testHelpers.loginAsTestUser()
// ✅ 로그인 성공!
// 👤 사용자: paul@seengood.co.kr
// (페이지 자동 새로고침)

// 3. 다시 세션 확인
await window.testHelpers.getCurrentSession()
// ✅ 활성 세션 있음
// 👤 사용자: paul@seengood.co.kr
// ⏰ 만료 시간: 2025-12-04 11:00:00

// 4. 작업 완료 후 로그아웃
await window.testHelpers.logout()
// ✅ 로그아웃 성공!
// (페이지 자동 새로고침)
```

## RLS 정책 확인

### Supabase Studio에서 확인

1. 터미널에서 Supabase Studio 실행:
   ```bash
   npx supabase studio
   ```

2. 브라우저에서 http://localhost:54323 접속

3. Table Editor → `tasks` 테이블 선택

4. **Policies** 탭에서 RLS 정책 확인:
   - ✅ "Users can view tasks in their projects"
   - ✅ "Users can create tasks in their projects"
   - ✅ "Users can update tasks in their projects"
   - ✅ "Users can delete tasks in their projects"

### 데이터베이스에서 직접 확인

```sql
-- RLS가 활성화되어 있는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tasks';

-- tasks 테이블의 RLS 정책 목록 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tasks';
```

## 일반적인 RLS 오류 해결

### 1. "new row violates row-level security policy"

**원인**: INSERT 시 `WITH CHECK` 조건을 만족하지 못함

**해결**:
- 로그인했는지 확인: `window.testHelpers.getCurrentSession()`
- 프로젝트 멤버인지 확인: `project_members` 테이블 확인
- `project_id`가 올바른지 확인

### 2. "permission denied for table tasks"

**원인**: RLS가 활성화되어 있지만 정책이 없거나 조건을 만족하지 못함

**해결**:
- RLS 정책이 올바르게 적용되었는지 확인
- 데이터베이스 리셋: `npx supabase db reset`

### 3. 데이터가 조회되지 않음

**원인**: SELECT 정책 조건을 만족하지 못함

**해결**:
- 로그인 상태 확인
- 해당 프로젝트의 owner 또는 member인지 확인

## 데이터베이스 리셋

RLS 정책을 변경했거나 문제가 발생하면 데이터베이스를 리셋하세요:

```bash
cd /Users/sheplim/develop/work/zero-pm
npx supabase db reset
```

이 명령은:
1. 로컬 데이터베이스 초기화
2. 모든 마이그레이션 순서대로 적용
3. `seed.sql` 실행하여 테스트 데이터 생성

## 팁

### 1. 세션 유지

브라우저를 닫아도 세션이 유지됩니다. 완전히 로그아웃하려면:
```javascript
await window.testHelpers.logout()
```

### 2. 여러 사용자 테스트

다른 사용자로 테스트하려면:
1. `seed.sql`에 추가 사용자 생성
2. 로그인 페이지에서 해당 사용자로 로그인

### 3. RLS 디버깅

RLS 정책이 예상대로 작동하지 않으면:
1. Supabase Studio에서 정책 확인
2. `auth.uid()` 값 확인: `SELECT auth.uid();`
3. 정책 조건을 단순화하여 테스트

## 참고 자료

- [Supabase RLS 공식 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS 문서](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
