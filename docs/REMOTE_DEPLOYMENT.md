# Remote 배포 가이드

## 현재 상태

✅ **로컬 테스트 완료**: 올바른 RLS 정책으로 모든 기능이 정상 작동합니다.

✅ **프로덕션 준비 완료**: RLS 우회 migration이 제거되어 안전하게 Remote에 배포할 수 있습니다.

## Migration 파일 목록

현재 `supabase/migrations/` 폴더에는 다음 6개의 migration 파일이 있습니다:

1. **20251203070000_init_schema.sql** - 초기 데이터베이스 스키마
   - 모든 테이블 생성 (projects, tasks, links, user_profiles 등)
   - RLS 정책 설정
   - 헬퍼 함수 및 트랜잭션 함수

2. **20251203070001_auth_security.sql** - 인증 및 보안 강화
   - 자동 프로필 생성 트리거
   - 역할 동기화 함수
   - 프로필 역할 보호

3. **20251203070002_add_project_details.sql** - 프로젝트 상세 정보
   - description, start_date, target_end_date, status 컬럼 추가
   - updated_at 자동 업데이트 트리거

4. **20251204000000_add_baselines.sql** - 베이스라인 기능
   - baselines 테이블 재정의
   - RLS 정책 설정

5. **20251204000004_add_task_description.sql** - Task 설명 필드
   - tasks 테이블에 description 컬럼 추가

6. **20251204000006_fix_update_with_check.sql** - UPDATE RLS 정책 수정
   - tasks 테이블의 UPDATE 정책에 WITH CHECK 절 추가

---

## Remote 배포 단계

### 1. Supabase 프로젝트 연결 (처음 한 번만)

```bash
# Supabase 프로젝트와 로컬 연결
npx supabase link --project-ref <your-project-ref>
```

**프로젝트 참조 ID 찾기**:
- Supabase Dashboard → Settings → General → Reference ID

**인증 방법**:
- 브라우저에서 자동으로 로그인 페이지가 열립니다
- 또는 액세스 토큰 사용: `npx supabase link --project-ref <ref> --password <db-password>`

---

### 2. Remote 상태 확인

```bash
# Remote에 적용된 migration 목록 확인
npx supabase migration list
```

**출력 예시**:
```
Local migrations:
  20251203070000_init_schema.sql
  20251203070001_auth_security.sql
  20251203070002_add_project_details.sql
  20251204000000_add_baselines.sql
  20251204000004_add_task_description.sql
  20251204000006_fix_update_with_check.sql

Remote migrations:
  (empty or different list)
```

---

### 3. Migration 적용

```bash
# 로컬 migration을 Remote에 적용
npx supabase db push
```

**동작 방식**:
- Remote에 없는 migration만 자동으로 적용
- 파일명의 타임스탬프 순서대로 실행
- 안전하게 트랜잭션으로 처리

**확인 메시지**:
```
Do you want to push these migrations to the remote database?
  20251203070000_init_schema.sql
  20251203070001_auth_security.sql
  ...
```

`y`를 입력하여 진행합니다.

---

### 4. 배포 확인

```bash
# Remote 데이터베이스 상태 확인
npx supabase db remote status
```

**Supabase Dashboard에서 확인**:
1. Dashboard → Database → Tables
2. 모든 테이블이 생성되었는지 확인
3. Table Editor → Policies에서 RLS 정책 확인

---

## 주의사항

### ⚠️ seed.sql은 자동으로 적용되지 않습니다

`supabase/seed.sql`은 로컬 개발용 테스트 데이터입니다. Remote에는 적용되지 않습니다.

**Remote에 초기 데이터가 필요한 경우**:
- Supabase Dashboard에서 수동으로 데이터 입력
- 또는 별도의 migration 파일로 작성

---

### ⚠️ 환경 변수 확인

Remote 배포 후 프론트엔드 환경 변수를 업데이트해야 합니다:

**.env.local** (또는 프로덕션 환경 변수):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase Dashboard에서 확인**:
- Settings → API → Project URL
- Settings → API → Project API keys → anon public

---

### ⚠️ RLS 정책 검증

Remote 배포 후 반드시 RLS 정책이 올바르게 작동하는지 확인하세요:

1. **테스트 사용자 생성**:
   - Supabase Dashboard → Authentication → Users → Add user

2. **로그인 테스트**:
   - 프론트엔드에서 실제 로그인
   - 프로젝트 조회/생성/수정/삭제 테스트

3. **권한 테스트**:
   - 다른 사용자의 프로젝트에 접근 시도 (실패해야 함)
   - observer 역할로 수정 시도 (실패해야 함)

---

## 롤백 방법

만약 문제가 발생하면 특정 migration을 롤백할 수 있습니다:

```bash
# 특정 migration까지 롤백
npx supabase db reset --version <migration-version>
```

**예시**:
```bash
# 20251204000006 이전으로 롤백
npx supabase db reset --version 20251204000004
```

---

## 배포 체크리스트

배포 전 확인사항:

- [ ] 로컬에서 모든 기능 테스트 완료
- [ ] RLS 우회 migration 제거 확인
- [ ] `npx supabase link` 완료
- [ ] `npx supabase migration list`로 상태 확인
- [ ] `npx supabase db push`로 migration 적용
- [ ] Supabase Dashboard에서 테이블 생성 확인
- [ ] RLS 정책 확인
- [ ] 프론트엔드 환경 변수 업데이트
- [ ] Remote에서 로그인 테스트
- [ ] Remote에서 CRUD 작업 테스트

---

## 추가 명령어

### Remote 데이터베이스 스키마 덤프

```bash
# Remote 스키마를 로컬 파일로 저장
npx supabase db dump --remote -f remote_schema.sql
```

### Remote 데이터베이스 직접 접속

```bash
# psql로 Remote 데이터베이스 접속
npx supabase db remote connect
```

### Migration 생성

```bash
# 새로운 migration 파일 생성
npx supabase migration new <migration-name>
```

---

## 문제 해결

### "Project ref is required"

```bash
# 프로젝트 연결 확인
npx supabase link --project-ref <your-project-ref>
```

### "Migration already applied"

이미 적용된 migration은 자동으로 건너뜁니다. 문제없습니다.

### "Permission denied"

Supabase 프로젝트의 데이터베이스 비밀번호를 확인하세요:
- Dashboard → Settings → Database → Database password

---

## 참고 자료

- [Supabase CLI 문서](https://supabase.com/docs/guides/cli)
- [Migration 가이드](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [RLS 정책 문서](https://supabase.com/docs/guides/auth/row-level-security)
