# Schema Enhancement Summary

## 추가된 필드 (tasks 테이블)

### CPM 계산 결과 필드
- `early_start` (TIMESTAMPTZ): 조기 시작일 (ES)
- `early_finish` (TIMESTAMPTZ): 조기 종료일 (EF)
- `late_start` (TIMESTAMPTZ): 늦은 시작일 (LS)
- `late_finish` (TIMESTAMPTZ): 늦은 완료일 (LF)
- `total_float` (INTEGER): 총 여유 시간 (분/시간 단위)
- `is_critical` (BOOLEAN): 임계 경로 표시

### 낙관적 잠금 (Optimistic Locking)
- `version` (INTEGER): 버전 번호 (충돌 감지용)
- `updated_at` (TIMESTAMPTZ): 최종 수정 시간

## 추가된 테이블

### 1. resources (자원 관리)
- 인력, 장비, 자재 등 갱신 가능한 자원 정의
- 최대 가용량(capacity) 및 단위당 비용 저장

### 2. assignments (자원 할당)
- Task와 Resource 간의 다대다 관계
- 필요 단위(required_units): 50%, 100%, 200% 등

### 3. costs (비용 추적)
- Task별 고정 비용 및 시간당 비용
- EVM 분석을 위한 기초 데이터

### 4. baselines (기준선)
- 프로젝트당 최대 11개의 기준선 저장
- 초기 계획 대비 편차 분석용

### 5. baseline_tasks (기준선 스냅샷)
- 기준선 설정 시점의 Task 데이터 스냅샷
- 약 20개의 참조점 저장

### 6. interim_plans (중간 계획)
- 프로젝트당 최대 10개의 중간 계획
- 시작일/종료일만 저장

## RLS 정책
모든 새 테이블에 대해 프로젝트 소유자 및 멤버만 접근 가능하도록 RLS 정책 적용

## 참고 문서
- 기능정의: `docs/01-기능정의/03-wbs/핵심 프로젝트 관리 및 WBS.md`
- 기능정의: `docs/01-기능정의/05-resource/자원 및 비용 관리.md`
- 연구 문서: `docs/웹 기반 프로젝트 관리 도구 개발 연구 ver 2.0.md`
