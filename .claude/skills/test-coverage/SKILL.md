---
name: test-coverage
description: Test coverage analysis and reporting. Invoke for any request about coverage measurement or gaps: 커버리지 확인, 커버리지 얼마야, 테스트 커버리지, coverage report, 안 된 코드 어딘지, 어디에 테스트 추가, which files need more tests, what percentage is covered. The goal is understanding coverage quality — not running tests. Skip for: test execution (npm test, watch mode), jest configuration, test file placement.
allowed-tools: Bash(npm *), Bash(python3 *)
---

## Step 1 — 커버리지 실행 (JSON 모드)

JSON Summary 리포터를 사용하면 긴 텍스트 테이블 대신 `coverage/coverage-summary.json`이 생성됩니다. 모델이 수백 줄을 읽을 필요가 없습니다.

!`npm test -- --coverage --coverageReporters=json-summary 2>&1 | tail -8`

## Step 2 — 분석 스크립트 실행

!`python3 .claude/skills/test-coverage/scripts/analyze_coverage.py`

스크립트가 목표치 미달 파일을 부족량 순서(큰 것부터)로 출력합니다.

## Step 3 — 결과 해석

스크립트 출력을 바탕으로:
- ⚠ 표시 파일(20% 이상 부족)을 Top 3 개선 우선순위로 권고
- 테스트 실패가 있으면 커버리지보다 실패 수정 먼저 권고

> 특정 파일만 보고 싶으면 `/test-single <파일명>` 으로 해당 파일 테스트를 돌린 뒤 커버리지를 확인하세요.
