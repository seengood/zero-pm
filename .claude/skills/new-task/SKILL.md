---
name: new-task
description: 새 태스크를 위한 git 브랜치를 생성하고 작업을 시작합니다. "새 태스크 시작", "새 브랜치 만들어줘", "새 기능 작업 시작"과 같은 요청에 자동으로 호출됩니다.
argument-hint: <태스크명>
disable-model-invocation: false
allowed-tools: Bash(git *)
---

태스크 "$ARGUMENTS"를 시작합니다.

## 현재 상태

!`git status --short`
!`git branch --show-current`

## 실행 순서

1. 위 현재 상태를 확인하고 uncommitted 변경사항이 있으면 먼저 사용자에게 알려줘
2. 태스크명 "$ARGUMENTS"를 kebab-case로 정리해 브랜치명을 `feat/$ARGUMENTS` 형식으로 결정
3. main 브랜치 기반으로 새 브랜치 생성 후 체크아웃:
   `git checkout -b feat/$ARGUMENTS main`
4. 생성 후 확인:
   `git branch --show-current`
5. 사용자에게 다음을 알려줘:
   - 현재 브랜치: `feat/$ARGUMENTS`
   - 작업 완료 후 main에 merge하는 방법: `git checkout main && git merge feat/$ARGUMENTS`

생성이 완료되면 이 태스크에서 수정될 것으로 예상되는 파일 범위를 파악하고 간단한 작업 계획을 제안해줘.
