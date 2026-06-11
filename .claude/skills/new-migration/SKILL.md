---
name: new-migration
description: Invoke this skill for any request to create a new Supabase migration SQL file. The skill auto-generates the required YYYYMMDDHHmmss timestamp and correct supabase/migrations/ path — skip it and you'll likely get the timestamp format wrong. Trigger whenever a user combines a creation intent (make, create, generate, 만들어줘, 생성해줘, 새 파일 만들어줘) with a schema change (migration, DB schema file, add table/column/index/RLS, 마이그레이션, 스키마 변경 파일). Do not invoke when the user is reading existing migration files, running supabase db push, seeding data, or setting up a local environment.
argument-hint: <마이그레이션 설명 (snake_case)>
allowed-tools: Bash(date *), Bash(ls *), Write
---

마이그레이션 파일을 생성합니다.

## 현재 마이그레이션 목록

!`ls supabase/migrations/ | tail -5`

## 실행 순서

1. `date +%Y%m%d%H%M%S` 명령으로 현재 타임스탬프를 가져온다
2. 파일명을 `supabase/migrations/<timestamp>_$ARGUMENTS.sql` 형식으로 결정한다
   - `$ARGUMENTS`가 없으면 사용자에게 마이그레이션 설명을 물어본다
   - `$ARGUMENTS`는 snake_case로 정리한다 (예: "add task priority" → "add_task_priority")
3. 아래 템플릿으로 파일을 생성한다:

```sql
-- Migration: $ARGUMENTS
-- Created: <timestamp>

BEGIN;

-- TODO: 마이그레이션 내용을 작성하세요

COMMIT;
```

4. 생성된 파일 경로를 안내하고, 필요하다면 SQL 내용 작성을 도와준다

> **주의**: 마이그레이션 파일은 한 번 적용되면 되돌리기 어렵습니다. 내용을 작성한 뒤 `supabase db push` 전 반드시 검토하세요.
