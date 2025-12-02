-- ==========================================
-- 사용자 프로필 자동 생성 트리거
-- ==========================================

-- 1. 트리거 함수 생성: 새 사용자 생성 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거 생성: auth.users에 새 사용자 추가 시 실행
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 기존 사용자를 위한 프로필 생성 (이미 가입한 사용자)
INSERT INTO public.user_profiles (id, display_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', SPLIT_PART(email, '@', 1)) as display_name,
  'member' as role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 완료 메시지
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.user_profiles;
  RAISE NOTICE '✅ 프로필 자동 생성 트리거 설정 완료!';
  RAISE NOTICE '현재 user_profiles 레코드 수: %', v_count;
END $$;
