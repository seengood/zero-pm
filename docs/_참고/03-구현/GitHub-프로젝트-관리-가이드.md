# GitHub 프로젝트 관리 가이드

## 📌 개요

ZeroPM 프로젝트를 GitHub Issues와 Projects를 활용하여 체계적으로 관리하는 방법을 안내합니다.

## 🎯 관리 전략

### 1. GitHub Issues 활용

#### Issue 라벨 체계

```
타입 라벨:
- epic: 큰 단위의 작업 (Phase 단위)
- feature: 새로운 기능 구현
- enhancement: 기존 기능 개선
- bug: 버그 수정
- docs: 문서 작업
- test: 테스트 추가/수정

우선순위 라벨:
- priority: high
- priority: medium
- priority: low

상태 라벨:
- status: planning
- status: in-progress
- status: review
- status: blocked

Phase 라벨:
- phase-1: Foundation
- phase-2: Scheduling Engine
- phase-3: Gantt UI
- phase-4: Advanced PM
- phase-5: Resource & Cost
```

#### Issue 템플릿

**Feature Request Template**:
```markdown
## 📝 Feature Description
간단한 기능 설명

## 🎯 Goal
이 기능으로 달성하고자 하는 목표

## 📋 Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## 🔗 Related Issues
- Relates to #
- Blocks #
- Blocked by #

## 📚 References
관련 문서나 참고 자료
```

**Bug Report Template**:
```markdown
## 🐛 Bug Description
버그에 대한 간단한 설명

## 📍 Steps to Reproduce
1. 
2. 
3. 

## 🔍 Expected Behavior
예상되는 동작

## 🚨 Actual Behavior
실제 발생한 동작

## 🖼️ Screenshots
스크린샷 (선택사항)

## 🌍 Environment
- OS: 
- Browser: 
- Version: 
```

### 2. GitHub Projects (Kanban Board)

#### 보드 구조

```
📊 ZeroPM Development Board

Columns:
1. 📥 Backlog
   - 아직 시작하지 않은 작업
   - 우선순위가 낮은 작업

2. 🎯 Ready
   - 다음에 작업할 준비가 된 항목
   - 의존성이 해결된 작업

3. 🔄 In Progress
   - 현재 진행 중인 작업
   - WIP (Work In Progress) 제한: 3개

4. 👀 Review
   - 코드 리뷰 대기 중
   - 테스트 검증 중

5. ✅ Done
   - 완료된 작업
   - 배포된 기능
```

#### 자동화 규칙 (GitHub Actions)

```yaml
# .github/workflows/project-automation.yml
name: Project Automation

on:
  issues:
    types: [opened, closed, reopened]
  pull_request:
    types: [opened, closed, reopened]

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - name: Add issue to project
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/seengood/projects/1
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📋 현재 작업 기반 Issues 제안

### Epic Issues

#### #1 [Epic] Phase 3: Gantt UI Implementation
```markdown
## Goal
SVAR React Gantt를 활용한 고성능 간트 차트 UI 구현

## Progress
- [x] SVAR React Gantt 통합
- [x] Supabase 데이터 연동 (useGanttData)
- [x] Task CRUD 기본 구현
- [ ] Optimistic UI 패턴 구현
- [ ] Soft Lock (Presence) 통합
- [ ] CPM 엔진 통합
- [ ] Critical Path 시각화

## Related Issues
- #4 Optimistic UI Pattern
- #5 Soft Lock Implementation
- #6 CPM Engine Integration
- #7 Critical Path Visualization

## Labels
`epic`, `phase-3`, `priority: high`
```

#### #2 [Epic] Phase 4: Advanced PM Features
```markdown
## Goal
엔터프라이즈급 PM 기능 구현

## Tasks
- [ ] Task Roll-up (Summary Tasks)
- [ ] Custom Task Types
- [ ] Baseline Management
- [ ] Interim Plans
- [ ] WBS Code Generation
- [ ] Task Notes & Attachments

## Labels
`epic`, `phase-4`, `priority: medium`
```

#### #3 [Epic] Phase 5: Resource & Cost Management
```markdown
## Goal
자원 관리 및 비용 추적 기능 구현

## Tasks
- [ ] Resource Assignment UI
- [ ] Resource Conflict Detection
- [ ] Heuristic Leveling
- [ ] EVM (Earned Value Management) Analysis
- [ ] Cost Tracking Dashboard
- [ ] Resource Utilization Chart

## Labels
`epic`, `phase-5`, `priority: low`
```

### Feature Issues

#### #4 [Feature] Optimistic UI Pattern Implementation
```markdown
## Description
Task 편집 시 즉각적인 UI 업데이트를 제공하고, 백그라운드에서 Supabase 동기화

## Goal
- 사용자 경험 향상 (즉각적인 피드백)
- 네트워크 지연 시에도 부드러운 UI

## Implementation Plan
1. Local state 즉시 업데이트
2. Supabase 비동기 저장
3. 에러 발생 시 롤백
4. 낙관적 잠금 (version 필드) 활용

## Files to Modify
- `src/hooks/useGanttData.ts`
- `src/components/gantt/TaskEditor.tsx`

## Acceptance Criteria
- [ ] Task 편집 시 UI가 즉시 업데이트됨
- [ ] 네트워크 에러 시 이전 상태로 롤백됨
- [ ] 버전 충돌 시 사용자에게 알림

## Labels
`feature`, `phase-3`, `priority: high`
```

#### #5 [Feature] Soft Lock with Supabase Presence
```markdown
## Description
Supabase Presence를 활용하여 다른 사용자가 편집 중인 Task를 시각적으로 표시

## Goal
- 동시 편집 충돌 방지
- Google Docs 스타일 협업 경험

## Implementation Plan
1. Supabase Presence 채널 생성
2. Task 편집 시작 시 Presence 브로드캐스트
3. 다른 사용자의 Presence 수신 및 UI 표시
4. 편집 종료 시 Presence 제거

## Files to Create/Modify
- `src/hooks/usePresence.ts` (새로 생성)
- `src/components/gantt/GanttChart.tsx`
- `src/components/gantt/gantt.css`

## Acceptance Criteria
- [ ] 다른 사용자가 편집 중인 Task가 하이라이트됨
- [ ] 사용자 이름/아바타가 표시됨
- [ ] 편집 완료 시 하이라이트 제거됨

## Labels
`feature`, `phase-3`, `priority: high`
```

#### #6 [Feature] CPM Engine Integration with Gantt
```markdown
## Description
Task 변경 시 CPM 엔진을 자동 실행하여 계산된 날짜를 Gantt에 반영

## Goal
- 드래그 앤 드롭 시 자동 재계산
- Critical Path 실시간 업데이트

## Implementation Plan
1. Task/Link 변경 감지
2. Web Worker에서 CPM 계산 실행
3. 계산 결과를 Supabase에 저장
4. Gantt UI 업데이트

## Files to Modify
- `src/hooks/useGanttData.ts`
- `src/hooks/useScheduler.ts`
- `src/components/gantt/GanttChart.tsx`

## Acceptance Criteria
- [ ] Task duration 변경 시 자동 재계산
- [ ] Link 추가/삭제 시 자동 재계산
- [ ] 계산 중 로딩 인디케이터 표시
- [ ] 순환 참조 감지 시 에러 표시

## Labels
`feature`, `phase-3`, `priority: high`
```

#### #7 [Feature] Critical Path Visualization
```markdown
## Description
CPM 계산 결과를 기반으로 Critical Path를 Gantt 차트에 시각화

## Goal
- 프로젝트 핵심 경로 식별
- 일정 지연 위험 요소 파악

## Implementation Plan
1. CPM 계산 결과에서 `is_critical` 플래그 확인
2. Critical Task를 빨간색으로 하이라이트
3. Critical Link를 굵은 선으로 표시
4. Total Float 정보 툴팁 표시

## Files to Modify
- `src/components/gantt/GanttChart.tsx`
- `src/components/gantt/gantt.css`

## Acceptance Criteria
- [ ] Critical Task가 빨간색으로 표시됨
- [ ] Critical Link가 굵은 선으로 표시됨
- [ ] Task hover 시 Float 정보 표시
- [ ] Critical Path 토글 버튼 추가

## Labels
`feature`, `phase-3`, `priority: medium`
```

## 🚀 시작하기

### 1. GitHub에서 Issues 생성

위의 Epic/Feature Issues를 GitHub에 직접 생성합니다:

1. https://github.com/seengood/zero-pm/issues 접속
2. "New issue" 클릭
3. 위의 템플릿 내용 복사/붙여넣기
4. 적절한 라벨 추가
5. "Submit new issue" 클릭

### 2. GitHub Projects 생성

1. https://github.com/seengood/zero-pm/projects 접속
2. "New project" 클릭
3. "Board" 템플릿 선택
4. 프로젝트 이름: "ZeroPM Development"
5. 컬럼 구성:
   - Backlog
   - Ready
   - In Progress
   - Review
   - Done

### 3. Issues를 Project에 추가

1. 생성한 Issues를 Project Board로 드래그
2. 현재 작업 중인 항목은 "In Progress"로 이동
3. 다음 작업은 "Ready"로 이동
4. 장기 계획은 "Backlog"에 유지

## 📊 진행 상황 추적

### Milestones 활용

```
🎯 Milestone: v0.1.0 - MVP Release
- Due Date: 2025-12-31
- Issues: #4, #5, #6, #7
- Progress: 60%

🎯 Milestone: v0.2.0 - Advanced Features
- Due Date: 2026-01-31
- Issues: #2 (Epic)
- Progress: 0%

🎯 Milestone: v1.0.0 - Production Ready
- Due Date: 2026-03-31
- Issues: #3 (Epic)
- Progress: 0%
```

## 🔄 워크플로우

### 일반적인 개발 프로세스

```
1. Issue 생성
   ↓
2. Project Board의 "Ready"로 이동
   ↓
3. 작업 시작 시 "In Progress"로 이동
   ↓
4. Feature Branch 생성 (feature/#4-optimistic-ui)
   ↓
5. 개발 및 커밋
   ↓
6. Pull Request 생성 (Closes #4)
   ↓
7. "Review" 컬럼으로 자동 이동
   ↓
8. 코드 리뷰 및 테스트
   ↓
9. Merge 후 "Done"으로 자동 이동
   ↓
10. Issue 자동 Close
```

## 💡 팁

### Issue 참조

커밋 메시지에서 Issue 참조:
```bash
git commit -m "feat: implement optimistic UI pattern (#4)"
git commit -m "fix: resolve RLS recursion issue (closes #8)"
```

### Branch 네이밍

```
feature/#4-optimistic-ui
bugfix/#8-rls-recursion
docs/#9-api-documentation
```

### Pull Request 템플릿

```markdown
## 🎯 Related Issue
Closes #4

## 📝 Changes
- Implemented optimistic UI pattern
- Added rollback on error
- Updated useGanttData hook

## ✅ Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes

## 🖼️ Screenshots
(if applicable)
```

## 📚 참고 자료

- [GitHub Issues 공식 문서](https://docs.github.com/en/issues)
- [GitHub Projects 공식 문서](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)

---

**작성일**: 2025-12-01  
**작성자**: Antigravity AI Assistant
