---
name: fix-gantt-css
description: Apply this skill when a user reports that the gantt chart renders without styles, or when Next.js/Turbopack raises a CSS parse error (Invalid empty selector, Parsing CSS source code failed) during dev or build. 간트 차트 스타일 없음·깨짐, CSS 파싱 오류 → 즉시 적용. These are symptoms of a known Turbopack/minified-CSS incompatibility — one command fixes it without any CSS editing. Do not apply for intentional style changes, library upgrades, or Tailwind config.
allowed-tools: Bash(cp *), Bash(ls *)
---

SVAR Gantt CSS 파일을 복사합니다.

## 실행

!`cp node_modules/@svar-ui/react-gantt/dist/index.css src/styles/gantt-svar.css`

## 확인

!`ls -lh src/styles/gantt-svar.css`

복사가 완료되었습니다. `npm run dev` 또는 `npm run build`를 다시 실행하세요.

> **배경**: Turbopack(Next.js 16)은 node_modules의 압축된 CSS에서 빈 선택자를 파싱하지 못합니다. `src/styles/`로 복사해두면 이 문제를 우회할 수 있습니다.
