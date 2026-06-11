-- 핵심 인덱스 7개 추가 (H-4)
--
-- ⚠️  CONCURRENTLY 제거: supabase db reset 파이프라인 모드에서 실행 불가.
--    프로덕션 적용 시 이미 수동으로 인덱스를 생성했다면 IF NOT EXISTS로 skip됨.
--
-- 누락 시 getTasks/getLinks/cascade scheduling/RLS 서브쿼리가 Sequential Scan으로 저하됨.
-- 특히 idx_links_source 부재 시 cascade scheduling 전파마다 links Full Scan 발생.

-- ① tasks(project_id) — getTasks() WHERE project_id, RLS 서브쿼리
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON tasks(project_id);

-- ② tasks(parent_id) WHERE NOT NULL — WBS 트리 탐색 (재귀 CTE)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id
  ON tasks(parent_id) WHERE parent_id IS NOT NULL;

-- ③ tasks(project_id, sort_order NULLS LAST) — 정렬 포함 Index Only Scan
CREATE INDEX IF NOT EXISTS idx_tasks_project_sort
  ON tasks(project_id, sort_order NULLS LAST);

-- ④ links(project_id) — getLinks() WHERE project_id
CREATE INDEX IF NOT EXISTS idx_links_project_id
  ON links(project_id);

-- ⑤ links(source) — 스케줄러 후행 링크 조회
CREATE INDEX IF NOT EXISTS idx_links_source
  ON links(source);

-- ⑥ links(target) — CPM 역방향 패스, 선행 조회
CREATE INDEX IF NOT EXISTS idx_links_target
  ON links(target);

-- ⑦ links(source, project_id) — 스케줄러 복합 필터 Index Only Scan
CREATE INDEX IF NOT EXISTS idx_links_source_project
  ON links(source, project_id);
