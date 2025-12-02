trigger: always_on

rules:
  # 1. 코드 스타일 및 린팅 규칙 (Code Style & Linting)
  - name: "Code Style & Linting"
    glob: "**/*.{ts,tsx,js,jsx}"
    description: "일관된 코드 스타일과 품질을 유지하기 위한 규칙입니다."
    instructions:
      - "프로젝트 루트의 `eslint.config.mjs` 설정을 준수해야 합니다."
      - "`next lint` 명령어를 실행하여 린트 오류가 없는지 확인합니다."
      - "TypeScript의 엄격한 타입 검사(`strict: true`)를 준수하고, `any` 타입 사용을 지양합니다."
      - "단, 테스트 파일(`**/*.test.ts`, `**/*.test.tsx`)에서는 필요 시 `any` 타입 사용을 허용합니다."
      - "들여쓰기는 2칸 공백(Space)을 사용합니다."
      - "문자열은 작은 따옴표(')를 우선 사용합니다 (JSX 속성 제외)."
      - "문장 끝에 세미콜론(;)을 사용하지 않습니다 (프로젝트 관례 확인 필요)."
      - "사용하지 않는 변수나 import는 제거합니다."
      - "컴포넌트는 함수형 컴포넌트와 Hooks 패턴을 사용합니다."
      - "파일 및 폴더명은 `kebab-case` 또는 `PascalCase` 등 프로젝트 규칙을 따릅니다."

  # 2. CSS 및 스타일 관리 (CSS & Styling)
  - name: "CSS & Styling Management"
    glob: "**/*.{css,scss,tsx,jsx}"
    description: "CSS 파일 관리 및 외부 라이브러리 스타일 처리 규칙입니다."
    instructions:
      - "**SVAR Gantt CSS 처리 규칙**:"
        - "SVAR React Gantt 라이브러리의 CSS는 `node_modules`에서 직접 import하지 않습니다."
        - "반드시 `src/styles/gantt-svar.css`로 복사하여 사용합니다."
        - "복사 명령어: `cp node_modules/@svar-ui/react-gantt/dist/index.css src/styles/gantt-svar.css`"
        - "컴포넌트에서 import 시: `import '@/styles/gantt-svar.css'`"
      - "**Turbopack CSS 파싱 이슈 대응**:"
        - "Next.js 16의 Turbopack은 압축된 CSS 파일의 특정 선택자를 파싱하지 못하는 이슈가 있습니다."
        - "증상: `Parsing CSS source code failed - Invalid empty selector` 오류"
        - "해결: 압축된 CSS 파일을 `src/styles/` 디렉토리로 복사하여 사용"
        - "`node_modules`에서 직접 import하는 방식은 사용하지 않습니다."
      - "**빌드 전 확인 사항**:"
        - "`npm run build` 실행 전 CSS 파일이 올바른 경로에 있는지 확인합니다."
        - "CSS 파싱 오류 발생 시 위의 복사 명령어를 재실행합니다."
      - "**프로젝트 CSS 구조**:"
        - "글로벌 스타일: `src/app/globals.css`"
        - "외부 라이브러리 스타일: `src/styles/` (예: `gantt-svar.css`)"
        - "컴포넌트별 스타일: CSS Modules 또는 Tailwind CSS 사용 (프로젝트 방침에 따름)"

  # 3. 단위 테스트 (Unit Tests) - 로직 중심
  - name: "Unit Test Logic"
    glob: "src/lib/**/*.ts" # 핵심 로직이 위치한 lib 폴더 대상
    description: "비즈니스 로직에 대한 단위 테스트를 작성하고 커버리지를 확인합니다."
    instructions:
      - "테스트 파일은 원본 파일과 동일한 디렉토리 내 `__tests__` 폴더에 위치해야 합니다."
      - "테스트 파일명은 `*.test.ts` 형식을 따라야 합니다."
      - "Jest를 사용하여 테스트 케이스를 작성합니다."
      - "외부 의존성이 있는 경우 `jest.mock` 등을 사용하여 Mocking합니다."
      - "모든 공개 함수(public method)와 주요 로직 분기에 대한 테스트 케이스를 포함해야 합니다."
      - "테스트 커버리지(Statement, Branch, Function, Line)가 100%인지 확인합니다."

  # 4. UI 컴포넌트 테스트 (Component Tests)
  - name: "UI Component Test"
    glob: "src/components/**/*.tsx" # UI 컴포넌트 폴더 대상 (가정)
    description: "React 컴포넌트에 대한 렌더링 및 상호작용 테스트를 작성합니다."
    instructions:
      - "테스트 파일은 원본 파일과 동일한 디렉토리 내 `__tests__` 폴더 또는 `*.test.tsx` 형식으로 위치합니다."
      - "React Testing Library (`@testing-library/react`)를 사용하여 테스트합니다."
      - "`@testing-library/jest-dom`의 매처(예: `toBeInTheDocument`, `toHaveTextContent`)를 사용합니다."
      - "사용자 상호작용 테스트:"
        - "**권장**: `@testing-library/user-event`를 사용하여 실제 사용자 행동을 시뮬레이션합니다."
        - "**현재**: 기존 테스트는 `fireEvent`를 사용 중이며, 점진적으로 `userEvent`로 마이그레이션합니다."
        - "**마이그레이션 계획**: 새로운 테스트는 `userEvent`를 사용하고, 기존 테스트는 리팩토링 시 업데이트합니다."
      - "컴포넌트의 주요 상태 변화와 렌더링 결과를 검증합니다."
      - "스냅샷 테스트보다는 동작 기반 테스트를 지향합니다."

  # 5. 커스텀 훅 테스트 (Hook Tests)
  - name: "Custom Hook Test"
    glob: "src/hooks/**/*.ts" # 훅 폴더 대상
    description: "커스텀 훅의 동작을 테스트합니다."
    instructions:
      - "`@testing-library/react`의 `renderHook`을 사용하여 훅을 테스트합니다."
      - "훅의 초기 상태와 업데이트 후 상태를 검증합니다."
      - "비동기 로직이 포함된 경우 `waitFor` 등을 사용하여 처리합니다."

  # 6. 페이지/통합 테스트 (Integration Tests) - 선택 사항
  - name: "Page/Integration Test"
    glob: "src/app/**/*.tsx" # 페이지 컴포넌트 대상
    description: "주요 페이지의 통합 동작을 테스트합니다."
    instructions:
      - "jsdom 환경에서 페이지 렌더링 및 주요 흐름을 테스트합니다."
      - "서버 컴포넌트 테스트 시 필요한 모킹(Mocking)을 적용합니다."

  # 7. Supabase 및 보안 테스트 (Supabase & Security Tests)
  - name: "Supabase & Security Tests"
    glob: "supabase/tests/**/*.sql" # pgTAP 테스트 파일 경로
    description: "Supabase의 RLS 정책 및 데이터베이스 로직을 검증합니다."
    instructions:
      - "Supabase 로컬 개발 환경(`supabase start`)에서 테스트를 실행합니다."
      - "pgTAP을 사용하여 RLS 정책(Row Level Security)이 올바르게 적용되는지 확인합니다."
      - "인증된 사용자(authenticated)와 익명 사용자(anon)의 데이터 접근 권한을 각각 테스트합니다."
      - "트리거(Trigger) 및 데이터베이스 함수(RPC)의 동작을 검증합니다."
      - "클라이언트 측 코드(`src/lib/supabase`) 테스트 시 `supabase-js` 클라이언트를 모킹(Mocking)하여 테스트합니다."

  # 8. 공통 커버리지 규칙
  - name: "Coverage Enforcement"
    glob: "src/**/*.{ts,tsx}" # src 폴더 내 모든 소스 코드 대상
    description: "모든 테스트 대상 파일의 커버리지를 최대한 높게 유지합니다 (목표: 100%)."
    instructions:
      - "테스트 실행 후 커버리지 리포트를 확인합니다 (`npm test -- --coverage`)."
      - "**목표 커버리지**:"
        - "비즈니스 로직 (lib/**/*.ts): 98% 이상 (목표 100%)"
        - "UI 컴포넌트 (components/**/*.tsx): 90% 이상"
        - "커스텀 훅 (hooks/**/*.ts): 95% 이상"
      - "커버리지가 목표 미만인 경우, 누락된 분기나 라인에 대한 테스트 케이스를 추가합니다."
      - "**커버리지 예외 사항** (다음의 경우 100% 미만 허용):"
        - "타입 정의 파일 (*.d.ts)"
        - "설정 파일 (*.config.ts, *.config.js)"
        - "외부 라이브러리 래퍼 컴포넌트의 일부 이벤트 핸들러 (예: Gantt 차트 초기화 콜백)"
        - "에러 바운더리의 에러 상태 (의도적으로 에러를 발생시키기 어려운 경우)"
        - "개발 환경 전용 디버깅 코드 (console.log 등)"
      - "예외 사항은 코드 주석으로 명시하거나 `jest.config.ts`의 `coveragePathIgnorePatterns`에 추가합니다."
      - "예외 사항에 대해서는 코드 리뷰 시 정당성을 검토합니다."
