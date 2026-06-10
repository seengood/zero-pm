# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

ZeroPM은 MS Project 스타일의 웹 기반 PM 도구입니다. 고성능 간트 차트, 자체 자동 스케줄링 엔진(의존성 기반 날짜 전파, 제약 조건, CPM/여유시간 필드), 실시간 협업 기능을 제공합니다. 기술 스택: Next.js 16(App Router) / React 19.2 / TypeScript 5, Supabase(Postgres + Auth + RLS + Realtime), 렌더링은 SVAR React Gantt, CRDT 동기화는 Yjs. README와 인라인 문서 상당수는 한국어로 작성되어 있습니다.

## 명령어

```bash
npm run dev          # Next 개발 서버, 포트 3005 (3000 아님)
npm run build        # 프로덕션 빌드 (Turbopack)
npm run lint         # eslint
npm test             # Jest (jsdom)
npm run test:watch   # Jest watch 모드
npm test -- src/lib/__tests__/scheduling.test.ts   # 단일 테스트 파일 실행
npm test -- -t "calculateSuccessorDate"            # 이름으로 테스트 필터링
npm test -- --coverage                             # 커버리지 리포트
npm run test:auth    # Supabase 인증 통합 테스트 (.env.local을 dotenv로 로드)
```

경로 별칭(alias): `@/*` → `src/*` (`tsconfig.json`과 `jest.config.ts` 양쪽에 설정됨).

## 주의가 필요한 셋업 함정

- **SVAR Gantt CSS는 반드시 로컬로 복사해야 합니다.** Turbopack이 `node_modules`의 압축된(minified) CSS를 파싱하지 못합니다. `src/styles/gantt-svar.css`로 복사한 뒤 `@/styles/gantt-svar.css`로 import 하세요:
  ```bash
  cp node_modules/@svar-ui/react-gantt/dist/index.css src/styles/gantt-svar.css
  ```
  빌드 중 `Parsing CSS source code failed - Invalid empty selector` 오류가 나면 이 복사 명령을 다시 실행하세요. `GanttView.jsx`는 이 파일이 존재한다는 전제로 동작합니다.
- SVAR React Gantt는 **GPLv3**이고 프로젝트 본체는 MIT입니다 — 재배포 시 유의해야 합니다.

## 아키텍처: View / Brain 분리

핵심 설계는 **렌더링**(SVAR Gantt)과 **스케줄링 로직**(자체 엔진)을 분리하는 것입니다. 데이터 흐름은 직접 호출이 아니라 싱글턴 이벤트 이미터를 통한 **이벤트 기반(event-driven)** 방식입니다. task/link 동작을 수정하기 전에 이 루프를 반드시 이해해야 합니다.

```
사용자 액션 (간트에서 드래그/리사이즈/링크 생성)
  → ganttIntercepts.js  (resize-task/update-task/add-link 등 api.intercept)
  → GanttView.jsx의 handleTaskUpdate / 각종 핸들러
  → taskEventEmitter.emit('task:updated' | 'link:created' | ...)
  → 옵저버들 (useGanttObservers.js에서 등록) 이 실행:
       DBObserver  → Supabase에 영속화 (src/lib/tasks.ts)
       UIObserver  → setTasks/setLinks React 상태 갱신 (업데이트 병합)
  → handleTaskUpdate가 직접 recalculateAffectedTasks(task.id, task) 호출

스케줄링 전파 (후행 task 날짜 자동 갱신 — 전체 chain 재귀 처리)
  → ganttScheduler.js: 후행 링크를 재귀 순회 (visited Set으로 사이클 방지)
       각 후행에 applyConstraint 적용 (ASAP/SNET/MSO/MFO/FNLT)
       tasksRef.current는 async React state로 stale할 수 있으므로
       직전 계산값(updatedSuccessor)을 다음 단계에 직접 전달
  → handleTaskUpdate(successor, skipRecalculation=true) 호출
  → useGanttObservers.js: skipRecalculation=true 감지 →
       ganttApiRef.current.exec('update-task', ...) 로 SVAR 내부 스토어에 직접 푸시
       (isSchedulerUpdateRef=true 로 인터셉트 재진입 방지)

링크 생성/수정/삭제 시 스케줄링
  → ScheduleObserver(link:created|updated|deleted) → recalculateAffectedTasks 호출
  → 위 스케줄링 전파 경로와 동일하게 처리

실시간 크로스탭/멀티유저 동기화
  → useRealtimeSync.ts: Supabase postgres_changes 구독 (tasks, links 테이블)
  → 원격 변경 수신 → 중복 제거(자신의 에코인지 tasksRef와 비교) →
       setTasks/setLinks 로 React 상태 갱신
       ganttApiRef.current.exec(...) 로 SVAR 내부 스토어 갱신
```

핵심 파일:
- `src/lib/taskEventEmitter.ts` — 싱글턴 pub/sub. 이벤트 타입: `task:created|updated|deleted`, `link:created|updated|deleted`. 리스너는 `{ type, payload, timestamp }`를 받습니다.
- `src/lib/taskObservers.ts` — `DBObserver`, `UIObserver`, `ScheduleObserver`. **DBObserver와 UIObserver는 현재 task에 업데이트를 병합**합니다(`{ ...currentTask, ...task }`). 부분(partial) 이벤트가 다른 필드를 지우지 않도록 하기 위함이니, 수정 시 이 동작을 유지하세요.
- `src/hooks/useGanttObservers.js` — 옵저버를 인스턴스화하고 이미터 구독을 연결하며, 언마운트 시 정리(cleanup)합니다. `skipRecalculation=true` 이벤트 수신 시 `ganttApiRef.current.exec('update-task', ...)`를 호출해 SVAR 내부 스토어를 직접 갱신합니다.
- `src/hooks/useRealtimeSync.ts` — Supabase `postgres_changes`를 구독해 다른 탭/유저의 변경을 실시간 수신. 자신의 에코는 `tasksRef.current`와 키 필드(start, duration, text) 비교로 건너뜁니다.
- `src/lib/ganttScheduler.js` — `createRecalculateFunction`: 후행(successor) 링크를 **재귀적으로** 순회하여 전체 downstream chain을 처리합니다. `visited Set`으로 사이클을 방지하고, 각 단계에서 `applyConstraint`를 적용합니다. React state async 특성으로 `tasksRef.current`가 stale할 수 있으므로 직전 계산값(`updatedSuccessor`)을 재귀 호출에 직접 전달합니다. 전파 루프 방지를 위해 `skipRecalculation=true`로 emit합니다.
- `src/lib/scheduling.ts` — 순수 스케줄링 계산: `calculateSuccessorDate`(FS/SS/FF/SF + lag), `calculateEndDate`, `applyConstraint`(6종 제약 조건).
- `src/components/GanttView.jsx` — 오케스트레이터. `'use client'`이며 tasks/links 상태를 보유하고, `tasksRef`/`linksRef`가 상태를 미러링하여 이미터 콜백이 항상 최신 값을 읽도록 합니다. `ganttApiRef`에 SVAR API 객체를 저장하고, `isSchedulerUpdateRef`로 프로그래매틱 exec 시 인터셉트 재진입을 방지합니다.

### 중요: SVAR Gantt는 React props 변경을 무시한다
SVAR Gantt는 마운트 후 `tasks`/`links` React props 변경을 반영하지 않습니다. 모든 프로그래매틱 업데이트(스케줄링 전파, 크로스탭 동기화)는 반드시 `ganttApiRef.current.exec('update-task'|'add-task'|'delete-task'|'add-link'|'delete-link', ...)` 로 SVAR 내부 스토어에 직접 적용해야 합니다.

### 중요: ref와 useMemo로 옵저버 재초기화 방지
`recalculateAffectedTasks`는 `useMemo([])`로 감싸여 있고, 옵저버는 안정적인(stable) ref에만 의존합니다. **옵저버/`useMemo` 셋업에 변하는 의존성을 추가하지 마세요.** 재초기화 버그가 다시 발생합니다. 최신 task/link 데이터는 클로저에 캡처된 상태가 아니라 항상 `tasksRef.current` / `linksRef.current`로 읽어야 합니다.

## 도메인 규칙

- **링크 타입 코드**(SVAR 규약, `src/lib/constants.ts` 참고): `e2s` = Finish-to-Start, `s2s` = Start-to-Start, `e2e` = Finish-to-Finish, `s2e` = Start-to-Finish. MS Project의 FS/SS/FF/SF 라벨과 혼동하지 마세요.
- **제약 조건 타입**: `asap`(기본값), `alap`, `mso`, `mfo`, `snet`, `fnlt` (`ALAP`은 아직 완전히 구현되지 않음).
- **날짜 처리**: 스케줄링 계산은 `src/lib/dateUtils.ts`의 UTC 헬퍼(`parseToUTC`, `addDaysUTC`)를 사용합니다. 엔진 내부의 종료일(end date)은 **배타적(exclusive)** 이며, `GanttView.jsx`의 표시 레이어에서 duration을 포함적(inclusive) 종료일로 변환합니다(`start + duration - 1`을 23:59로). 시작일은 영속화 전 `00:00:00`으로 정규화됩니다. `workingDays`는 7일 전부로 설정되어 있습니다(달력 일수 기준, 스케줄링에서 주말을 제외하지 않음).
- **데이터 모델**: `tasks`(`parent_id`를 통한 인접 리스트), `links`(정규화된 source/target/type/lag), `projects`. task는 CPM 필드(`early_start`, `late_finish`, `total_float`, `is_critical`)와 낙관적 잠금용 `version` 컬럼을 가집니다. 타입 정의는 `src/types/database.ts`에 있습니다.

## Supabase

- 클라이언트: `src/lib/supabase/client.ts`(브라우저), `server.ts`(SSR). `src/lib/tasks.ts` / `projects.ts`가 데이터 접근 계층이며, 각 함수는 테스트 용이성을 위해 선택적 `supabase` 클라이언트 인자를 받습니다(기본값은 브라우저 클라이언트).
- 낙관적 잠금: `src/lib/optimisticLocking.ts`가 `version` 컬럼을 사용합니다.
- 마이그레이션: `supabase/migrations/*.sql`(타임스탬프 형식). RLS 정책이 핵심이며, 인증/보안 테스트는 `supabase/tests/`의 pgTAP 파일입니다. `docs/RLS_TESTING.md`, `docs/REMOTE_DEPLOYMENT.md` 참고.
- 실시간:
  - **크로스탭/멀티유저 데이터 동기화**: `src/hooks/useRealtimeSync.ts`가 `postgres_changes`로 `tasks`/`links` 테이블 변경을 구독. `supabase_realtime` publication에 두 테이블이 등록되어 있어야 함(`supabase/migrations/20260610000000_enable_realtime.sql`).
  - **프레즌스** ("누가 편집 중인지"): `src/hooks/usePresence.ts`의 Supabase 채널.
  - **CRDT 문서 동기화**: `src/hooks/useYjs.ts` + `src/lib/yjs.ts`의 Yjs(y-websocket 서버 필요, `NEXT_PUBLIC_YJS_WS_URL`, 기본값 `ws://localhost:1234`).

## 테스트 규칙

프로젝트 규칙은 `.agent/rules/development-rules.md`에 있습니다. 요점:
- 테스트는 형제(sibling) `__tests__/` 디렉토리에 `*.test.ts(x)` 형식으로 작성합니다.
- 커버리지 목표: `lib/` 비즈니스 로직 ~100%, 컴포넌트 ≥90%, 훅 ≥95%.
- SVAR Gantt는 테스트에서 `src/__mocks__/react-gantt.js`와 `react-core.js`로 모킹됩니다(`jest.config.ts`에 매핑).
- 들여쓰기 2칸 공백, 작은따옴표 사용, 새 컴포넌트 테스트는 `fireEvent`보다 `userEvent` 선호, 테스트 파일 외에는 `any` 지양.

## 참고 사항

- `GanttView.jsx` 및 간트 라이브러리 파일들(`ganttIntercepts.js`, `ganttScheduler.js`, `ganttUtils.js`, `taskUpdateUtils.js`)은 의도적으로 TS가 아닌 `.js`/`.jsx`입니다 — 타입이 없는 SVAR API와 연동하기 때문입니다.
- 디버그 `console.log`는 모든 파일에서 제거 완료. `console.error`만 실제 오류 상황에서 남아 있습니다.
