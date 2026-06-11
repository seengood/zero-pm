# Phase 2: Scheduling Engine Implementation Plan

## Goal
클라이언트 측에서 실행되는 자체 스케줄링 엔진을 구현하여 MS Project 수준의 자동 일정 계산 기능을 제공합니다.

## Technical Overview

### Core Components
1. **DAG (Directed Acyclic Graph) Modeling** - Task와 Dependency를 그래프로 모델링
2. **CPM (Critical Path Method)** - 임계 경로 분석 및 여유 시간 계산
3. **Business Calendar** - 업무일 기반 일정 계산
4. **Cycle Detection** - 순환 참조 감지 및 차단

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @dagrejs/graphlib
npm install dayjs-business-days
```

**Rationale**:
- `@dagrejs/graphlib`: 그래프 자료구조 및 알고리즘 (위상 정렬, 최단 경로 등)
- `dayjs-business-days`: 업무일 계산 (주말, 공휴일 제외)

---

### Step 2: Create Scheduling Engine Core

**File**: `src/lib/scheduling/engine.ts`

**Responsibilities**:
- Task 및 Link 데이터를 DAG로 변환
- 위상 정렬 (Topological Sort)
- 순환 참조 감지 (Cycle Detection)
- CPM 계산 (Forward/Backward Pass)

**Key Functions**:
```typescript
export class SchedulingEngine {
  // DAG 구축
  buildGraph(tasks: Task[], links: Link[]): Graph
  
  // 순환 참조 감지
  detectCycles(): boolean
  
  // 위상 정렬
  topologicalSort(): string[]
  
  // CPM 계산
  calculateCPM(): CPMResult
  
  // Forward Pass (ES, EF 계산)
  forwardPass(): void
  
  // Backward Pass (LS, LF 계산)
  backwardPass(): void
  
  // 임계 경로 식별
  identifyCriticalPath(): string[]
}
```

---

### Step 3: Business Calendar Integration

**File**: `src/lib/scheduling/calendar.ts`

**Responsibilities**:
- 주말 및 공휴일 정의
- 업무일 기반 날짜 계산
- Duration을 실제 완료일로 변환

**Key Functions**:
```typescript
export class BusinessCalendar {
  constructor(
    weekends: number[], // [0, 6] for Sat/Sun
    holidays: Date[]
  )
  
  // 업무일 추가
  addBusinessDays(startDate: Date, days: number): Date
  
  // 두 날짜 사이의 업무일 계산
  getBusinessDaysBetween(start: Date, end: Date): number
  
  // 업무일 여부 확인
  isBusinessDay(date: Date): boolean
}
```

---

### Step 4: Type Definitions

**File**: `src/types/scheduling.ts`

```typescript
export interface Task {
  id: string
  text: string
  start_date: Date
  duration: number // in days
  constraint_type?: 'MSO' | 'SNET' | 'FNLT' | 'FNET'
  constraint_date?: Date
  
  // CPM Results (calculated)
  early_start?: Date
  early_finish?: Date
  late_start?: Date
  late_finish?: Date
  total_float?: number
  is_critical?: boolean
}

export interface Link {
  id: string
  source: string // task id
  target: string // task id
  type: '0' | '1' | '2' | '3' // FS, SS, FF, SF
  lag: number // in days
}

export interface CPMResult {
  tasks: Map<string, TaskCPMData>
  criticalPath: string[]
  projectDuration: number
}

export interface TaskCPMData {
  es: Date
  ef: Date
  ls: Date
  lf: Date
  totalFloat: number
  isCritical: boolean
}
```

---

### Step 5: CPM Algorithm Implementation

**Forward Pass Logic**:
```typescript
// For each task in topological order:
// ES = max(EF of all predecessors) + lag
// EF = ES + duration (in business days)

for (const taskId of topologicalOrder) {
  const task = tasks.get(taskId)
  const predecessors = getPredecessors(taskId)
  
  if (predecessors.length === 0) {
    task.es = projectStartDate
  } else {
    task.es = max(predecessors.map(p => {
      const link = getLink(p.id, taskId)
      return calculatePredecessorDate(p, link)
    }))
  }
  
  task.ef = calendar.addBusinessDays(task.es, task.duration)
}
```

**Backward Pass Logic**:
```typescript
// For each task in reverse topological order:
// LF = min(LS of all successors) - lag
// LS = LF - duration (in business days)

for (const taskId of reverseTopologicalOrder) {
  const task = tasks.get(taskId)
  const successors = getSuccessors(taskId)
  
  if (successors.length === 0) {
    task.lf = projectEndDate
  } else {
    task.lf = min(successors.map(s => {
      const link = getLink(taskId, s.id)
      return calculateSuccessorDate(s, link)
    }))
  }
  
  task.ls = calendar.subtractBusinessDays(task.lf, task.duration)
  task.totalFloat = daysBetween(task.ls, task.es)
  task.isCritical = task.totalFloat === 0
}
```

---

### Step 6: Dependency Type Handling

**FS (Finish-to-Start)**:
```typescript
// Successor ES = Predecessor EF + lag
successorES = calendar.addBusinessDays(predecessor.ef, link.lag)
```

**SS (Start-to-Start)**:
```typescript
// Successor ES = Predecessor ES + lag
successorES = calendar.addBusinessDays(predecessor.es, link.lag)
```

**FF (Finish-to-Finish)**:
```typescript
// Successor EF = Predecessor EF + lag
// Successor ES = Successor EF - duration
successorEF = calendar.addBusinessDays(predecessor.ef, link.lag)
successorES = calendar.subtractBusinessDays(successorEF, successor.duration)
```

**SF (Start-to-Finish)**:
```typescript
// Successor EF = Predecessor ES + lag
// Successor ES = Successor EF - duration
successorEF = calendar.addBusinessDays(predecessor.es, link.lag)
successorES = calendar.subtractBusinessDays(successorEF, successor.duration)
```

---

### Step 7: Cycle Detection

**Using DFS**:
```typescript
function detectCycle(graph: Graph): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    
    for (const neighbor of graph.successors(nodeId)) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recursionStack.has(neighbor)) {
        return true // Cycle detected
      }
    }
    
    recursionStack.delete(nodeId)
    return false
  }
  
  for (const node of graph.nodes()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true
    }
  }
  
  return false
}
```

---

## Testing Strategy

### Unit Tests
1. **DAG Construction**: Task와 Link 데이터가 올바르게 그래프로 변환되는지 확인
2. **Cycle Detection**: 순환 참조가 있는 경우 감지되는지 확인
3. **Topological Sort**: 올바른 순서로 정렬되는지 확인
4. **CPM Calculation**: 간단한 예제로 ES, EF, LS, LF 계산 검증
5. **Business Calendar**: 주말/공휴일이 올바르게 제외되는지 확인

### Integration Tests
1. **End-to-End CPM**: 실제 프로젝트 데이터로 전체 CPM 계산 실행
2. **Performance**: 1000개 Task 처리 시간 측정 (목표: < 100ms)

---

## Performance Optimization

### Web Worker Integration
- 복잡한 계산은 Web Worker에서 실행하여 UI 블로킹 방지
- 계산 완료 후 결과만 메인 스레드로 전달

**File**: `src/lib/scheduling/worker.ts`

```typescript
// Worker
self.onmessage = (e) => {
  const { tasks, links, calendar } = e.data
  const engine = new SchedulingEngine(tasks, links, calendar)
  const result = engine.calculateCPM()
  self.postMessage(result)
}

// Main Thread
const worker = new Worker('/scheduling-worker.js')
worker.postMessage({ tasks, links, calendar })
worker.onmessage = (e) => {
  const cpmResult = e.data
  updateUI(cpmResult)
}
```

---

## Next Steps After Phase 2

1. **Phase 3**: Gantt UI 통합 (SVAR React Gantt)
2. **Phase 4**: Task CRUD 및 실시간 재계산
3. **Phase 5**: Resource Conflict Detection

---

## References
- [Critical Path Method - GeeksforGeeks](https://www.geeksforgeeks.org/project-mgmt/software-engineering-critical-path-method/)
- [Topological Sort - Interview Cake](https://www.interviewcake.com/concept/java/topological-sort)
- [Graphlib Documentation](https://github.com/dagrejs/graphlib)
