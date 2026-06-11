---
name: new-task
description: 새 태스크를 위한 git worktree 또는 브랜치를 생성하고 작업을 시작합니다. "새 태스크 시작", "새 브랜치 만들어줘", "새 기능 작업 시작", "새 작업", "worktree 생성"과 같은 요청에 자동으로 호출됩니다.
argument-hint: <태스크명>
disable-model-invocation: false
allowed-tools: Bash(git *)
---

태스크 "$ARGUMENTS"를 시작합니다.

## 현재 상태

!`git status --short`
!`git branch --show-current`
!`git rev-parse --show-toplevel`

## 실행 순서

### 1단계: 태스크명 확인

태스크명이 비어 있으면 **여기서 멈추고** 사용자에게 태스크명을 물어봐. 태스크명 없이는 절대 다음 단계로 넘어가지 마.

### 2단계: 생성 방식 선택

사용자에게 어떤 방식으로 작업 환경을 만들지 물어봐:

- **worktree**: 별도 디렉토리에 독립된 작업 공간 생성 (현재 작업을 방해하지 않음)
- **branch**: 현재 레포에서 브랜치만 생성 후 체크아웃

### 3단계: uncommitted 변경사항 처리

위 `git status --short` 결과에 변경사항이 있으면 사용자에게 알리고, 어떻게 처리할지 선택하게 해:

- **커밋**: 지금 바로 커밋하고 진행 (커밋 메시지를 사용자에게 확인)
- **stash**: `git stash`로 임시 저장 후 진행 (작업 끝나면 `git stash pop`으로 복원)
- **무시**: 변경사항은 현재 브랜치에 그대로 두고 새 worktree/브랜치만 생성

변경사항이 없으면 이 단계를 건너뛰어.

### 4단계: 브랜치명 결정

태스크명을 영문 kebab-case로 변환해 `feat/<name>` 형식을 만들어:
- 한글 → 의미에 맞는 영문으로 번역
- 공백 → `-`
- 특수문자 제거
- 예: "로그인 페이지 개선" → `feat/improve-login-page`
- 예: "new-task skill 개선" → `feat/improve-new-task-skill`

### 5단계: Worktree 또는 브랜치 생성

2단계에서 선택한 방식에 따라 실행해.

**Worktree 생성**:
`git rev-parse --show-toplevel`로 현재 레포 절대 경로를 얻고, 그 경로의 마지막 디렉토리명을 레포명으로 사용해. Worktree는 레포 디렉토리와 나란히 생성:
```
git worktree add -b feat/<name> ../<repo-name>-<name> main
```
예: 현재 레포가 `/Users/me/projects/my-app`이면 → `../my-app-<name>` 경로에 생성

**브랜치만 생성**:
```
git checkout -b feat/<name> main
```

### 6단계: 결과 안내

생성 완료 후 사용자에게 알려줘:
- **작업 디렉토리** (worktree일 때): 절대 경로
- **브랜치명**: `feat/<name>`
- **작업 완료 후 처리**:
  - Worktree: `git worktree remove <path>` 후 PR 생성
  - 브랜치: `git checkout main && git merge feat/<name>`
- stash를 했다면: `git stash pop`으로 복원할 수 있음을 알려줘

### 7단계: 작업 계획 제안

이 태스크에서 수정될 것으로 예상되는 파일 범위를 파악하고 간단한 작업 계획을 제안해.
