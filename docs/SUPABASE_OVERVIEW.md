# Supabase 설정 가이드

ZeroPM의 Supabase 구성 전체를 정리한 문서입니다.

---

## 1. 로컬 vs 리모트 환경

| 항목 | 로컬 개발 | 리모트 (현재 미사용) |
|------|-----------|---------------------|
| URL | `http://127.0.0.1:54321` | `https://rszftuyndidleofydsbb.supabase.co` |
| 실행 방법 | Docker + `npx supabase start` | Supabase 클라우드 대시보드 |
| 인증 키 | `.env.local` (로컬 demo key) | `.env.local.remote.backup` |
| 마이그레이션 | `npx supabase db reset` | `npx supabase db push` |
| Seed 데이터 | 자동 적용 | 수동 적용 필요 |

### 환경 전환 방법

**로컬 → 리모트**: `.env.local.remote.backup`의 값을 `.env.local`에 복사 후 서버 재시작  
**리모트 → 로컬**: Docker 실행 후 `.env.local`을 로컬 URL/Key로 복원 후 서버 재시작

---

## 2. 로컬 Docker 컨테이너 구성

`npx supabase start` 실행 시 아래 11개 컨테이너가 시작됩니다.

| 컨테이너 | 이미지 | 역할 |
|----------|--------|------|
| `supabase_kong_zero-pm` | kong:2.8.1 | **API Gateway** — 모든 요청의 진입점 (포트 54321) |
| `supabase_db_zero-pm` | postgres:17.6.1 | **PostgreSQL 17** — 실제 데이터베이스 |
| `supabase_auth_zero-pm` | gotrue:v2.183.0 | **인증 서버** — 로그인/JWT 발급 |
| `supabase_rest_zero-pm` | postgrest:v13.0.7 | **REST API** — DB를 자동으로 REST API로 노출 |
| `supabase_realtime_zero-pm` | realtime:v2.66.2 | **실시간 웹소켓** — DB 변경사항 구독 |
| `supabase_storage_zero-pm` | storage-api:v1.32.1 | **파일 스토리지** — S3 호환 업로드/다운로드 |
| `supabase_studio_zero-pm` | studio:2025.12.01 | **관리 UI** — 포트 54323 |
| `supabase_pg_meta_zero-pm` | postgres-meta:v0.93.1 | **DB 메타데이터 API** — Studio 테이블 조회 지원 |
| `supabase_vector_zero-pm` | vector:0.28.1 | **로그 수집기** — Analytics로 로그 전달 |
| `supabase_analytics_zero-pm` | logflare:1.26.16 | **로그 분석** — Studio 로그 탭 |
| `supabase_inbucket_zero-pm` | mailpit:v1.22.3 | **이메일 테스트** — 가입 확인 이메일 캡처 (포트 54324) |

### 로컬 접속 주소

| 서비스 | 주소 |
|--------|------|
| API (앱에서 사용) | http://127.0.0.1:54321 |
| Studio (관리 UI) | http://127.0.0.1:54323 |
| 이메일 수신함 | http://127.0.0.1:54324 |
| DB 직접 접속 | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## 3. 클라이언트 설정 파일

| 파일 | 용도 |
|------|------|
| `src/lib/supabase/client.ts` | 브라우저용 클라이언트 (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | 서버 컴포넌트용 클라이언트 (쿠키 기반 세션) |
| `src/lib/supabaseClient.ts` | 레거시 클라이언트 (Realtime `eventsPerSecond: 10` 설정 포함) |

### 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
LOGIN_EMAIL=<test email>
LOGIN_PASSWORD=<test password>
```

---

## 4. 데이터베이스 스키마

### 핵심 테이블 (11개)

| 테이블 | 설명 |
|--------|------|
| `projects` | 프로젝트 (owner_id, calendar_settings) |
| `user_profiles` | 사용자 프로필 (role: admin/member/observer) |
| `project_members` | 프로젝트 멤버 RBAC |
| `tasks` | 작업 (CPM 필드: early_start, late_finish, total_float, is_critical, version) |
| `links` | 의존성 링크 (source, target, type: e2s/s2s/e2e/s2e, lag) |
| `resources` | 자원 (인력/장비/자재) |
| `assignments` | 자원-작업 할당 |
| `costs` | 비용 추적 |
| `baselines` | 기준선 (프로젝트당 최대 11개) |
| `baseline_tasks` | 기준선 스냅샷 |
| `interim_plans` | 중간 계획 (프로젝트당 최대 10개) |

### 마이그레이션 파일 목록

```
supabase/migrations/
├── 20251203070000_init_schema.sql          # 초기 스키마 생성
├── 20251203070001_auth_security.sql        # RLS 정책 및 인증 보안
├── 20251203070002_add_project_details.sql  # 프로젝트 상세 필드
├── 20251204000000_add_baselines.sql        # 기준선(Baseline) 기능
├── 20251204000004_add_task_description.sql # 작업 설명 필드
├── 20251204000006_fix_update_with_check.sql # RLS WITH CHECK 수정
├── 20251205000000_add_task_constraints.sql  # 스케줄 제약 조건
└── 20260610000000_enable_realtime.sql      # tasks/links Realtime publication 등록
```

### 주요 DB 함수

| 함수 | 역할 |
|------|------|
| `create_baseline()` | 기준선 생성 및 tasks 스냅샷 |
| `handle_new_user()` | 회원가입 시 user_profiles 자동 생성 |
| `sync_role_from_auth()` | auth 메타데이터 ↔ 프로필 역할 동기화 |
| `protect_role_column()` | 역할 직접 변경 방지 트리거 |

---

## 5. 실시간 동기화 (Realtime)

`tasks`와 `links` 테이블은 `supabase_realtime` publication에 등록되어 있습니다. `src/hooks/useRealtimeSync.ts`가 `postgres_changes`를 구독하여 다른 브라우저 탭 또는 다른 사용자의 변경 사항을 실시간으로 수신합니다.

### 동작 방식

- **INSERT**: 새 task/link가 로컬 상태에 없으면 추가 (id 존재 여부로 자신의 에코 필터링)
- **UPDATE**: 수신 row의 key 필드(start, duration, text)와 `tasksRef.current`를 비교해 자신의 저장 에코는 건너뜀. 타 탭 변경이면 React 상태 + SVAR Gantt 내부 스토어에 적용.
- **DELETE**: 해당 id를 로컬 상태와 SVAR에서 제거

### 로컬 환경 적용

`supabase_realtime` publication은 DB가 살아있는 상태에서 마이그레이션 파일을 직접 psql로 실행해야 합니다 (CLI `config.toml` 미사용):

```bash
docker exec supabase_db_zero-pm psql -U postgres \
  -c "ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;"
docker exec supabase_db_zero-pm psql -U postgres \
  -c "ALTER PUBLICATION supabase_realtime ADD TABLE public.links;"
```

`npx supabase db reset` 이후에는 위 명령을 다시 실행해야 합니다.

---

## 7. 보안 (RLS)

모든 테이블에 Row Level Security 활성화. 주요 정책:
- 프로젝트 소유자 또는 `project_members`에 등록된 유저만 접근 가능
- observer 역할은 SELECT만 허용
- 서버 사이드는 `service_role` 키로 RLS 우회 가능

RLS 테스트 방법은 `docs/RLS_TESTING.md` 참고.

---

## 8. 자주 쓰는 명령어

```bash
# 로컬 Supabase 시작 (Docker 필요)
npx supabase start

# 로컬 Supabase 상태 확인
npx supabase status

# DB 초기화 (마이그레이션 + seed 재적용)
npx supabase db reset

# 새 마이그레이션 파일 생성
npx supabase migration new <name>

# 리모트에 마이그레이션 적용
npx supabase db push

# 로컬 Supabase 중지
npx supabase stop
```

---

## 9. 관련 문서

- `docs/REMOTE_DEPLOYMENT.md` — 리모트 배포 체크리스트
- `docs/마이그레이션-가이드.md` — 마이그레이션 상세 가이드
- `docs/OAuth-설정-가이드.md` — Google/GitHub OAuth 설정
- `docs/RLS_TESTING.md` — RLS 정책 테스트 방법
