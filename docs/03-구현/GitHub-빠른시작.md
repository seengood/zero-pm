# GitHub 프로젝트 관리 - 빠른 시작 가이드

## 📋 요약

ZeroPM 프로젝트를 GitHub Issues와 Projects로 관리하기 위한 모든 준비가 완료되었습니다!

## ✅ 생성된 파일들

### 1. GitHub 템플릿 파일
```
.github/
├── ISSUE_TEMPLATE/
│   ├── feature_request.md    # Feature 요청 템플릿
│   ├── bug_report.md          # Bug 리포트 템플릿
│   ├── epic.md                # Epic 템플릿
│   └── config.yml             # 템플릿 설정
└── PULL_REQUEST_TEMPLATE.md   # PR 템플릿
```

### 2. 문서 파일
```
docs/03-구현/
├── GitHub-프로젝트-관리-가이드.md    # 종합 가이드
└── GitHub-Issues-생성목록.md         # 생성할 Issues 목록
```

## 🚀 다음 단계 (3단계)

### Step 1: Git 커밋 및 푸시

```bash
# 현재 디렉토리에서 실행
cd /Users/sheplim/develop/work/zero-pm

# 변경사항 확인
git status

# 모든 변경사항 스테이징
git add .

# 커밋
git commit -m "docs: add GitHub project management templates and guides

- Add Issue templates (feature, bug, epic)
- Add Pull Request template
- Add comprehensive project management guide
- Add detailed Issues creation list for Phase 3-5"

# GitHub에 푸시
git push origin main
```

### Step 2: GitHub에서 Labels 생성

1. https://github.com/seengood/zero-pm/labels 접속
2. 다음 라벨들을 생성:

| 라벨 이름 | 색상 | 설명 |
|----------|------|------|
| `epic` | `#7057ff` (보라색) | 큰 단위의 작업 (Phase 단위) |
| `feature` | `#0e8a16` (초록색) | 새로운 기능 구현 |
| `enhancement` | `#a2eeef` (하늘색) | 기존 기능 개선 |
| `bug` | `#d73a4a` (빨간색) | 버그 수정 |
| `docs` | `#0075ca` (파란색) | 문서 작업 |
| `test` | `#f9d0c4` (연분홍) | 테스트 추가/수정 |
| `phase-1` | `#1d76db` (파란색) | Phase 1: Foundation |
| `phase-2` | `#1d76db` (파란색) | Phase 2: Scheduling Engine |
| `phase-3` | `#1d76db` (파란색) | Phase 3: Gantt UI |
| `phase-4` | `#1d76db` (파란색) | Phase 4: Advanced PM |
| `phase-5` | `#1d76db` (파란색) | Phase 5: Resource & Cost |
| `priority: high` | `#ff6b6b` (주황색) | 높은 우선순위 |
| `priority: medium` | `#ffa502` (노란색) | 중간 우선순위 |
| `priority: low` | `#95afc0` (회색) | 낮은 우선순위 |

### Step 3: GitHub Issues 생성

1. https://github.com/seengood/zero-pm/issues 접속
2. "New issue" 클릭
3. 템플릿 선택 (Epic, Feature Request, Bug Report)
4. `docs/03-구현/GitHub-Issues-생성목록.md` 파일을 열어서 내용 복사
5. 다음 순서로 Issues 생성:

**Epic Issues (먼저 생성)**:
- [ ] Issue #1: [Epic] Phase 3: Gantt UI Implementation
- [ ] Issue #2: [Epic] Phase 4: Advanced PM Features
- [ ] Issue #3: [Epic] Phase 5: Resource & Cost Management

**Feature Issues (Phase 3)**:
- [ ] Issue #4: [Feature] Optimistic UI Pattern Implementation
- [ ] Issue #5: [Feature] Soft Lock with Supabase Presence
- [ ] Issue #6: [Feature] CPM Engine Integration with Gantt
- [ ] Issue #7: [Feature] Critical Path Visualization

### Step 4: GitHub Projects 생성 (선택사항)

1. https://github.com/seengood/zero-pm/projects 접속
2. "New project" 클릭
3. "Board" 템플릿 선택
4. 프로젝트 이름: **"ZeroPM Development"**
5. 컬럼 구성:
   - 📥 **Backlog** - 예정된 작업
   - 🎯 **Ready** - 다음에 할 작업
   - 🔄 **In Progress** - 진행 중
   - 👀 **Review** - 리뷰 중
   - ✅ **Done** - 완료

6. Issues를 Project Board에 추가:
   - #4, #5, #6 → "In Progress" (현재 작업 중)
   - #7 → "Ready" (다음 작업)
   - #2, #3 → "Backlog" (장기 계획)

### Step 5: Milestones 생성 (선택사항)

1. https://github.com/seengood/zero-pm/milestones 접속
2. "New milestone" 클릭
3. 다음 Milestones 생성:

| Milestone | Due Date | Description |
|-----------|----------|-------------|
| `v0.1.0 - MVP Release` | 2025-12-31 | Phase 3 완료, 기본 Gantt UI |
| `v0.2.0 - Advanced Features` | 2026-01-31 | Phase 4 완료, 고급 PM 기능 |
| `v1.0.0 - Production Ready` | 2026-03-31 | Phase 5 완료, 프로덕션 배포 |

4. Issues에 Milestone 할당:
   - #1, #4, #5, #6, #7 → `v0.1.0 - MVP Release`
   - #2 → `v0.2.0 - Advanced Features`
   - #3 → `v1.0.0 - Production Ready`

## 📊 완료 후 모습

### Issues 페이지
```
🟣 #1 [Epic] Phase 3: Gantt UI Implementation
   epic, phase-3, priority: high
   
🟢 #4 [Feature] Optimistic UI Pattern Implementation
   feature, phase-3, priority: high
   
🟢 #5 [Feature] Soft Lock with Supabase Presence
   feature, phase-3, priority: high
   
...
```

### Project Board
```
┌─────────────┬─────────┬──────────────┬─────────┬──────┐
│  Backlog    │  Ready  │ In Progress  │ Review  │ Done │
├─────────────┼─────────┼──────────────┼─────────┼──────┤
│ #2 Phase 4  │ #7 CP   │ #4 Opt UI    │         │      │
│ #3 Phase 5  │         │ #5 Soft Lock │         │      │
│             │         │ #6 CPM Int   │         │      │
└─────────────┴─────────┴──────────────┴─────────┴──────┘
```

## 💡 사용 팁

### 커밋 메시지에서 Issue 참조
```bash
git commit -m "feat: implement optimistic UI pattern (#4)"
git commit -m "fix: resolve version conflict (closes #4)"
```

### Branch 네이밍
```bash
git checkout -b feature/#4-optimistic-ui
git checkout -b bugfix/#8-rls-recursion
```

### Pull Request 생성
1. Feature branch에서 작업 완료
2. GitHub에서 Pull Request 생성
3. 자동으로 PR 템플릿이 적용됨
4. "Closes #4" 추가하면 merge 시 자동으로 Issue close

## 📚 참고 문서

- [GitHub-프로젝트-관리-가이드.md](./GitHub-프로젝트-관리-가이드.md) - 상세 가이드
- [GitHub-Issues-생성목록.md](./GitHub-Issues-생성목록.md) - Issues 내용

## ❓ FAQ

**Q: Issue 템플릿이 GitHub에 바로 적용되나요?**
A: 네! `.github/ISSUE_TEMPLATE/` 폴더의 파일들을 push하면 자동으로 적용됩니다.

**Q: Project Board는 필수인가요?**
A: 아니요, 선택사항입니다. Issues만으로도 충분히 관리할 수 있습니다.

**Q: Labels는 자동으로 생성되나요?**
A: 아니요, GitHub 웹에서 수동으로 생성해야 합니다.

**Q: 기존 작업은 어떻게 관리하나요?**
A: Phase 1, 2는 이미 완료되었으므로 별도 Issue를 만들지 않아도 됩니다. 
   필요하다면 "Done" 상태로 Issue를 생성할 수 있습니다.

---

**작성일**: 2025-12-01  
**다음 작업**: Git push → Labels 생성 → Issues 생성
