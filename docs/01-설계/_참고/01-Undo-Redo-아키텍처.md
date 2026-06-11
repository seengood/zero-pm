# Undo/Redo 아키텍처 설계

**작성일**: 2026-06-11  
**상태**: 설계 완료, 구현 대기  
**영향 범위**: `taskEventEmitter`, `ganttScheduler`, `useGanttObservers`, `GanttView`

---

## 1. 왜 지금 설계해야 하는가

현재 이벤트 기반 아키텍처는 단방향(forward-only)으로 설계되어 있다. 사용자 액션 하나가 cascade scheduling을 통해 N개의 태스크를 연쇄 변경하고, 각각을 DB에 영속화한다.

Undo를 나중에 끼워넣으면:
- `ganttScheduler.js`의 재귀 cascade 구조 전체를 재설계해야 함
- Phase 4~6에서 추가될 자원 배정, EVM, 태스크 생성/삭제도 모두 Undo 지원이 필요
- 지금 설계하지 않으면 기능이 쌓일수록 Undo 적용 범위가 좁아진다

---

## 2. 설계 원칙

1. **기존 이벤트 파이프라인을 깨지 않는다** — DBObserver, UIObserver, ScheduleObserver의 동작 방식을 변경하지 않는다. Undo는 새로운 레이어로 추가된다.
2. **그룹 단위 Undo** — 드래그 1회로 cascade된 N개 태스크 변경은 단일 Undo 단위(Command)로 묶인다. 개별 cascade 변경을 하나씩 Undo하는 것은 사용자에게 무의미하다.
3. **Undo 자체는 새 Command를 생성하지 않는다** — Undo 실행이 다시 Undo 가능한 이벤트를 발생시키면 무한루프가 된다. `skipHistory` 플래그로 방지한다.
4. **DB는 항상 진실의 원천** — Undo 시 DB에도 이전 상태를 저장한다. 협업 환경에서 다른 사용자도 revert를 보아야 한다.
5. **초기 구현 범위를 명확히 한다** — v1은 날짜/기간 변경(드래그, 리사이즈, 모달 편집)과 링크 생성/삭제만 지원. 태스크 생성/삭제는 v2.

---

## 3. Command Pattern 설계

### 3.1 핵심 데이터 구조

```typescript
// src/lib/undoManager.ts

interface TaskSnapshot {
  id: string;
  start_date: string;
  duration: number;
  // cascade로 변경될 수 있는 필드만 포함
}

interface LinkSnapshot {
  id: string;
  source: string;
  target: string;
  type: string;
  lag: number;
}

type ChangeRecord =
  | { kind: 'task-update'; taskId: string; before: TaskSnapshot; after: TaskSnapshot }
  | { kind: 'link-create'; link: LinkSnapshot }
  | { kind: 'link-delete'; link: LinkSnapshot };

interface Command {
  id: string;               // 디버깅용
  label: string;            // 사용자에게 보여줄 텍스트: "태스크 이동", "링크 연결" 등
  changes: ChangeRecord[];  // 이 Command가 포함하는 모든 변경 (원인 + cascade 결과)
  timestamp: number;
}
```

### 3.2 UndoManager API

```typescript
class UndoManager {
  // 트랜잭션 관리
  beginTransaction(label: string): void
  recordTaskChange(taskId: string, before: TaskSnapshot, after: TaskSnapshot): void
  recordLinkCreate(link: LinkSnapshot): void
  recordLinkDelete(link: LinkSnapshot): void
  commitTransaction(): void
  abortTransaction(): void  // DB 저장 실패 시 롤백용

  // Undo/Redo
  undo(): Command | null    // 실행할 Command 반환
  redo(): Command | null

  // 상태 조회
  canUndo(): boolean
  canRedo(): boolean
  getUndoLabel(): string | null   // "실행 취소: 태스크 이동"
  getRedoLabel(): string | null

  // 스택 설정
  readonly maxHistory: number  // 기본값 50
}

export const undoManager = new UndoManager();
```

---

## 4. 트랜잭션 경계 규칙

트랜잭션은 **사용자의 단일 의도**를 기준으로 묶는다.

| 사용자 액션 | 트랜잭션 시작 | 트랜잭션 종료 |
|------------|-------------|-------------|
| 태스크 드래그 (이동) | `ganttIntercepts.js`: `update-task` 인터셉트 진입 시 | `recalculateAffectedTasks` 전체 완료 후 |
| 태스크 리사이즈 | `ganttIntercepts.js`: `resize-task` 인터셉트 진입 시 | 동일 |
| 모달에서 날짜/기간 수정 | `TaskDetailModal`에서 저장 버튼 클릭 시 | DB 저장 + cascade 완료 후 |
| 링크 생성 | `ganttIntercepts.js`: `add-link` 인터셉트 진입 시 | `scheduleObserver.handleLinkCreated` 완료 후 |
| 링크 삭제 | `ganttIntercepts.js`: `delete-link` 인터셉트 진입 시 | 동일 |

**트랜잭션 중첩 불허**: cascade 처리 중 발생하는 `handleTaskUpdate(skipRecalculation=true)` 호출은 트랜잭션을 새로 시작하지 않는다. 기존 열린 트랜잭션에 change를 추가한다.

---

## 5. 현재 코드와의 통합 지점

### 5.1 `ganttIntercepts.js` — 트랜잭션 시작

```javascript
// 기존: api.intercept('update-task', async ({ id, task }) => { ... })
// 변경: 인터셉트 진입 시 트랜잭션 시작

api.intercept('update-task', async ({ id, task }) => {
  if (!isSchedulerUpdateRef.current) {
    // before 스냅샷 캡처
    const before = captureTaskSnapshot(id, tasksRef.current);
    undoManager.beginTransaction('태스크 이동');
    undoManager.recordTaskChange(id, before, null); // after는 cascade 후 채움
  }
  // ... 기존 로직
});
```

### 5.2 `ganttScheduler.js` — cascade 변경 기록

```javascript
// recalculateAffectedTasks 내부, handleTaskUpdate 호출 직전:

const before = captureTaskSnapshot(successor.id, currentTasks);
await handleTaskUpdate(updatedSuccessor, true);
const after = captureTaskSnapshot(successor.id, tasksRef.current);
undoManager.recordTaskChange(successor.id, before, after);
```

### 5.3 `GanttView.jsx` — 트랜잭션 커밋 및 Undo 실행

```javascript
// handleTaskUpdate 함수 끝, cascade 완료 후:
if (!skipRecalculation) {
  // 원인 태스크의 after 스냅샷 채우기
  const after = captureTaskSnapshot(task.id, tasksRef.current);
  undoManager.fillAfterSnapshot(task.id, after);
  undoManager.commitTransaction();
}

// 키보드 단축키 등록 (useEffect)
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      executeUndo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      executeRedo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 5.4 `executeUndo` 함수 — Undo 실행 로직

```javascript
// GanttView.jsx 내부

const executeUndo = useCallback(async () => {
  const command = undoManager.undo();
  if (!command) return;

  // 변경을 역순으로 되돌리기
  for (const change of [...command.changes].reverse()) {
    if (change.kind === 'task-update') {
      const { taskId, before } = change;
      
      // 1. DB 복원
      await updateTask(taskId, {
        start_date: before.start_date,
        duration: before.duration,
      });
      
      // 2. React 상태 복원
      setTasks(prev => prev.map(t =>
        String(t.id) === taskId ? { ...t, ...before } : t
      ));
      
      // 3. SVAR Gantt 내부 스토어 직접 복원
      const startDate = new Date(before.start_date);
      const endDate = calculateEndDateUTC(startDate, before.duration);
      isSchedulerUpdateRef.current = true;
      ganttApiRef.current.exec('update-task', {
        id: taskId,
        task: { start: startDate, end: endDate, duration: before.duration }
      });
      isSchedulerUpdateRef.current = false;
    }
    
    if (change.kind === 'link-create') {
      // 링크 생성의 Undo = 링크 삭제
      await deleteLink(change.link.id);
      setLinks(prev => prev.filter(l => String(l.id) !== String(change.link.id)));
      ganttApiRef.current.exec('delete-link', { id: change.link.id });
    }
    
    if (change.kind === 'link-delete') {
      // 링크 삭제의 Undo = 링크 재생성
      const { data } = await createLink(change.link);
      setLinks(prev => [...prev, { ...change.link, id: data.id }]);
      ganttApiRef.current.exec('add-link', { link: { ...change.link, id: data.id } });
    }
  }
}, [ganttApiRef, isSchedulerUpdateRef, setTasks, setLinks]);
```

**핵심**: `executeUndo`는 `taskEventEmitter.emit()`을 호출하지 않는다. 직접 DB API + setTasks + ganttApiRef.exec()를 호출한다. 이렇게 해야 Undo 동작이 다시 ScheduleObserver를 trigger해서 cascade re-scheduling이 일어나는 것을 방지한다.

---

## 6. `skipHistory` 플래그의 역할

Undo 실행은 DB 저장 → React 상태 변경 → SVAR 업데이트의 3단계를 직접 수행한다. 만약 이 과정에서 `emit()`을 사용하면 DBObserver와 UIObserver가 다시 실행되고, 더 나쁘게는 ScheduleObserver가 다시 cascade를 트리거한다.

따라서 Undo는 **이벤트 파이프라인을 우회**한다. 이는 현재 아키텍처에서 `skipRecalculation=true` 처리와 동일한 패턴이다.

```
일반 액션:  사용자 → intercept → emit → [DB, UI, Schedule] → cascade
Undo 실행: Ctrl+Z → executeUndo → [DB 직접, setTasks 직접, ganttApi 직접]
```

---

## 7. 스택 관리 규칙

```
undoStack: [cmd1, cmd2, cmd3]  ← cmd3이 최신
redoStack: []

Undo 실행:
  undoStack: [cmd1, cmd2]
  redoStack: [cmd3]

Redo 실행:
  undoStack: [cmd1, cmd2, cmd3]
  redoStack: []

새 액션 실행 (cmd4):
  undoStack: [cmd1, cmd2, cmd3, cmd4]
  redoStack: []  ← Redo 스택은 새 액션 시 항상 비워진다
```

**maxHistory = 50**: 50개 초과 시 가장 오래된 Command를 삭제한다.  
**스택 초기화 시점**: 프로젝트 전환, 페이지 이동 시 스택을 비운다.

---

## 8. 엣지 케이스

### 8.1 DB 저장 실패 시
현재 DBObserver 실패가 UIObserver를 블로킹하는 문제(H-3)가 있다. Undo 설계에서는 DB 저장 실패 시 `undoManager.abortTransaction()`을 호출하여 미완성 Command를 스택에 쌓지 않는다.

```javascript
try {
  await handleTaskUpdate(task);
  undoManager.commitTransaction();
} catch (e) {
  undoManager.abortTransaction();
  showErrorToast('저장에 실패했습니다. 변경 사항이 취소됩니다.');
  // 여기서 UI를 before 상태로 롤백하는 로직도 추가
}
```

### 8.2 실시간 협업 중 Undo
Undo는 **자신의 액션만** 취소한다. 다른 사용자가 변경한 것은 `useRealtimeSync`를 통해 받은 것이므로 undoStack에 들어가지 않는다.  
단, 협업 중 Undo를 하면 다른 사용자에게 realtime으로 revert가 전파된다(DB 저장 → postgres_changes → 상대방 receive).

### 8.3 오프라인 중 Undo
오프라인 상태에서는 DB 저장이 불가하므로 Undo 버튼을 비활성화한다. 오프라인 중 변경 사항을 스택에 쌓아 온라인 복귀 후 처리하는 것은 v2 범위.

### 8.4 링크 생성 후 cascade된 태스크 Undo
링크를 만들면 ScheduleObserver가 cascade를 트리거한다. 이 cascade로 변경된 태스크들도 같은 트랜잭션에 기록된다. Undo 시 링크 삭제 + cascade 태스크 복원이 하나의 Command로 처리된다.

---

## 9. UI 연동

### 9.1 키보드 단축키
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` / `Ctrl+Y`: Redo

### 9.2 툴바 버튼
```
[↩ 실행 취소] [↪ 다시 실행]
 hover: "태스크 이동 실행 취소"  "다시 실행 불가"
```
- `canUndo() === false` 시 버튼 비활성화 + 회색 표시
- hover 시 tooltip으로 `getUndoLabel()` 표시

### 9.3 토스트 메시지
- Undo 성공: "태스크 이동이 취소됐습니다." (1.5초 표시)
- Redo 성공: "태스크 이동이 다시 적용됐습니다."
- Undo 불가: (버튼 비활성화로 대체, 토스트 없음)

---

## 10. 구현 단계 (Phasing)

### v1 (즉시 구현 가능)
- [ ] `src/lib/undoManager.ts` — UndoManager 클래스 + 싱글턴
- [ ] `ganttIntercepts.js` — `update-task`, `resize-task`, `add-link`, `delete-link` 인터셉트에 트랜잭션 시작 추가
- [ ] `ganttScheduler.js` — cascade 각 단계에서 `recordTaskChange` 추가
- [ ] `GanttView.jsx` — `executeUndo`, `executeRedo` 함수 + 키보드 이벤트
- [ ] 툴바 Undo/Redo 버튼 (disabled 상태 연동)
- [ ] `undoManager.test.ts` — 단위 테스트

### v2 (Phase 4 착수 전)
- [ ] 태스크 생성/삭제 Undo (DB 삭제 복구 로직 포함)
- [ ] 오프라인 중 변경 사항을 큐에 보관하여 온라인 복귀 후 Undo 지원
- [ ] Undo 히스토리 패널 (드롭다운으로 여러 단계 일괄 취소)

---

## 11. 테스트 전략

### 단위 테스트 (`undoManager.test.ts`)
```typescript
// 기본 스택 동작
it('beginTransaction + recordChange + commit = 1 command in undoStack')
it('undo pops from undoStack and pushes to redoStack')
it('new action after undo clears redoStack')
it('maxHistory=50 evicts oldest command')
it('abortTransaction discards incomplete command')

// 그룹 변경
it('cascade changes within one transaction are grouped as one command')
it('undo of grouped command restores all affected tasks')
```

### 통합 시나리오
| 시나리오 | 검증 포인트 |
|---------|------------|
| 태스크 A를 3일 이동 → Ctrl+Z | A + cascade된 B, C가 모두 원래 날짜로 복원 |
| 링크 생성 → Ctrl+Z | 링크 삭제 + cascade 태스크 복원 |
| 5번 이동 → Ctrl+Z 5번 | 최초 상태로 복원 |
| Undo → Undo → Redo → 새 액션 | Redo 스택 초기화 확인 |
| DB 저장 실패 시 Undo 실행 | abortTransaction 호출, 스택에 미완성 command 없음 |

---

## 12. 현재 아키텍처 변경 요약

| 파일 | 변경 종류 | 변경 내용 |
|------|---------|---------|
| `src/lib/undoManager.ts` | **신규** | UndoManager 클래스 + 싱글턴 |
| `src/lib/ganttIntercepts.js` | **수정** | 인터셉트 진입 시 `beginTransaction()` 추가 |
| `src/lib/ganttScheduler.js` | **수정** | cascade loop에서 `recordTaskChange()` 추가 |
| `src/components/GanttView.jsx` | **수정** | `executeUndo/Redo` + 키보드 이벤트 + 트랜잭션 commit |
| `src/lib/taskObservers.ts` | **변경 없음** | 기존 3개 옵저버 그대로 |
| `src/lib/taskEventEmitter.ts` | **변경 없음** | emit 파이프라인 그대로 |
