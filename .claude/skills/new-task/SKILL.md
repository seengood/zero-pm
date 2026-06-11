---
name: new-task
description: 새 태스크를 위한 git worktree와 브랜치를 생성하고 격리된 환경에서 작업을 시작합니다. "새 태스크 시작", "worktree 만들어줘", "새 기능 작업 시작"과 같은 요청에 자동으로 호출됩니다.
argument-hint: <태스크명>
disable-model-invocation: false
allowed-tools: Bash(git *)
---

태스크 "$ARGUMENTS"를 시작합니다.

## 현재 상태

!`git status --short`
!`git branch --show-current`
!`git worktree list`

## 실행 순서

1. 위 현재 상태를 확인하고 uncommitted 변경사항이 있으면 먼저 사용자에게 알려줘
2. 태스크명 "$ARGUMENTS"를 kebab-case로 정리해 브랜치명을 `feat/$ARGUMENTS` 형식으로 결정
3. `.claude/worktrees/` 디렉토리가 없으면 생성: `mkdir -p .claude/worktrees`
4. worktree 생성:
   `git worktree add -b feat/$ARGUMENTS .claude/worktrees/$ARGUMENTS`
5. 생성 후 확인:
   `git worktree list`
6. 사용자에게 다음을 알려줘:
   - 생성된 worktree 경로: `.claude/worktrees/$ARGUMENTS`
   - 브랜치명: `feat/$ARGUMENTS`
   - 새 터미널에서 이 worktree 로 진입하는 방법:
     `cd .claude/worktrees/$ARGUMENTS && claude`
7. `.gitignore` 에 `.claude/worktrees/` 가 없으면 추가할지 물어봐

생성이 완료되면 이 태스크에서 수정될 것으로 예상되는 파일 범위를 파악하고 간단한 작업 계획을 제안해줘.
