# Phase 3: Core UI Implementation Plan

## Goal
데이터와 스케줄링 엔진 결과를 시각화하는 핵심 UI를 구현합니다. SVAR React Gantt를 사용하여 고성능 Gantt 차트를 제공하고, 가상화된 데이터 그리드를 통해 대량의 데이터를 효율적으로 처리합니다.

## Technical Overview

### Core Components
1.  **Gantt Chart Component** - `@svar-ui/react-gantt` 기반의 시각화
2.  **Data Grid** - Task 목록 및 속성 편집 (Gantt와 동기화)
3.  **Toolbar & Controls** - 줌, 필터, 보기 모드 전환
4.  **Data Sync Layer** - Supabase <-> Local State <-> Scheduling Engine 동기화

## Implementation Steps

### Step 1: Gantt Component Setup
**Goal**: SVAR React Gantt를 프로젝트에 통합하고 기본 렌더링을 확인합니다.

- [ ] Install & Configure `@svar-ui/react-gantt`
- [ ] Create `src/components/gantt/GanttChart.tsx`
- [ ] Implement basic data loading (Mock data first)

### Step 2: Data Integration (Supabase -> Gantt)
**Goal**: Supabase에서 Task와 Link 데이터를 가져와 Gantt 차트에 표시합니다.

- [ ] Create `useGanttData` hook
- [ ] Fetch Tasks and Links from Supabase
- [ ] Transform DB data to Gantt format
- [ ] Handle real-time updates (Subscription)

### Step 3: Scheduling Engine Integration
**Goal**: Gantt 차트의 변경 사항을 스케줄링 엔진에 반영하고, 계산된 결과를 다시 UI에 업데이트합니다.

- [ ] Integrate `useScheduler` hook
- [ ] Trigger calculation on task change (drag & drop, edit)
- [ ] Update Gantt with calculated dates (ES, EF, LS, LF)
- [ ] Visualize Critical Path

### Step 4: Task CRUD & Interaction
**Goal**: UI에서 Task를 생성, 수정, 삭제하고 의존성을 관리합니다.

- [ ] Implement Task Creation (Context Menu / Toolbar)
- [ ] Implement Task Editing (Inline / Modal)
- [ ] Implement Link Creation (Drag between tasks)
- [ ] Implement Optimistic UI updates for immediate feedback

### Step 5: Virtualization & Performance
**Goal**: 대량의 데이터(1000+ Tasks)에서도 부드러운 스크롤과 렌더링을 보장합니다.

- [ ] Verify SVAR Gantt's built-in virtualization
- [ ] Optimize React rendering (memoization)
- [ ] Implement "Soft Locking" (Presence) to prevent concurrent edit conflicts

## Key Files structure
```
src/
  components/
    gantt/
      GanttChart.tsx       # Main Gantt Wrapper
      GanttToolbar.tsx     # Zoom, Filter controls
      TaskEditor.tsx       # Task Edit Modal/Panel
  hooks/
    useGanttData.ts        # Data fetching & transformation
    useGanttActions.ts     # CRUD operations
  types/
    gantt.ts               # UI specific types
```

## Dependencies
- `@svar-ui/react-gantt`
- `src/lib/scheduling/*` (Phase 2 Engine)
- `src/lib/supabase/*` (Phase 1 Data Layer)
