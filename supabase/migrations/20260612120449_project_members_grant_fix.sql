-- Migration: project_members_grant_fix
-- Created: 20260612120449
-- Fix: GRANT privileges missing on project_members (and other tables without explicit grants)
--      Migrations were created without GRANT statements, causing "permission denied" errors
--      for authenticated users trying to access these tables.

BEGIN;

-- projects, tasks, links, baselines, user_profiles, interim_plans: 누락된 DML GRANT 추가
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.links TO authenticated;
GRANT ALL ON TABLE public.links TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.baselines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.baselines TO authenticated;
GRANT ALL ON TABLE public.baselines TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interim_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interim_plans TO authenticated;
GRANT ALL ON TABLE public.interim_plans TO service_role;

-- project_members: authenticated users need SELECT/INSERT/DELETE (no UPDATE needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_members TO authenticated;
GRANT ALL ON TABLE public.project_members TO service_role;

-- resources / assignments / costs: Phase 4 tables, grant now for RLS policy evaluation
-- shared_links 는 Week 2 마이그레이션에서 테이블 생성 시 함께 GRANT 예정
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resources TO authenticated;
GRANT ALL ON TABLE public.resources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignments TO authenticated;
GRANT ALL ON TABLE public.assignments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.costs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.costs TO authenticated;
GRANT ALL ON TABLE public.costs TO service_role;

COMMIT;
