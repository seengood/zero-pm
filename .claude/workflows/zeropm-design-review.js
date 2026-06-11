
export const meta = {
  name: 'zeropm-design-review',
  description: 'ZeroPM 기획/설계 문서 전문가 관점 병렬 분석 및 개선안 문서 생성',
  phases: [
    { title: '문서 수집', detail: '핵심 문서 전체 읽기' },
    { title: '병렬 분석', detail: 'PM/UX/아키텍처/데이터/보안 5개 관점 동시 분석' },
    { title: '문서 저장', detail: '분석 결과를 docs/04-설계리뷰에 저장' },
    { title: '종합 보고서', detail: '5개 분석을 합산한 종합 보고서 생성' },
  ],
}

phase('문서 수집')
log('핵심 기획/설계 문서 전체를 읽어 공유 컨텍스트를 구성합니다...')

const docContext = await agent(
  `다음 파일들을 모두 읽고 전체 내용을 하나의 긴 텍스트로 합쳐서 반환해줘. 파일 경로를 섹션 헤더로 사용해.

읽어야 할 파일 목록:
1. /Users/sheplim/develop/01_work/01_zero-pm/CLAUDE.md
2. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/기능목록.md
3. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/전체기능목록.md
4. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/01-auth/인증 및 보안 전략.md
5. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/02-collaboration/실시간 협업 및 데이터 무결성.md
6. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/03-wbs/핵심 프로젝트 관리 및 WBS.md
7. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/04-scheduling/고급 스케줄링 및 엔진.md
8. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/05-resource/자원 및 비용 관리.md
9. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/06-ui/사용자 인터페이스.md
10. /Users/sheplim/develop/01_work/01_zero-pm/docs/01-기능정의/07-reporting/보고서 및 분석.md
11. /Users/sheplim/develop/01_work/01_zero-pm/docs/02-데이터설계/데이터설계.md
12. /Users/sheplim/develop/01_work/01_zero-pm/docs/03-구현/구현계획.md
13. /Users/sheplim/develop/01_work/01_zero-pm/docs/03-구현/이벤트-기반-아키텍처-설계.md
14. /Users/sheplim/develop/01_work/01_zero-pm/src/types/database.ts

각 파일 내용을 빠짐없이 반환해줘.`,
  { label: '문서 수집', phase: '문서 수집' }
)

phase('병렬 분석')
log('5개 전문가 관점에서 병렬 분석을 시작합니다...')

const analyses = await parallel([
  () => agent(
    `당신은 시니어 PM(Product Manager)이자 프로젝트 관리 전문가입니다.
아래는 ZeroPM이라는 웹 기반 프로젝트 관리 도구의 기획/설계 문서 전체입니다.

=== 문서 내용 ===
${docContext}
=== 문서 끝 ===

PM 관점에서 아래 항목을 심층 분석하고, 한국어로 마크다운 형식의 분석 보고서를 작성해줘:

1. **요구사항 완성도 분석**
   - 기능 요구사항 (Functional Requirements) 커버리지
   - 비기능 요구사항 (NFR: 성능, 확장성, 가용성, 신뢰성) 정의 현황
   - 우선순위 체계 (MoSCoW, 기능 ID 체계) 적절성

2. **제품 전략 및 로드맵 평가**
   - Phase별 구현 계획의 논리적 순서와 의존성
   - MVP 범위의 적절성 (너무 넓거나 좁은 건 아닌지)
   - 경쟁 제품 대비 차별화 포인트 명확성

3. **사용자 관점 요건**
   - 페르소나 정의 여부
   - 사용자 스토리 또는 유스케이스 문서화 여부
   - 수용 기준(Acceptance Criteria) 정의 여부

4. **추적성(Traceability)**
   - 요구사항 → 설계 → 구현 → 테스트 추적 체계
   - 기능 ID 체계의 완성도 및 일관성

5. **리스크 및 의존성 관리**
   - 외부 의존성 (SVAR Gantt GPLv3, Supabase Free Tier 제약) 리스크
   - 미구현 기능(ALAP, 자원 관리, EVM)의 우선순위 논거
   - Zero-Cost 제약의 현실성과 확장 시나리오

6. **개선 권고사항** (우선순위 High/Medium/Low로 분류)

보고서 형식:
- 마크다운 사용
- 각 섹션에 현황 평가 + 문제점 + 개선 권고 포함
- 구체적이고 실행 가능한 권고사항
- 약 2,000~3,000 단어 분량`,
    { label: 'PM 관점 분석', phase: '병렬 분석' }
  ),

  () => agent(
    `당신은 시니어 UX 디자이너이자 인터랙션 설계 전문가입니다.
아래는 ZeroPM이라는 웹 기반 프로젝트 관리 도구의 기획/설계 문서 전체입니다.

=== 문서 내용 ===
${docContext}
=== 문서 끝 ===

UX/사용자 경험 관점에서 아래 항목을 심층 분석하고, 한국어로 마크다운 형식의 분석 보고서를 작성해줘:

1. **사용자 경험 설계 완성도**
   - 화면 흐름도(User Flow / Screen Flow) 존재 여부
   - 와이어프레임 또는 목업 참조 여부
   - 정보 구조(IA: Information Architecture) 정의 여부
   - 온보딩 플로우 설계 여부

2. **인터랙션 설계 평가**
   - 간트 차트 인터랙션 (드래그, 리사이즈, 링크 생성) UX 설계
   - 오프라인 모드 사용자 경험 설계 (충돌 발생 시 UX)
   - 실시간 협업 UX (다른 사용자 편집 시 피드백, 프레즌스 표시)
   - 에러 상태 및 로딩 상태 UX 설계

3. **접근성(Accessibility) 설계**
   - WCAG 2.1 준수 계획 여부
   - 간트 차트 키보드 내비게이션 설계
   - 색각 이상자를 위한 Critical Path 표시 대안
   - 스크린 리더 지원 계획

4. **반응형 및 다디바이스 지원**
   - 모바일/태블릿 지원 전략
   - 간트 차트 모바일 인터랙션 설계

5. **UX 품질 지표**
   - 사용성 테스트 계획 여부
   - UX 메트릭 정의 (Task Success Rate, Time-on-Task 등)

6. **개선 권고사항** (우선순위 High/Medium/Low로 분류)

보고서 형식:
- 마크다운 사용
- 각 섹션에 현황 평가 + 문제점 + 개선 권고 포함
- 구체적이고 실행 가능한 권고사항
- 약 2,000~3,000 단어 분량`,
    { label: 'UX 관점 분석', phase: '병렬 분석' }
  ),

  () => agent(
    `당신은 시니어 소프트웨어 아키텍트입니다.
아래는 ZeroPM이라는 웹 기반 프로젝트 관리 도구의 기획/설계 문서 전체입니다.

=== 문서 내용 ===
${docContext}
=== 문서 끝 ===

소프트웨어 아키텍처 관점에서 아래 항목을 심층 분석하고, 한국어로 마크다운 형식의 분석 보고서를 작성해줘:

1. **아키텍처 패턴 평가**
   - 이벤트 기반 아키텍처(Event-Driven)의 적절성과 완성도
   - View/Brain 분리 설계의 강점과 약점
   - 싱글턴 EventEmitter 패턴의 리스크 (메모리 누수, 이벤트 순서)
   - 모노레포 vs 마이크로서비스 전략의 현실성

2. **확장성 및 성능 설계**
   - 클라이언트 측 스케줄링 엔진의 확장 한계 (태스크 수, 의존성 수)
   - Web Worker 도입 계획의 현실성
   - 가상화 렌더링(SVAR Gantt)의 성능 한계
   - Supabase Free Tier 제약(200 동시 연결, 메시지 제한)의 실질적 영향

3. **운영 가능성(Operability)**
   - 에러 트래킹 및 모니터링 설계 (Sentry, LogRocket 등)
   - 성능 모니터링 (Core Web Vitals, API 응답 시간)
   - 배포 파이프라인 및 CI/CD 설계
   - 롤백 전략 및 무중단 배포

4. **의존성 리스크**
   - SVAR React Gantt (GPLv3) 의존성 리스크와 대안
   - Yjs + y-websocket 자체 서버 운영 부담
   - Next.js App Router와 SVAR Gantt('use client') 충돌 관리

5. **테스트 가능성(Testability)**
   - 이벤트 기반 아키텍처의 테스트 전략
   - 스케줄링 엔진 테스트 설계
   - E2E 테스트 전략 (Playwright)

6. **API 계층 설계**
   - Next.js Route Handler vs Server Action 사용 전략
   - API 버전 관리 전략

7. **개선 권고사항** (우선순위 High/Medium/Low로 분류)

보고서 형식:
- 마크다운 사용
- 각 섹션에 현황 평가 + 문제점 + 개선 권고 포함
- 구체적이고 실행 가능한 권고사항
- 약 2,000~3,000 단어 분량`,
    { label: '아키텍처 관점 분석', phase: '병렬 분석' }
  ),

  () => agent(
    `당신은 시니어 데이터베이스 설계자 및 백엔드 엔지니어입니다.
아래는 ZeroPM이라는 웹 기반 프로젝트 관리 도구의 기획/설계 문서 전체입니다.

=== 문서 내용 ===
${docContext}
=== 문서 끝 ===

데이터 설계 관점에서 아래 항목을 심층 분석하고, 한국어로 마크다운 형식의 분석 보고서를 작성해줘:

1. **스키마 설계 평가**
   - 정규화 수준 평가 (1NF~3NF 준수 여부)
   - 인덱스 전략 (tasks 조회, links 조회에 필요한 인덱스)
   - JSONB 사용(calendar_settings, baselines.data)의 적절성과 한계
   - tasks 테이블의 CPM 필드 설계 적절성 (early_start, late_finish 등)

2. **계층 구조 설계 평가**
   - 인접 리스트(Adjacency List)의 한계와 대안 (재귀 CTE 성능)
   - 깊은 계층 구조에서의 롤업 계산 성능
   - Closure Table, Nested Set 대안과 비교

3. **동시성 제어 설계**
   - 낙관적 잠금(version 컬럼)의 충돌 시나리오와 해결 전략
   - CRDT(Yjs)와 PostgreSQL 낙관적 잠금의 역할 분리 명확성
   - 트랜잭션 경계 설계의 완성도

4. **마이그레이션 전략**
   - 스키마 변경 시 하위 호환성 전략
   - 대규모 데이터가 있는 상태에서의 ALTER TABLE 전략
   - 마이그레이션 롤백 절차

5. **데이터 보존 및 감사(Audit)**
   - 기준선(Baseline) 이외의 변경 이력 추적 여부
   - 삭제된 태스크/링크 복구 가능성
   - 감사 로그(Audit Log) 설계 여부

6. **성능 최적화**
   - N+1 쿼리 리스크 (tasks + links 동시 조회)
   - 페이지네이션 전략 (대규모 프로젝트에서 모든 태스크 로드 시)
   - 읽기 전용 분석용 뷰(View) 또는 Materialized View 활용 가능성

7. **개선 권고사항** (우선순위 High/Medium/Low로 분류)

보고서 형식:
- 마크다운 사용
- 각 섹션에 현황 평가 + 문제점 + 개선 권고 포함
- 구체적이고 실행 가능한 권고사항
- 약 2,000~3,000 단어 분량`,
    { label: '데이터 관점 분석', phase: '병렬 분석' }
  ),

  () => agent(
    `당신은 시니어 보안 엔지니어 및 컴플라이언스 전문가입니다.
아래는 ZeroPM이라는 웹 기반 프로젝트 관리 도구의 기획/설계 문서 전체입니다.

=== 문서 내용 ===
${docContext}
=== 문서 끝 ===

보안 및 컴플라이언스 관점에서 아래 항목을 심층 분석하고, 한국어로 마크다운 형식의 분석 보고서를 작성해줘:

1. **인증/인가 설계 평가**
   - Supabase Auth + RLS 조합의 보안 강도
   - RBAC(admin/member/observer) 역할 정의의 완성도
   - JWT 토큰 갱신 및 무효화 전략
   - OAuth 구현의 보안 고려사항 (PKCE, state 파라미터 등)

2. **데이터 접근 제어(RLS) 평가**
   - RLS 정책의 완성도 (읽기/쓰기/삭제 정책 커버리지)
   - RLS 우회 가능성 (Service Role Key 노출 위험)
   - 프로젝트 간 데이터 격리 확실성
   - 공유 링크(읽기 전용 링크)의 보안 설계

3. **데이터 보호 및 프라이버시**
   - 개인정보 처리 방침 필요성
   - 민감 데이터 암호화 전략
   - 데이터 거주지(Data Residency) 요건 (Supabase 리전)
   - GDPR/개인정보보호법 준수 고려사항

4. **클라이언트 측 보안**
   - 클라이언트 스케줄링 엔진의 데이터 신뢰성 문제
     (클라이언트에서 계산한 값을 서버에서 재검증하는지)
   - XSS 방어 (React의 기본 방어 + Next.js 설정)
   - CSRF 방어
   - Content Security Policy 설정

5. **API 및 인프라 보안**
   - Supabase Anon Key 노출 리스크와 적절한 사용
   - Next.js 미들웨어의 인증 검증 완성도
   - 환경 변수 관리 전략
   - 공개 저장소(GitHub) 배포 시 보안 고려사항

6. **운영 보안**
   - 보안 패치 및 의존성 업데이트 전략
   - 침해 사고 대응 계획(Incident Response)
   - 보안 테스트(pgTAP 외) 추가 필요성

7. **개선 권고사항** (우선순위 High/Medium/Low로 분류)

보고서 형식:
- 마크다운 사용
- 각 섹션에 현황 평가 + 문제점 + 개선 권고 포함
- 구체적이고 실행 가능한 권고사항
- 약 2,000~3,000 단어 분량`,
    { label: '보안 관점 분석', phase: '병렬 분석' }
  ),
])

const [pmAnalysis, uxAnalysis, archAnalysis, dataAnalysis, securityAnalysis] = analyses.filter(Boolean)

phase('문서 저장')
log('5개 분석 결과를 docs/04-설계리뷰/ 에 저장합니다...')

const BASE = '/Users/sheplim/develop/01_work/01_zero-pm/docs/04-설계리뷰'

await parallel([
  () => agent(
    `다음 내용을 파일 ${BASE}/01-PM관점-분석.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼, 내용 수정 없이.

=== 저장할 내용 ===
${pmAnalysis}
=== 끝 ===`,
    { label: 'PM 분석 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/02-UX관점-분석.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼, 내용 수정 없이.

=== 저장할 내용 ===
${uxAnalysis}
=== 끝 ===`,
    { label: 'UX 분석 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/03-아키텍처관점-분석.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼, 내용 수정 없이.

=== 저장할 내용 ===
${archAnalysis}
=== 끝 ===`,
    { label: '아키텍처 분석 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/04-데이터관점-분석.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼, 내용 수정 없이.

=== 저장할 내용 ===
${dataAnalysis}
=== 끝 ===`,
    { label: '데이터 분석 저장', phase: '문서 저장' }
  ),
  () => agent(
    `다음 내용을 파일 ${BASE}/05-보안관점-분석.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼, 내용 수정 없이.

=== 저장할 내용 ===
${securityAnalysis}
=== 끝 ===`,
    { label: '보안 분석 저장', phase: '문서 저장' }
  ),
])

phase('종합 보고서')
log('5개 분석을 종합한 마스터 보고서를 생성합니다...')

const summaryReport = await agent(
  `당신은 수석 PM 컨설턴트입니다. 다음은 ZeroPM 프로젝트에 대한 5개 관점의 전문가 분석 결과입니다. 이를 종합하여 경영진 및 개발팀을 위한 설계 리뷰 종합 보고서를 한국어 마크다운으로 작성해줘.

=== PM 관점 분석 ===
${pmAnalysis}

=== UX 관점 분석 ===
${uxAnalysis}

=== 아키텍처 관점 분석 ===
${archAnalysis}

=== 데이터 관점 분석 ===
${dataAnalysis}

=== 보안 관점 분석 ===
${securityAnalysis}

종합 보고서 구조:
# ZeroPM 설계 리뷰 종합 보고서
(분석 일자 명시)

## Executive Summary (경영진 요약)
- 전체 설계 성숙도 평가 (점수 또는 등급)
- 가장 중요한 강점 3개
- 가장 시급한 개선사항 3개
- 즉시 조치 필요 리스크 여부

## 종합 강점 분석
각 관점에서 공통적으로 평가된 강점

## 종합 개선 필요 사항
우선순위별로 정리 (각 항목: 관점, 문제, 영향도, 권고 조치)

### 🔴 즉시 조치 (High Priority)
### 🟡 단기 개선 (Medium Priority)  
### 🟢 중장기 개선 (Low Priority)

## 관점별 요약 테이블
| 관점 | 성숙도 | 핵심 강점 | 주요 개선사항 |
|------|--------|----------|-------------|
| PM/기획 | | | |
| UX/설계 | | | |
| 아키텍처 | | | |
| 데이터 | | | |
| 보안 | | | |

## 권고 로드맵
단계별 개선 계획 (3개월/6개월/12개월)

## 결론

분량: 약 2,000~3,000 단어`,
  { label: '종합 보고서 생성', phase: '종합 보고서' }
)

await agent(
  `다음 내용을 파일 ${BASE}/00-설계-리뷰-종합보고서.md 에 Write 툴로 저장해줘. 파일을 그대로 저장하면 돼.

=== 저장할 내용 ===
${summaryReport}
=== 끝 ===`,
  { label: '종합 보고서 저장', phase: '종합 보고서' }
)

log('모든 분석 완료! docs/04-설계리뷰/ 에 6개 문서가 저장되었습니다.')
return { status: 'complete', files: ['00-설계-리뷰-종합보고서.md', '01-PM관점-분석.md', '02-UX관점-분석.md', '03-아키텍처관점-분석.md', '04-데이터관점-분석.md', '05-보안관점-분석.md'] }
