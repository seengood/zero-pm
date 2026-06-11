# ZeroPM 현황 분석 및 작업 계획

> 작성일: 2026-06-11  
> 분석 기준: 전체 설계 문서 + 소스 코드 대조 분석 (Claude 자동 생성)

---

## 1. Phase별 구현 완료 현황

### Phase 1 — 인증, DB, 기본 인프라 | 달성률: ~75%

| 기능 ID | 항목 | 상태 | 비고 |
|---|---|---|---|
| AUTH-01 | 이메일/비밀번호 로그인 | ✅ 완료 | login/signup/callback 페이지 완비 |
| AUTH-02 | 소셜 OAuth 로그인 | ⚠️ 준비만 됨 | 환경변수 미설정, 미활성화 |
| AUTH-03 | RLS (Row Level Security) | ✅ 완료 | 전 테이블 RLS + 정책 완비 |
| AUTH-04 | RBAC (역할 기반 접근 제어) | 🔶 부분완료 | `project_members.role` 존재. admin 권한 분기 UI 없음 |
| AUTH-05 | 프로젝트 멤버 초대 | ❌ 미구현 | 테이블은 있으나 초대 UI/이메일 플로우 없음 |
| COL-04 | 오프라인 지원 (IndexedDB/RxDB) | ❌ 미구현 | 설계에만 존재 |
| COL-05 | 낙관적 잠금 | ⚠️ 구조만 완료 | `optimisticLocking.ts` + RPC 완비 — **단, DBObserver에서 미사용** |
| — | DB 스키마 (10개 테이블) | ✅ 완료 | projects/tasks/links/resources/assignments/costs/baselines/baseline_tasks/interim_plans/project_members |
| — | Auth 트리거 | ✅ 완료 | `handle_new_user`, `sync_role_from_auth`, `protect_role_column` |
| — | Yjs CRDT 통합 | ⚠️ Dead code | `useYjs.ts` 존재하나 GanttView에 미연결. 메인 동기화는 postgres_changes가 단독 담당 |

---

### Phase 2 — 스케줄링 엔진 | 달성률: ~50%

| 기능 ID | 항목 | 상태 | 비고 |
|---|---|---|---|
| SCH-01 | DAG 모델링 (graphlib) | ⚠️ 대체 구현 | graphlib 미설치. links 배열 직접 순회로 대체 |
| SCH-02 | CPM 전진/후진 계산 | ⚠️ 부분 구현 | ES/EF/LS/LF DB 컬럼은 존재하나 실시간 계산/저장 미작동. 전진 전파(cascade)만 동작 |
| SCH-03 | 업무일 기반 계산 | ❌ 의도적 미적용 | `workingDays=[0~6]` 7일 전부 처리. 주말/공휴일 미제외 (설계 문서 미반영) |
| SCH-04 | Web Worker 비동기 처리 | ❌ 미구현 | Web Worker 코드 없음. 모든 계산이 메인 스레드 동기 실행 |
| — | 4가지 의존성 유형 + Lag | ✅ 완료 | `calculateSuccessorDate` FS/SS/FF/SF + lag 완전 구현 |
| — | 제약조건 ASAP/MSO/MFO/SNET/FNLT | ✅ 완료 | `applyConstraint` 5가지 구현 |
| — | ALAP 제약조건 | 🔶 미완성 | 코드에 `// TODO: Implement ALAP with project end date` 명시 |
| — | Cascade Scheduling (후행 전파) | ✅ 완료 | `ganttScheduler.js` 재귀 전파 + visited Set 사이클 방지 완전 구현 |
| — | 순환 참조(Cycle) 감지 | ❌ 미구현 | DFS/Kahn 알고리즘 없음. visited Set은 무한루프 방지용, 에러 검출용 아님 |

---

### Phase 3 — Gantt UI | 달성률: ~70%

| 기능 ID | 항목 | 상태 | 비고 |
|---|---|---|---|
| UI-01 | SVAR Gantt 가상화 렌더링 | ✅ 완료 | GanttView.jsx 완전 통합 |
| — | Task CRUD | ✅ 완료 | 생성/수정/삭제/컨텍스트 메뉴 완비 |
| — | 링크 생성/수정/삭제 | ✅ 완료 | 드래그 생성, `ganttIntercepts.js` 인터셉트 완비 |
| — | 이벤트 기반 아키텍처 | ✅ 완료 | TaskEventEmitter + DBObserver/UIObserver/ScheduleObserver + useGanttObservers 완전 구현 |
| — | 실시간 크로스탭 동기화 | ✅ 완료 | `useRealtimeSync.ts` postgres_changes 구독, SVAR exec 직접 푸시 |
| — | Optimistic UI | 🔶 부분완료 | 로컬 상태 즉시 반영. **실패 시 롤백 로직 없음** |
| COL-02 | Presence (소프트 락) | 🔶 부분완료 | `usePresence.ts` + `PresenceIndicator.tsx` 구현 완료 — **GanttView에 미연결** |
| — | 임계 경로(Critical Path) 시각화 | ❌ 미구현 | DB 필드는 있으나 실시간 계산 미연동 |
| — | Gantt 툴바 (줌/필터/뷰 전환) | ❌ 미구현 | |
| UI-02 | Kanban Board, Calendar View | ❌ 미구현 | 파일 없음 |

---

### Phase 4 — PM 핵심 기능 | 달성률: ~30%

| 기능 ID | 항목 | 상태 | 비고 |
|---|---|---|---|
| PM-01 | 무한 계층 WBS | ✅ 완료 | `parent_id` 인접 리스트 + SVAR tree 지원 |
| PM-02 | Roll-up 자동 집계 | ❌ 미구현 | Summary task 표시는 되나 하위 기간/진척률 자동 집계 없음 |
| PM-03 | Custom Task Type | 🔶 부분완료 | task/milestone/summary만 지원. 사용자 정의 타입 미구현 |
| PM-04 | 다중 기준선 (Baseline) | 🔶 부분완료 | CRUD + GanttView 버튼 존재. **비교 시각화 UI 없음. 스키마 충돌 있음** |
| PM-05 | 중간 계획 (Interim Plan) | ❌ 미구현 | `interim_plans` 테이블은 있으나 UI/API 코드 없음 |
| PM-06 | 4가지 의존성 유형 | ✅ 완료 | Phase 2 참조 |

---

### Phase 5 — 자원 및 비용 관리 | 달성률: 0% (스키마만)

| 기능 ID | 항목 | 상태 |
|---|---|---|
| RES-01 | 자원 정의 및 할당 | ❌ 미구현 |
| RES-02 | 실시간 충돌 감지 | ❌ 미구현 |
| RES-03 | 휴리스틱 조정 지원 | ❌ 미구현 |
| RES-04 | 비용 데이터 관리 | ❌ 미구현 |
| RES-05 | EVM 분석 | ❌ 미구현 |

> `resources`, `assignments`, `costs` DB 테이블은 완비. API 계층과 UI 전무.

---

### Phase 6 — 대시보드 및 보고서 | 달성률: 0%

| 기능 ID | 항목 | 상태 |
|---|---|---|
| REP-01 | 종합 현황판(대시보드) | ❌ 미구현 |
| REP-02 | 개인화 위젯 | ❌ 미구현 |
| REP-03 | 번다운/번업 차트 | ❌ 미구현 |
| REP-04 | S-Curve | ❌ 미구현 |
| REP-05 | 리소스 활용도 분석 | ❌ 미구현 |
| REP-06 | 내보내기 (PDF/Excel) | ❌ 미구현 |

---

### 전체 진척 요약

| Phase | 내용 | 달성률 |
|---|---|---|
| Phase 1 | Foundation & Auth | ~75% |
| Phase 2 | Scheduling Engine | ~50% |
| Phase 3 | Core UI (Gantt) | ~70% |
| Phase 4 | Advanced PM | ~30% |
| Phase 5 | Resource & Cost | 0% |
| Phase 6 | Reporting | 0% |
| **전체** | | **~40%** |

---

## 2. 즉시 수정 필요한 버그 및 코드 품질 이슈

> 기능 개발 전에 먼저 처리해야 합니다.

### BUG-01: FS 계산 오프-바이-원 가능성
- **위치**: `src/lib/scheduling.ts` — `calculateSuccessorDate`, `FINISH_TO_START` 케이스
- **문제**: `predEnd`가 이미 exclusive end(다음 날 00:00)인데 `addDaysUTC(predEnd, 1 + lag)`으로 +1 추가. lag=0일 때 선행 종료일보다 1일 늦게 후행이 시작될 수 있음
- **조치**: 기존 테스트 실행 후 확인, 필요 시 `addDaysUTC(predEnd, lag)` 로 수정

### BUG-02: `baselines` 스키마 충돌 — **심각**
- **위치**: `20251203070000_init_schema.sql` vs `20251204000000_add_baselines.sql`
- **문제**: `add_baselines.sql`이 baselines 테이블을 DROP 후 `data JSONB` 방식으로 재정의. 구 `create_baseline` RPC는 존재하지 않는 `baseline_number` 컬럼에 INSERT 시도 → `optimisticLocking.ts`의 `createBaseline` 호출 시 런타임 오류
- **조치**: `optimisticLocking.ts`의 `createBaseline`을 `baselines.ts` 방식으로 통일, 구 RPC 제거

### BUG-03: `taskEventEmitter.ts` console.log 잔류
- **위치**: `src/lib/taskEventEmitter.ts` — `Emitting event`, `No listeners` 로그 2개
- **문제**: CLAUDE.md "debug log 제거 완료" 명시와 불일치. 모든 task/link 이벤트마다 payload 전체가 콘솔 노출
- **조치**: 해당 `console.log` 2개 제거

### BUG-04: Supabase 클라이언트 이중 패턴 혼재
- **위치**: `baselines.ts`, `optimisticLocking.ts`, `usePresence.ts` → 구 `supabaseClient.ts` 사용  
  vs. `tasks.ts`, `useRealtimeSync.ts` → 신 `supabase/client.ts` 사용
- **문제**: 클라이언트 인스턴스 불일치, 세션 공유 문제 가능성
- **조치**: 전 파일을 `src/lib/supabase/client.ts` 방식으로 통일, `supabaseClient.ts` 제거

### BUG-05: `GanttView.jsx` processedTasks 제약 조건 중복 적용
- **위치**: `src/components/GanttView.jsx` — `processedTasks` 계산 로직
- **문제**: DB에 저장된 start_date가 있음에도 매 렌더링마다 `applyConstraint`를 다시 적용 → MSO/MFO 제약 조건에서 표시값과 DB값이 달라질 수 있음
- **조치**: processedTasks에서 제약 조건 재적용 로직 제거 또는 조건부 처리

### 설계 문서 불일치
- **`links.type` 코드 체계**: 설계 문서는 `'0'(FS)/'1'(SS)/'2'(FF)/'3'(SF)` 숫자 코드로 기술하나 실제 구현은 `'e2s'/'s2s'/'e2e'/'s2e'` SVAR 문자열 코드 사용 → 설계 문서 수정 필요
- **`구현계획.md` 완료 표시 허위**: Phase 2 전체가 `[x]` 완료로 표시되나 graphlib 미사용, Business Calendar 미적용, Web Worker 미연동 → 실제 상태로 수정 필요
- **`작업이력.md` 6개월 이상 미갱신**: 마지막 기록이 2025-12-05. 이후 cascade scheduling, 실시간 동기화 등 주요 작업이 문서화되지 않음

---

## 3. 설계 ↔ 구현 GAP 분석

### [GAP-1] Yjs CRDT — 설계 핵심인데 Dead Code
설계 문서 전체가 "Yjs + Supabase Realtime 하이브리드"를 핵심 차별점으로 강조하나, `useYjs.ts`는 GanttView에서 미호출. y-websocket 서버(`ws://localhost:1234`) 없이 연결 불가 — Zero-Cost 원칙과 충돌. **즉각 전략 결정 필요.**

### [GAP-2] Presence — 구현됐으나 GanttView에 미연결
`usePresence.ts` + `PresenceIndicator.tsx`가 완성도 있게 구현됐으나 GanttView.jsx에서 미호출. 사용자에게 기능이 보이지 않음. **연결 공수가 적어 빠른 시일 내 해소 가능.**

### [GAP-3] 낙관적 잠금 — 구조만 완성, 실제 경로에서 미사용
`updateTaskWithOptimisticLock`이 완성됐으나 `DBObserver`는 단순 `updateTask` 호출 → 멀티유저 동시 편집 시 last-write-wins 덮어쓰기 발생. DB 저장 실패 시 사용자는 저장된 것처럼 보이지만 실제로는 데이터 손실 — **PM 도구에서 치명적.**

### [GAP-4] CPM 엔진 — DB/타입은 완비, 계산 로직 미연결
ES/EF/LS/LF/TF DB 컬럼, `save_cpm_results` RPC, 타입 정의가 모두 준비됐으나 실시간 계산/저장 미작동. Critical Path 시각화 불가. 인프라는 다 갖춰진 상태에서 **엔진 로직만 추가하면 된다.**

### [GAP-5] 에러 격리 및 저장 실패 알림 부재
`taskEventEmitter.emit`은 DB/UI/Schedule Observer를 병렬 실행. 하나 실패 시 나머지는 이미 실행 완료 → DB 저장 실패 시 사용자가 알 방법 없음("조용한 데이터 손실").

---

## 4. 핵심 파일 완성도 평가

| 파일 | 완성도 | 주요 이슈 |
|---|---|---|
| `scheduling.ts` | 85% | ALAP TODO, 업무일 미지원 |
| `ganttScheduler.js` | 80% | Forward-only, link 삭제 후 날짜 앞당기기 미처리 |
| `taskObservers.ts` | 90% | 전반적으로 견고 |
| `taskEventEmitter.ts` | 90% | `console.log` 2개 미제거 |
| `tasks.ts` | 70% | 일반 update 시 version increment 없음 |
| `baselines.ts` | 50% | 비교/시각화 없음, `optimisticLocking.ts`와 충돌 |
| `useRealtimeSync.ts` | 85% | link UPDATE 시 SVAR exec 미호출 가능성 |
| `usePresence.ts` | 70% | GanttView 미연결, 구 클라이언트 사용 |
| `GanttView.jsx` | 75% | God Component(530줄), `window.prompt` 사용, Presence 미통합 |
| `optimisticLocking.ts` | 40% | 실제 경로에서 미사용, Baseline RPC 충돌 |

---

## 5. 우선순위화된 작업 계획

### Critical — 즉시 (버그/데이터 무결성)

| # | 작업 | 관련 파일 | 예상 소요 |
|---|---|---|---|
| C-1 | **BUG-03** `taskEventEmitter.ts` console.log 2개 제거 | `taskEventEmitter.ts` | 30분 |
| C-2 | **BUG-04** Supabase 클라이언트 단일화 (구 `supabaseClient.ts` 제거) | `baselines.ts`, `optimisticLocking.ts`, `usePresence.ts` | 1시간 |
| C-3 | **BUG-02** Baseline 스키마 충돌 해소 및 `optimisticLocking.createBaseline` 수정 | `optimisticLocking.ts`, `baselines.ts` | 2시간 |
| C-4 | **BUG-01** FS 계산 off-by-one 테스트 실행 후 수정 여부 결정 | `scheduling.ts`, `scheduling.test.ts` | 1시간 |
| C-5 | `ganttIntercepts.js` stale `links` 클로저 수정 (`linksRef.current` 참조로 교체) | `ganttIntercepts.js`, `GanttView.jsx` | 1시간 |

---

### 단기 (1~2주) — MVP 완성

| # | 작업 | 관련 파일 | 예상 소요 |
|---|---|---|---|
| S-1 | **소셜 OAuth 활성화** — 환경변수 설정 및 테스트 | `.env.local` | 0.5일 |
| S-2 | **Presence GanttView 통합** — `usePresence` 연결, `PresenceIndicator` 표시 | `GanttView.jsx`, `usePresence.ts` | 3시간 |
| S-3 | **낙관적 잠금 실 경로 연결** — DBObserver → `updateTaskWithOptimisticLock` | `taskObservers.ts`, `optimisticLocking.ts` | 반일 |
| S-4 | **저장 실패 알림** — DBObserver 실패 시 토스트 알림 표시 | `taskObservers.ts`, 신규 toast 컴포넌트 | 반일 |
| S-5 | **ALAP 제약조건 완성** — 프로젝트 종료일 기준 역산 | `scheduling.ts`, `projects` 테이블 | 1일 |
| S-6 | **링크 삭제 후 Successor "earlier" 재계산** | `ganttScheduler.js`, `taskObservers.ts` | 반일 |
| S-7 | **Summary Task Roll-up (PM-02)** — 하위 start/end/progress 자동 집계 | `ganttScheduler.js` 또는 신규 `rollupCalculator.js` | 1~2일 |
| S-8 | **Gantt 툴바** — 줌(일/주/월/분기), 오늘로 이동, 필터 | 신규 `GanttToolbar.jsx` | 2일 |
| S-9 | **멤버 초대 UI (AUTH-05)** — 이메일 초대, 역할 할당 | 신규 `InviteMemberModal.tsx`, `project_members` API | 1~2일 |

---

### 중기 (1개월) — 경쟁력 있는 제품

| # | 작업 | 관련 파일 | 예상 소요 |
|---|---|---|---|
| M-1 | **CPM 전진/후진 Pass 구현** — ES/EF/LS/LF/TF 실시간 계산, `save_cpm_results` RPC 연결 | `scheduling.ts`, `ganttScheduler.js` | 3~5일 |
| M-2 | **임계 경로 시각화** — Gantt 바 색상 구분 (빨강 = Critical) | `GanttView.jsx`, CSS | 1일 |
| M-3 | **순환 참조(Cycle) 감지** — 링크 생성 시 DFS 검사 + 사용자 경고 | `ganttIntercepts.js`, `scheduling.ts` | 1일 |
| M-4 | **업무일 캘린더 지원** — `calendar_settings` JSONB 활용 | `dateUtils.ts`, `ganttScheduler.js`, `scheduling.ts` | 2~3일 |
| M-5 | **기준선 비교 시각화** — Gantt 오버레이 (SVAR baselines 옵션) | `GanttView.jsx`, `baselines.ts` | 2~3일 |
| M-6 | **자원 할당 기초 (RES-01)** — 자원 등록/할당 API + TaskDetailModal UI | 신규 `resources.ts`, `assignments.ts` | 3~5일 |
| M-7 | **Yjs 전략 결정 및 실행** — 제거(권장) or Supabase Broadcast provider 실 통합 | `useYjs.ts`, `package.json` | 1~3일 |
| M-8 | **Web Worker 연동** — CPM 계산을 백그라운드 스레드로 이동 | 신규 `scheduling.worker.ts` | 2일 |

---

### 장기 (2개월+) — 고급 기능

| # | 작업 | 예상 소요 |
|---|---|---|
| L-1 | 자원 충돌 감지 및 RCPSP 시각화 (RES-02~03) | 1~2주 |
| L-2 | 비용 추적 UI + EVM 분석 (RES-04~05) | 1~2주 |
| L-3 | 프로젝트 대시보드 (REP-01~02) | 1~2주 |
| L-4 | 번다운/S-Curve 차트 (REP-03~04) | 1주 |
| L-5 | PDF/Excel 내보내기 (REP-06) | 1주 |
| L-6 | Kanban Board, Calendar View (UI-02) | 2~3주 |
| L-7 | Interim Plan 관리 UI (PM-05) | 2일 |
| L-8 | 오프라인 지원 (IndexedDB) (COL-04) | 5일 |

---

## 6. 아키텍처 개선 제안

### [제안 1] Yjs 전략 즉각 결정 — 가장 시급

현재 Yjs는 dead code이며 y-websocket 서버 없이 연결 불가. Zero-Cost 원칙과 충돌. 두 선택지:

- **옵션 A (단순화 — 권장)**: Yjs 제거, `postgres_changes` 단일 동기화로 정리. 소규모 팀 협업에 충분하며 현재 구현 방향과 일치.
- **옵션 B (CRDT 실 통합)**: Supabase Broadcast 채널을 Yjs transport로 사용하는 커스텀 provider 구현. y-websocket 없이 Zero-Cost 유지 가능. 구현 복잡도 높음. 오프라인 지원 필요 시 선택.

현재처럼 "있는 척"만 하는 Yjs는 번들 비용과 유지보수 위험만 발생시킨다.

---

### [제안 2] DBObserver에 낙관적 잠금 실 경로 연결

`updateTaskWithOptimisticLock`(maxRetries=3 지원)이 완성됐으나 실제 경로에서 미사용. `DBObserver.handleTaskUpdated`에서 이 함수로 교체하되, 스케줄러 연쇄 업데이트 경로(`skipRecalculation=true`)는 버전 충돌 빈도가 높으므로 일반 `updateTask` 유지.

---

### [제안 3] 이벤트 이미터의 에러 격리 및 저장 실패 알림

DB 저장 실패 시 UI는 이미 업데이트된 상태 — "조용한 데이터 손실" 발생. 다음 중 하나 적용:
1. DBObserver 실패 시 에러 이벤트 emit → 사용자에게 토스트 알림
2. "UI 즉시 반영 → DB 저장 → 실패 시 UI 롤백" 패턴 도입

---

### [제안 4] Cascade Scheduling → 완전한 CPM으로 단계적 격상

DB 인프라(ES/EF/LS/LF/TF 컬럼, `save_cpm_results` RPC, 타입 정의)가 이미 완비. 2단계로 진행:
1. **1단계 (단기)**: topological sort 기반 forward pass 전환 → link 삭제 후 날짜 앞당기기 문제 해결
2. **2단계 (중기)**: backward pass + float 계산 → Critical Path 시각화 활성화, ALAP 구현 전제 조건 충족

---

### [제안 5] GanttView.jsx 관심사 분리

530줄짜리 God Component를 단계적으로 분리:
- `useGanttState.js` — tasks/links 상태 및 ref 관리 전담
- `useBaselineManager.js` — 베이스라인 CRUD 전담 (`window.prompt/alert` 제거)
- `GanttToolbar.jsx` — 툴바 UI 분리
- `setupGanttIntercepts`에 `linksRef` 직접 주입 → stale closure 원천 차단

---

## 7. 종합 결론

ZeroPM은 cascade scheduling, 이벤트 기반 아키텍처, 실시간 크로스탭 동기화라는 기술적으로 견고한 기반을 갖추고 있다. **Phase 1~3의 핵심 경로는 실제로 동작하는 수준**이다.

그러나 설계 문서와 실제 구현 사이에는 상당한 GAP이 있다. CPM 전체 엔진, Yjs CRDT, 업무일 캘린더, Phase 5~6 전체가 미구현이며, Baseline 스키마 충돌·낙관적 잠금 비활성화·console.log 잔류 등 즉시 수정이 필요한 이슈도 있다.

**현실적인 MVP 완성 경로:**

```
Critical 5개 버그 수정 (반일)
  → OAuth 활성화 + Presence 연결 (1일)
  → 낙관적 잠금 실 경로 연결 + 저장 실패 알림 (1일)
  → ALAP + Roll-up + 툴바 (1주)
  → CPM forward pass + Critical Path 시각화 (1주)
```

이 작업들의 대부분은 새로운 설계가 아닌, **이미 존재하는 DB 컬럼/RPC/타입/훅을 실제로 "연결"하는 작업**이어서 구현 비용이 상대적으로 낮다.
