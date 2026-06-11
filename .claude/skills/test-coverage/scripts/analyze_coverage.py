#!/usr/bin/env python3
"""
coverage/coverage-summary.json 을 파싱해 프로젝트 목표치 대비 미달 파일을 출력.

ZeroPM 목표: lib/ ≈100%, hooks/ ≥95%, components/ ≥90%
"""
import json, sys
from pathlib import Path

THRESHOLDS = [
    ('src/lib/',        100),
    ('src/hooks/',       95),
    ('src/components/',  90),
]
DEFAULT_THRESHOLD = 80

# Jest config에서 제외되거나 단위 테스트 대상이 아닌 경로
SKIP_PREFIXES = (
    'src/app/',          # Next.js pages/routes (page.tsx, route.ts)
    'src/types/',        # 타입 정의만 있는 파일
    'src/lib/test-helpers',  # 테스트 유틸리티
    'src/middleware',    # Next.js 미들웨어
)

def get_threshold(path):
    for prefix, t in THRESHOLDS:
        if prefix in path:
            return t
    return DEFAULT_THRESHOLD

summary_file = Path('coverage/coverage-summary.json')
if not summary_file.exists():
    print("coverage/coverage-summary.json 없음 — 먼저 npm test -- --coverage 를 실행하세요")
    sys.exit(0)

data = json.loads(summary_file.read_text())
total = data.pop('total', {})

# 전체 요약
if total:
    print(f"전체  Stmts {total['statements']['pct']:.1f}%  "
          f"Branch {total['branches']['pct']:.1f}%  "
          f"Funcs {total['functions']['pct']:.1f}%  "
          f"Lines {total['lines']['pct']:.1f}%\n")

cwd = Path.cwd()
below = []
for abs_path, m in data.items():
    try:
        rel = 'src/' + str(Path(abs_path).relative_to(cwd / 'src'))
    except ValueError:
        rel = abs_path

    if any(rel.startswith(p) for p in SKIP_PREFIXES):
        continue

    s = m['statements']['pct']
    b = m['branches']['pct']
    f = m['functions']['pct']
    worst = min(s, b, f)
    gap = get_threshold(rel) - worst
    if gap > 0:
        below.append((gap, get_threshold(rel), rel, s, b, f))

below.sort(reverse=True)

if not below:
    print("모든 파일이 목표 커버리지를 달성했습니다!")
    sys.exit(0)

print(f"{'파일':<48} {'Stmts':>6} {'Branch':>7} {'Funcs':>6} {'목표':>5} {'부족':>5}")
print("─" * 78)
for gap, thr, path, s, b, f in below:
    flag = "  ⚠" if gap > 20 else ""
    print(f"{path:<48} {s:>6.1f} {b:>7.1f} {f:>6.1f} {thr:>4}%  {gap:>4.1f}{flag}")

print(f"\n개선 필요: {len(below)}개 파일  (⚠ = 20% 이상 부족)")
