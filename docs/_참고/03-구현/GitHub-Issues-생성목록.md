# ZeroPM GitHub Issues 생성 목록

이 문서는 현재 개발 상황을 기반으로 GitHub에 생성할 Issues 목록입니다.
각 섹션의 내용을 복사하여 GitHub Issues에 붙여넣으세요.

---

## Epic Issues

### Issue #1: [Epic] Phase 3: Gantt UI Implementation

**Title**: `[Epic] Phase 3: Gantt UI Implementation`

**Labels**: `epic`, `phase-3`, `priority: high`

**Content**:
```markdown
## 🎯 Epic Goal
SVAR React Gantt를 활용한 고성능 간트 차트 UI를 구현하고, 실시간 협업 기능을 제공합니다.

## 📖 Background
Phase 1, 2에서 데이터베이스와 스케줄링 엔진을 구현했습니다. 이제 사용자가 직접 사용할 수 있는 UI를 구현하여 ZeroPM의 핵심 가치를 제공해야 합니다.

## 📋 Features
- [x] SVAR React Gantt 통합
- [x] Supabase 데이터 연동 (useGanttData Hook)
- [x] Task CRUD 기본 구현 (TaskEditor Modal)
- [ ] Optimistic UI 패턴 구현 (#4)
- [ ] Soft Lock with Supabase Presence (#5)
- [ ] CPM 엔진 통합 (#6)
- [ ] Critical Path 시각화 (#7)
- [ ] 드래그 앤 드롭 최적화
- [ ] 대량 데이터 성능 테스트 (1000+ tasks)

## 🔗 Related Issues
- #4 Optimistic UI Pattern Implementation
- #5 Soft Lock with Supabase Presence
- #6 CPM Engine Integration with Gantt
- #7 Critical Path Visualization

## 📊 Progress Tracking
- [x] Planning
- [x] Design
- [x] Implementation (60%)
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

## 🎯 Success Criteria
- [ ] Task 생성/수정/삭제가 부드럽게 동작
- [ ] 여러 사용자가 동시에 편집 가능 (충돌 없음)
- [ ] CPM 계산 결과가 실시간으로 반영
- [ ] Critical Path가 시각적으로 명확하게 표시
- [ ] 1000개 이상의 Task를 60FPS로 렌더링

## 📅 Timeline
- **Start Date**: 2025-11-27
- **Target Date**: 2025-12-15
- **Current Progress**: 60%

## 📚 References
- [Phase 3 구현 계획](../docs/03-구현/Phase3-UI-구현계획.md)
- [작업 이력](../docs/03-구현/작업이력.md)
- [SVAR React Gantt 문서](https://docs.svar.dev/gantt/react/)
```

---

### Issue #2: [Epic] Phase 4: Advanced PM Features

**Title**: `[Epic] Phase 4: Advanced PM Features`

**Labels**: `epic`, `phase-4`, `priority: medium`

**Content**:
```markdown
## 🎯 Epic Goal
MS Project 수준의 고급 프로젝트 관리 기능을 구현하여 엔터프라이즈 사용자의 요구를 충족합니다.

## 📖 Background
Phase 3에서 기본적인 Gantt UI를 완성했습니다. 이제 Summary Tasks, Baseline, WBS 등 전문적인 PM 기능을 추가하여 상용 도구와 경쟁할 수 있는 수준으로 발전시킵니다.

## 📋 Features
- [ ] Task Roll-up (Summary Tasks)
  - 하위 Task의 날짜/진행률 자동 집계
  - 계층 구조 시각화
- [ ] Custom Task Types
  - Milestone, Summary, Task 구분
  - 아이콘 및 스타일 차별화
- [ ] Baseline Management
  - 최대 11개 Baseline 저장
  - Baseline vs Actual 비교 뷰
- [ ] Interim Plans
  - 최대 10개 중간 계획 저장
  - 계획 간 비교 분석
- [ ] WBS Code Generation
  - 자동 WBS 코드 생성
  - 커스텀 WBS 구조 지원
- [ ] Task Notes & Attachments
  - Task별 메모 작성
  - 파일 첨부 기능

## 🔗 Related Issues
- TBD (세부 이슈는 Phase 3 완료 후 생성)

## 📊 Progress Tracking
- [ ] Planning
- [ ] Design
- [ ] Implementation
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

## 🎯 Success Criteria
- [ ] Summary Task가 하위 Task를 정확하게 집계
- [ ] Baseline 비교 뷰가 직관적으로 표시
- [ ] WBS 코드가 자동으로 생성되고 수정 가능
- [ ] Task에 파일 첨부 및 메모 작성 가능

## 📅 Timeline
- **Start Date**: 2025-12-16 (예정)
- **Target Date**: 2026-01-31
- **Current Progress**: 0%

## 📚 References
- [기능 정의 문서](../docs/01-기능정의/)
```

---

### Issue #3: [Epic] Phase 5: Resource & Cost Management

**Title**: `[Epic] Phase 5: Resource & Cost Management`

**Labels**: `epic`, `phase-5`, `priority: low`

**Content**:
```markdown
## 🎯 Epic Goal
자원 관리 및 비용 추적 기능을 구현하여 프로젝트의 인력, 장비, 예산을 효율적으로 관리합니다.

## 📖 Background
Phase 4까지 일정 관리 기능을 완성했습니다. 이제 자원 할당, 충돌 감지, 비용 추적 등 종합적인 프로젝트 관리 기능을 제공합니다.

## 📋 Features
- [ ] Resource Assignment UI
  - Task에 자원 할당
  - 할당률(%) 설정
- [ ] Resource Conflict Detection
  - 자원 과할당 감지
  - 충돌 알림 및 시각화
- [ ] Heuristic Leveling
  - 자원 평준화 알고리즘
  - 자동 일정 조정
- [ ] EVM Analysis
  - Earned Value Management
  - PV, EV, AC 계산
  - CPI, SPI 지표 제공
- [ ] Cost Tracking Dashboard
  - 예산 vs 실제 비용
  - 비용 추이 차트
- [ ] Resource Utilization Chart
  - 자원별 활용률 시각화
  - 히스토그램 뷰

## 🔗 Related Issues
- TBD (세부 이슈는 Phase 4 완료 후 생성)

## 📊 Progress Tracking
- [ ] Planning
- [ ] Design
- [ ] Implementation
- [ ] Testing
- [ ] Documentation
- [ ] Deployment

## 🎯 Success Criteria
- [ ] 자원 과할당이 자동으로 감지됨
- [ ] Leveling 알고리즘이 충돌을 해결
- [ ] EVM 지표가 정확하게 계산됨
- [ ] 비용 대시보드가 실시간으로 업데이트

## 📅 Timeline
- **Start Date**: 2026-02-01 (예정)
- **Target Date**: 2026-03-31
- **Current Progress**: 0%

## 📚 References
- [기능 정의 문서](../docs/01-기능정의/)
- [데이터베이스 스키마](../supabase/schema.sql)
```

---

## Feature Issues (Phase 3)

### Issue #4: [Feature] Optimistic UI Pattern Implementation

**Title**: `[Feature] Optimistic UI Pattern Implementation`

**Labels**: `feature`, `phase-3`, `priority: high`

**Content**:
```markdown
## 📝 Feature Description
Task 편집 시 즉각적인 UI 업데이트를 제공하고, 백그라운드에서 Supabase에 동기화합니다.

## 🎯 Goal
- 사용자 경험 향상 (즉각적인 피드백)
- 네트워크 지연 시에도 부드러운 UI
- 에러 발생 시 자동 롤백

## 💡 Motivation
현재는 Supabase 저장이 완료될 때까지 기다린 후 UI가 업데이트됩니다 (1-2초 지연). 
Optimistic UI 패턴을 적용하면 즉시 UI가 업데이트되어 사용자 경험이 크게 향상됩니다.

## 📋 Implementation Tasks
- [ ] Local state 즉시 업데이트 로직 구현
- [ ] Supabase 비동기 저장 처리
- [ ] 에러 발생 시 롤백 메커니즘 구현
- [ ] 낙관적 잠금 (version 필드) 활용
- [ ] 버전 충돌 시 사용자 알림 UI
- [ ] 테스트 케이스 작성

## 🔗 Related Issues
- Part of #1 (Epic: Phase 3)

## ✅ Acceptance Criteria
- [ ] Task 이름 변경 시 UI가 즉시 업데이트됨
- [ ] Task duration 변경 시 UI가 즉시 업데이트됨
- [ ] 네트워크 에러 시 이전 상태로 롤백됨
- [ ] 버전 충돌 시 사용자에게 명확한 알림
- [ ] 롤백 시 사용자에게 에러 메시지 표시

## 📚 References
- [useGanttData Hook](../src/hooks/useGanttData.ts)
- [TaskEditor Component](../src/components/gantt/TaskEditor.tsx)
- [Optimistic UI 패턴 설명](https://www.apollographql.com/docs/react/performance/optimistic-ui/)

## 🖼️ Expected Flow
1. 사용자가 Task 이름 변경
2. Local state 즉시 업데이트 → UI 즉시 반영
3. 백그라운드에서 Supabase에 저장
4. 성공: 아무 변화 없음 (이미 UI 업데이트됨)
5. 실패: 이전 상태로 롤백 + 에러 토스트 표시
```

---

### Issue #5: [Feature] Soft Lock with Supabase Presence

**Title**: `[Feature] Soft Lock with Supabase Presence`

**Labels**: `feature`, `phase-3`, `priority: high`

**Content**:
```markdown
## 📝 Feature Description
Supabase Presence를 활용하여 다른 사용자가 편집 중인 Task를 시각적으로 표시합니다.

## 🎯 Goal
- 동시 편집 충돌 방지
- Google Docs 스타일 협업 경험 제공
- 누가 어떤 Task를 편집 중인지 실시간으로 표시

## 💡 Motivation
여러 사용자가 동시에 같은 프로젝트를 편집할 때, 누가 어떤 Task를 편집 중인지 알 수 없으면 충돌이 발생할 수 있습니다. Soft Lock을 구현하여 이를 방지합니다.

## 📋 Implementation Tasks
- [ ] `usePresence` Hook 구현
- [ ] Supabase Presence 채널 생성
- [ ] Task 편집 시작 시 Presence 브로드캐스트
- [ ] 다른 사용자의 Presence 수신 및 상태 관리
- [ ] 편집 중인 Task 하이라이트 UI 구현
- [ ] 사용자 이름/아바타 표시 UI
- [ ] 편집 종료 시 Presence 제거
- [ ] 네트워크 끊김 시 자동 정리

## 🔗 Related Issues
- Part of #1 (Epic: Phase 3)

## ✅ Acceptance Criteria
- [ ] 다른 사용자가 편집 중인 Task가 하이라이트됨
- [ ] 사용자 이름이 Task 옆에 표시됨
- [ ] 여러 사용자가 동시에 다른 Task를 편집 가능
- [ ] 편집 완료 시 하이라이트가 즉시 제거됨
- [ ] 네트워크 끊김 시 30초 후 자동 정리

## 📚 References
- [Supabase Presence 문서](https://supabase.com/docs/guides/realtime/presence)
- [Google Docs 협업 UX](https://www.google.com/docs/about/)

## 🖼️ UI Mockup
```
┌─────────────────────────────────────┐
│ Task Name          │ Duration │ ... │
├─────────────────────────────────────┤
│ 📝 Design UI       │ 5 days   │     │ ← 일반 Task
│ 🔒 Implement API   │ 3 days   │ 👤  │ ← 영삼님이 편집 중
│ 📝 Write Tests     │ 2 days   │     │
└─────────────────────────────────────┘
```
```

---

### Issue #6: [Feature] CPM Engine Integration with Gantt

**Title**: `[Feature] CPM Engine Integration with Gantt`

**Labels**: `feature`, `phase-3`, `priority: high`

**Content**:
```markdown
## 📝 Feature Description
Task 또는 Link 변경 시 CPM 엔진을 자동으로 실행하여 계산된 날짜를 Gantt 차트에 반영합니다.

## 🎯 Goal
- 드래그 앤 드롭 시 자동 재계산
- Critical Path 실시간 업데이트
- 순환 참조 자동 감지 및 차단

## 💡 Motivation
현재 CPM 엔진은 구현되어 있지만 Gantt UI와 통합되지 않았습니다. 
사용자가 Task를 변경할 때마다 자동으로 CPM을 계산하여 프로젝트 일정을 최적화해야 합니다.

## 📋 Implementation Tasks
- [ ] Task/Link 변경 감지 로직 구현
- [ ] Web Worker에서 CPM 계산 트리거
- [ ] 계산 결과를 Supabase에 저장
- [ ] Gantt UI에 계산 결과 반영
- [ ] 계산 중 로딩 인디케이터 표시
- [ ] 순환 참조 감지 시 에러 UI 표시
- [ ] 성능 최적화 (debounce, throttle)

## 🔗 Related Issues
- Part of #1 (Epic: Phase 3)
- Related to #7 (Critical Path Visualization)

## ✅ Acceptance Criteria
- [ ] Task duration 변경 시 자동 재계산
- [ ] Link 추가/삭제 시 자동 재계산
- [ ] 계산 중 로딩 스피너 표시
- [ ] 순환 참조 감지 시 명확한 에러 메시지
- [ ] 1000개 Task 기준 1초 이내 계산 완료

## 📚 References
- [Scheduling Engine](../src/lib/scheduling/engine.ts)
- [useScheduler Hook](../src/hooks/useScheduler.ts)
- [Web Worker](../src/lib/scheduling/worker.ts)

## 🖼️ Expected Flow
1. 사용자가 Task A의 duration을 5일로 변경
2. Optimistic UI로 즉시 반영
3. 백그라운드에서 CPM 계산 시작 (Web Worker)
4. 계산 완료 (ES, EF, LS, LF, Total Float)
5. Supabase에 저장
6. Gantt UI 업데이트 (Critical Path 하이라이트)
```

---

### Issue #7: [Feature] Critical Path Visualization

**Title**: `[Feature] Critical Path Visualization`

**Labels**: `feature`, `phase-3`, `priority: medium`

**Content**:
```markdown
## 📝 Feature Description
CPM 계산 결과를 기반으로 Critical Path를 Gantt 차트에 시각적으로 표시합니다.

## 🎯 Goal
- 프로젝트 핵심 경로 식별
- 일정 지연 위험 요소 파악
- Total Float 정보 제공

## 💡 Motivation
Critical Path는 프로젝트 관리의 핵심 개념입니다. 
어떤 Task가 지연되면 전체 프로젝트가 지연되는지 시각적으로 보여줌으로써 
PM이 우선순위를 결정하는 데 도움을 줍니다.

## 📋 Implementation Tasks
- [ ] CPM 계산 결과에서 `is_critical` 플래그 확인
- [ ] Critical Task를 빨간색으로 하이라이트
- [ ] Critical Link를 굵은 빨간 선으로 표시
- [ ] Task hover 시 Total Float 정보 툴팁 표시
- [ ] Critical Path 토글 버튼 추가 (ON/OFF)
- [ ] CSS 스타일 구현

## 🔗 Related Issues
- Part of #1 (Epic: Phase 3)
- Depends on #6 (CPM Engine Integration)

## ✅ Acceptance Criteria
- [ ] Critical Task가 빨간색으로 명확하게 표시됨
- [ ] Critical Link가 굵은 빨간 선으로 표시됨
- [ ] Task hover 시 "Total Float: 0 days" 표시
- [ ] Non-critical Task hover 시 "Total Float: X days" 표시
- [ ] Critical Path 토글 버튼으로 ON/OFF 가능

## 📚 References
- [CPM Engine](../src/lib/scheduling/engine.ts)
- [Gantt CSS](../src/components/gantt/gantt.css)

## 🖼️ UI Mockup
```
┌─────────────────────────────────────────────────┐
│ [🔴 Critical Path: ON]  [Zoom] [Filter]        │
├─────────────────────────────────────────────────┤
│ Task Name          │ ████████████████           │
│ 🔴 Design UI       │ ██████████ (Critical)      │
│ 📝 Write Docs      │   ████                     │
│ 🔴 Implement API   │      ████████ (Critical)   │
│ 📝 Write Tests     │            ████            │
└─────────────────────────────────────────────────┘

Legend:
🔴 = Critical Task (Total Float = 0)
📝 = Non-critical Task (Total Float > 0)
```
```

---

## 사용 방법

1. **GitHub 저장소 접속**: https://github.com/seengood/zero-pm/issues

2. **Epic Issues 생성** (순서대로):
   - Issue #1: Phase 3 Epic
   - Issue #2: Phase 4 Epic
   - Issue #3: Phase 5 Epic

3. **Feature Issues 생성** (Phase 3 관련):
   - Issue #4: Optimistic UI
   - Issue #5: Soft Lock
   - Issue #6: CPM Integration
   - Issue #7: Critical Path Visualization

4. **라벨 생성** (Settings > Labels):
   - `epic` (보라색)
   - `feature` (초록색)
   - `bug` (빨간색)
   - `phase-3`, `phase-4`, `phase-5` (파란색)
   - `priority: high`, `priority: medium`, `priority: low` (주황색)

5. **Milestone 생성** (Issues > Milestones):
   - `v0.1.0 - MVP Release` (Due: 2025-12-31)
   - `v0.2.0 - Advanced Features` (Due: 2026-01-31)
   - `v1.0.0 - Production Ready` (Due: 2026-03-31)

6. **Project Board 생성**:
   - Projects > New project > Board template
   - Name: "ZeroPM Development"
   - Columns: Backlog, Ready, In Progress, Review, Done

7. **Issues를 Project에 추가**:
   - 각 Issue를 Project Board로 드래그
   - 현재 작업 중: #4, #5, #6 → "In Progress"
   - 다음 작업: #7 → "Ready"
   - 장기 계획: #2, #3 → "Backlog"

---

**생성일**: 2025-12-01  
**작성자**: Antigravity AI Assistant
