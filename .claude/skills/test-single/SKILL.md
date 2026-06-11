---
name: test-single
description: "Invoke when the user wants to run ONE specific named test — not the whole suite. The key signal is any concrete identifier (camelCase function name, filename, hook name, component name, or quoted test description string) combined with run intent. Korean trigger phrases: 테스트 실행해줘, 테스트만 실행해줘, 테스트 돌려봐, 테스트만 돌려줘, 테스트만 실행해봐. Skip for: running the whole suite (전체/모든 테스트), coverage checks, test environment setup, writing new tests, or explaining test structure."
argument-hint: <파일명·경로·테스트명> [--watch]
allowed-tools: Bash(npm *), Bash(find *)
---

## 테스트 파일 목록

!`find src -name "*.test.ts" -o -name "*.test.tsx" | sort`

## 실행 방법 결정

`$ARGUMENTS`를 분석해 아래 순서로 판단합니다.

**--watch 플래그** — `$ARGUMENTS`에 `--watch`가 있으면 해당 테스트를 watch 모드로 실행합니다:
```bash
npm test -- --watch <파일 또는 -t 패턴>
```

**경로/파일명 패턴** — `.test`, `/`, `__tests__`가 포함되거나 위 목록에서 일치하는 파일이 있으면:
```bash
npm test -- src/lib/__tests__/<매칭 파일>
```
부분 이름(예: `tasks`, `scheduling`)은 위 목록에서 가장 잘 맞는 파일을 찾아 전체 경로로 실행합니다.

**테스트 이름** — 함수명·설명처럼 보이는 문자열(예: `calculateSuccessorDate`, `should handle`):
```bash
npm test -- -t "$ARGUMENTS"
```

**인수 없음** — 대화 맥락에서 최근 언급된 파일을 찾아 대응하는 테스트 실행. 불분명하면 위 목록을 보여주고 사용자에게 선택 요청.

## 결과 해석

- 실패 시: 어떤 assertion이 왜 실패했는지 설명
- 전체 통과 시: 통과 수와 소요 시간 보고
