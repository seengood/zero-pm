
export const meta = {
  name: 'zeropm-pm-ux-design',
  description: 'ZeroPM PM/UX 설계 보완 — 페르소나, User Flow, 수용 기준, 기능 우선순위 문서 생성',
  phases: [
    { title: 'PM 설계', detail: '페르소나 + 사용자 스토리 맵 + 기능 우선순위 (MoSCoW)' },
    { title: 'UX 설계', detail: 'User Flow + 핵심 시나리오 + 수용 기준 (Given-When-Then)' },
    { title: '문서 저장', detail: 'docs/05-PM-UX설계/ 에 저장' },
    { title: '인덱스', detail: 'README 인덱스 문서 생성' },
  ],
}

const CONTEXT = `
ZeroPM은 MS Project 수준의 웹 기반 PM 도구다.

## 타겟 사용자
1순위: 프리랜서/1인 PM — 여러 클라이언트 프로젝트를 혼자 관리. 빠르고 가벼운 UX 선호.
2순위: IT 소/중규모 팀 PM (5~30명) — 스프린트/릴리즈 일정, 의존성 자동 재계산, 실시간 협업.

## 핵심 페인포인트
- MS Project: 무겁고 비싸다(Windows 전용, 연 $159+)
- Notion/Asana/Monday.com: 진짜 간트/CPM/의존성 자동 스케줄링이 없다

## ZeroPM 포지셔닝
MS Project 수준의 WBS + 의존성 기반 자동 스케줄링(CPM) + 웹 기반 실시간 협업 + 무료(Zero-Cost)

## 현재 구현된 기능
- 간트 차트 (SVAR React Gantt 기반, 드래그/리사이즈/링크)
- 4가지 의존성 타입 (FS, SS, FF, SF) + Lag
- 6가지 제약 조건 (ASAP, ALAP, MSO, MFO, SNET, FNLT)
- CPM 계산 (Early Start, Late Finish, Total Float, Critical Path)
- 실시간 크로스탭/멀티유저 동기화 (Supabase Realtime)
- 기준선 (Baseline) 최대 11개
- Supabase Auth (이메일/OAuth)
- RLS 기반 프로젝트 접근 제어

## 미구현 기능
- 자원 관리 (테이블 구조만 있음)
- 비용 추적 / EVM
- Undo/Redo
- 보고서/대시보드
- 모바일 최적화
`

phase('PM 설계')
log('페르소나, 사용자 스토리 맵, 기능 우선순위를 병렬로 작성합니다...')

const [personaDoc, priorityDoc] = await parallel([
  () => agent(
    `당신은 시니어 PM 컨설턴트입니다. 다음 맥락을 바탕으로 ZeroPM의 페르소나 정의서와 사용자 스토리 맵을 작성해줘.

${CONTEXT}

## 작성 지침
한국어 마크다운. 실제 서비스 기획서 수준의 구체성을 갖춰야 함.

## 문서 구조

# ZeroPM 페르소나 정의서

## 페르소나 A: [이름] — 프리랜서/1인 PM
- 기본 프로필 (나이, 직업, 경력, 사용 도구)
- 목표 (Goals): 이 사람이 일에서 달성하고자 하는 것
- 고통 (Pain Points): 현재 도구의 불편함, 반복되는 좌절
- 행동 패턴: 언제, 어디서, 어떻게 PM 도구를 쓰는가
- 기술 수준: 도구 친숙도
- ZeroPM에 기대하는 것: 이 페르소나가 원하는 핵심 가치 3가지
- 사용 시나리오 (대표 1개, 구체적으로)
- Quote: 이 사람이 할 법한 말 한 마디

## 페르소나 B: [이름] — IT 소/중규모 팀 PM
(동일 구조)

## 페르소나 비교 매트릭스
| 차원 | 페르소나 A | 페르소나 B |
두 페르소나의 핵심 차이점을 표로 정리

## 사용자 스토리 맵
핵심 Activity(행동 축)을 기준으로 사용자 스토리 맵 작성.
Activity별로 Epic → User Story → 페르소나 매핑.

Activity 예시: 프로젝트 시작 → 일정 계획 → 팀 협업 → 일정 변경 대응 → 진행 확인

각 User Story는 "나는 [역할]로서, [목적]을 위해, [기능]을 원한다." 형식으로 작성.
우선순위(Must/Should/Could)도 표시.

분량: 약 2,500~3,500 단어`,
    { label: '페르소나 + 스토리 맵', phase: 'PM 설계' }
  ),

  () => agent(
    `당신은 시니어 PM 컨설턴트입니다. 다음 맥락을 바탕으로 ZeroPM의 기능 우선순위를 MoSCoW 방법론으로 재정의하고, 각 Phase의 Entry/Exit Criteria와 NFR을 작성해줘.

${CONTEXT}

## 작성 지침
한국어 마크다운. 타겟 사용자(프리랜서 PM, IT 팀 PM) 관점에서 우선순위를 판단해야 함.
"기술적으로 멋진가"가 아니라 "이 사용자들의 문제를 해결하는가"가 기준.

## 문서 구조

# ZeroPM 기능 우선순위 및 개발 계획

## MoSCoW 기능 우선순위

### Must Have (없으면 제품이 아님)
각 기능마다: 기능 ID | 기능명 | 근거 (어느 페르소나의 어떤 고통을 해결하는가)

### Should Have (있어야 경쟁력)
(동일)

### Could Have (있으면 좋음)
(동일)

### Won't Have (이번 버전에서 제외)
(동일, 이유 명시)

## Phase별 재정의 로드맵

현재 Phase 1~6 계획을 타겟 사용자 관점에서 재평가.
각 Phase에:
- **목표**: 이 Phase가 끝났을 때 어떤 사용자 가치가 실현되는가
- **Entry Criteria**: 이 Phase를 시작하기 위한 조건
- **Exit Criteria**: 이 Phase가 완료됐음을 증명하는 조건 (수용 가능한 상태의 정의)
- **핵심 기능 목록**
- **예상 소요**: T-shirt 사이징 (S/M/L/XL)

## 비기능 요건 (NFR) 정의

### 성능
- 페이지 로드 시간
- 간트 차트 렌더링 시간 (태스크 수별)
- 실시간 동기화 지연 시간

### 확장성
- 지원 목표 태스크 수 (프로젝트당)
- 동시 접속 사용자 수

### 가용성
- 목표 업타임
- 계획된 다운타임 허용 범위

### 접근성
- 최소 지원 브라우저/기기

## 성공 지표 (Success Metrics)
MVP 출시 후 측정할 지표 정의:
- 사용자 지표: 가입 수, 프로젝트 생성 수, DAU/WAU
- 기능 지표: 의존성 사용률, 협업 기능 사용률
- 품질 지표: 에러율, 응답 시간 p95

분량: 약 2,500~3,000 단어`,
    { label: '기능 우선순위 + NFR', phase: 'PM 설계' }
  ),
])

phase('UX 설계')
log('User Flow, 핵심 시나리오, 수용 기준을 병렬로 작성합니다...')

const [userFlowDoc, acceptanceCriteriaDoc] = await parallel([
  () => agent(
    `당신은 시니어 UX 설계자입니다. 다음 맥락을 바탕으로 ZeroPM의 핵심 User Flow와 인터랙션 시나리오를 작성해줘.

${CONTEXT}

## 작성 지침
한국어 마크다운. 텍스트 기반 흐름도(ASCII 또는 번호 목록 형식)로 각 화면과 행동을 명확히 표현.
"기술이 어떻게 동작하는가"가 아니라 "사용자가 무엇을 보고 무엇을 하는가"를 중심으로.

## 문서 구조

# ZeroPM 핵심 User Flow

## Flow 1: 신규 사용자 첫 경험 (온보딩)
- 트리거: 사용자가 처음 접속
- 페르소나: 두 페르소나 모두
- 화면 흐름: 랜딩 → 가입 → 첫 프로젝트 생성 → 첫 태스크 입력 → 간트 확인
- 각 단계: 화면명 | 사용자 행동 | 시스템 반응 | 성공 조건 | 에러 상태
- Happy Path와 Error Path 모두 포함

## Flow 2: 프리랜서 PM의 일간 작업 흐름
- 트리거: 클라이언트로부터 일정 변경 요청
- 페르소나: 페르소나 A (프리랜서)
- 핵심 시나리오: 하나의 태스크 날짜 변경 → 의존성 자동 전파 → 결과 확인 → 클라이언트에게 업데이트 공유
- 각 단계 상세

## Flow 3: 팀 PM의 협업 흐름
- 트리거: 팀원이 태스크 완료 보고
- 페르소나: 페르소나 B (팀 PM)
- 핵심 시나리오: 진행률 업데이트 → Critical Path 변화 확인 → 팀원 재배정
- 각 단계 상세

## Flow 4: 충돌 해결 UX 흐름
- 트리거: 두 사용자가 동시에 같은 태스크를 수정
- 현재 낙관적 잠금 충돌 시 사용자에게 어떻게 보여야 하는가
- 비파괴적 해결 방식: 덮어쓰기 vs 병합 vs 내 변경 보류
- 각 선택지의 화면 설계와 사용자 행동

## Flow 5: Undo/Redo UX 흐름
- 어떤 행동이 Undo 가능해야 하는가 (태스크 이동, 링크 생성/삭제, 진행률 변경 등)
- Undo 스택의 범위 (세션 내? 영구?)
- 단일 Undo vs 그룹 Undo (예: 자동 전파된 모든 변경을 한 번에 Undo)
- Keyboard shortcut 및 UI 위치

## Flow 6: 오프라인 → 온라인 복귀 UX
- 오프라인 상태 진입: 사용자에게 어떻게 알리는가
- 오프라인 중 변경 허용 범위
- 온라인 복귀 시: 자동 동기화 vs 사용자 확인
- 충돌이 있는 경우 처리 방식

## 공통 UX 패턴 정의
- 빈 상태 (Empty State): 각 화면의 빈 상태 메시지와 CTA
- 로딩 상태: 스케줄링 계산 중, DB 저장 중 등
- 에러 상태: DB 저장 실패, 네트워크 오류, 권한 없음
- 성공 피드백: 저장 완료, 동기화 완료

분량: 약 3,000~4,000 단어`,
    { label: 'User Flow + 시나리오', phase: 'UX 설계' }
  ),

  () => agent(
    `당신은 시니어 QA 엔지니어이자 PM입니다. 다음 맥락을 바탕으로 ZeroPM의 핵심 기능에 대한 수용 기준(Acceptance Criteria)을 작성해줘.

${CONTEXT}

## 작성 지침
한국어 마크다운. Given-When-Then 형식 사용.
기술 구현이 아니라 사용자가 경험하는 결과를 기준으로 작성.
각 시나리오는 Happy Path + 최소 1개의 Edge Case/Error Case 포함.

## 문서 구조

# ZeroPM 핵심 기능 수용 기준 (Acceptance Criteria)

각 기능마다:
- 기능 ID 및 이름
- 관련 페르소나
- Happy Path 시나리오 (Given-When-Then)
- Edge Case / Error Case 시나리오

## AC-01: 프로젝트 생성
## AC-02: 태스크 생성 및 기본 편집
## AC-03: 의존성(링크) 생성 및 자동 스케줄링 전파
  - 핵심: 하나를 바꾸면 chain이 모두 갱신되는가
  - Edge: 순환 참조 시도
  - Edge: Lag가 있는 경우
## AC-04: 제약 조건 (MSO, SNET 등) 적용
  - 의존성 전파가 제약 조건을 넘지 않는가
## AC-05: Critical Path 표시
  - 사용자가 CP를 시각적으로 식별할 수 있는가
## AC-06: 기준선 (Baseline) 저장 및 비교
## AC-07: 실시간 협업 동기화
  - 두 사용자가 동시에 작업할 때 변경이 상대방에게 보이는가
  - 동기화 지연 허용 범위
## AC-08: 충돌 해결
  - 낙관적 잠금 충돌 시 사용자가 데이터를 잃지 않는가
## AC-09: 인증 및 접근 제어
  - 프로젝트 구성원 외 접근 차단
## AC-10: 오프라인 → 온라인 복귀
  - 오프라인 중 변경사항이 유실되지 않는가

## 수용 기준 추적 매트릭스
| AC ID | 기능 | 관련 페르소나 | 구현 Phase | 테스트 방법 | 현재 상태 |
자동화 테스트 가능 여부도 표시.

분량: 약 2,500~3,000 단어`,
    { label: '수용 기준 (AC)', phase: 'UX 설계' }
  ),
])

phase('문서 저장')
log('docs/05-PM-UX설계/ 에 저장합니다...')

const BASE = '/Users/sheplim/develop/01_work/01_zero-pm/docs/05-PM-UX설계'

await parallel([
  () => agent(
    `다음 내용을 파일 ${BASE}/01-페르소나-사용자스토리맵.md 에 Write 툴로 저장해줘. 내용 수정 없이 그대로.

=== 저장할 내용 ===
${personaDoc}
=== 끝 ===`,
    { label: '페르소나 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/02-기능우선순위-NFR.md 에 Write 툴로 저장해줘. 내용 수정 없이 그대로.

=== 저장할 내용 ===
${priorityDoc}
=== 끝 ===`,
    { label: '기능우선순위 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/03-User-Flow-시나리오.md 에 Write 툴로 저장해줘. 내용 수정 없이 그대로.

=== 저장할 내용 ===
${userFlowDoc}
=== 끝 ===`,
    { label: 'User Flow 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/04-수용기준-AC.md 에 Write 툴로 저장해줘. 내용 수정 없이 그대로.

=== 저장할 내용 ===
${acceptanceCriteriaDoc}
=== 끝 ===`,
    { label: '수용기준 저장', phase: '문서 저장' }
  ),
])

phase('인덱스')
log('README 인덱스를 생성합니다...')

await agent(
  `다음 내용을 파일 ${BASE}/00-README.md 에 Write 툴로 저장해줘.

내용:
# ZeroPM PM/UX 설계 문서

이 디렉토리는 ZeroPM의 사용자 중심 설계 문서를 담고 있습니다.
기술 구현보다 "누구의 어떤 문제를 어떻게 해결하는가"를 정의합니다.

## 타겟 사용자 요약
- **1순위**: 프리랜서/1인 PM — 여러 클라이언트 프로젝트 혼자 관리
- **2순위**: IT 소/중규모 팀 PM (5~30명) — 실시간 협업 + 자동 스케줄링

## 문서 목록

| 파일 | 내용 | 용도 |
|------|------|------|
| [01-페르소나-사용자스토리맵.md](01-페르소나-사용자스토리맵.md) | 페르소나 2개 + 사용자 스토리 맵 | 기능 설계의 기준 |
| [02-기능우선순위-NFR.md](02-기능우선순위-NFR.md) | MoSCoW 우선순위 + Phase별 Exit Criteria + NFR | 개발 계획 판단 기준 |
| [03-User-Flow-시나리오.md](03-User-Flow-시나리오.md) | 핵심 User Flow 6개 (온보딩/일변경/협업/충돌/Undo/오프라인) | UX 설계 및 테스트 시나리오 |
| [04-수용기준-AC.md](04-수용기준-AC.md) | 핵심 기능 10개의 Given-When-Then 수용 기준 | QA 및 완료 정의 |

## 설계 리뷰와의 관계
이 문서들은 [../04-설계리뷰/](../04-설계리뷰/) 의 분석 결과를 바탕으로 작성된 보완 설계입니다.
특히 PM 관점(C등급)과 UX 관점(D+등급)의 공백을 채우기 위한 핵심 문서입니다.
`,
  { label: 'README 저장', phase: '인덱스' }
)

log('완료! docs/05-PM-UX설계/ 에 5개 문서가 저장됐습니다.')
return {
  status: 'complete',
  files: ['00-README.md', '01-페르소나-사용자스토리맵.md', '02-기능우선순위-NFR.md', '03-User-Flow-시나리오.md', '04-수용기준-AC.md']
}
