# GitHub Secrets 구성 가이드

CI/CD 파이프라인 실행을 위해 GitHub 리포지토리에 다음 Secrets를 구성해야 합니다.

## 필수 Secrets

### 1. NEXT_PUBLIC_SUPABASE_URL
- **설명**: Supabase 프로젝트 URL
- **값**: `https://<project-id>.supabase.co`
- **참고**: Supabase Dashboard → Settings → API → Project URL

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **설명**: Supabase 익명 키 (클라이언트에서 사용)
- **값**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **참고**: Supabase Dashboard → Settings → API → anon public key

### 3. SUPABASE_SERVICE_ROLE_KEY
- **설명**: Supabase 서비스 역할 키 (서버에서 사용)
- **값**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **참고**: Supabase Dashboard → Settings → API → service_role key
- **경고**: 이 키는 완전한 데이터베이스 접근 권한을 가지므로 절대 클라이언트에 노출하지 마세요.

## 구성 방법

1. GitHub 리포지토리로 이동
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭
4. 위의 3개 secret을 각각 추가

## CI/CD 파이프라인에서의 사용

이 secrets는 다음 CI/CD 작업에서 사용됩니다:

- **test**: 빌드 단계에서 환경 변수로 사용
- **e2e**: 빌드 단계에서 환경 변수로 사용

## 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 포함하지 마세요
- 로컬 개발에서는 `.env.local` 파일에서 관리하세요
- 주기적으로 키를 순환(rotate)하는 것을 권장합니다

## 로컬 개발용 .env.local 예시

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
