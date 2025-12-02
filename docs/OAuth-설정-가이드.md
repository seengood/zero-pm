# OAuth 설정 가이드

ZeroPM 프로젝트에서 Google과 GitHub 소셜 로그인을 설정하는 방법입니다.

---

## 1. Google OAuth 설정

### 1.1 Google Cloud Console에서 OAuth 클라이언트 생성

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택 또는 새 프로젝트 생성

2. **OAuth 동의 화면 구성**
   - 왼쪽 메뉴: **APIs & Services** > **OAuth consent screen**
   - User Type: **External** 선택
   - 앱 정보 입력:
     - App name: `ZeroPM`
     - User support email: 본인 이메일
     - Developer contact email: 본인 이메일
   - **Save and Continue**

3. **Scopes 추가**
   - **Add or Remove Scopes** 클릭
   - 다음 스코프 선택:
     - `userinfo.email`
     - `userinfo.profile`
   - **Update** > **Save and Continue**

4. **Test users 추가** (선택사항)
   - 개발 중에는 테스트 사용자만 로그인 가능
   - **Add Users**로 본인 이메일 추가
   - **Save and Continue**

5. **OAuth 클라이언트 ID 생성**
   - 왼쪽 메뉴: **Credentials**
   - **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: `ZeroPM Web Client`
   - **Authorized redirect URIs** 추가:
     ```
     https://rszftuyndidleofydsbb.supabase.co/auth/v1/callback
     ```
   - **Create** 클릭
   - **Client ID**와 **Client Secret** 복사 (나중에 사용)

### 1.2 Supabase에 Google OAuth 추가

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택: `rszftuyndidleofydsbb`

2. **Authentication 설정**
   - 왼쪽 메뉴: **Authentication** > **Providers**
   - **Google** 찾아서 클릭

3. **Google OAuth 활성화**
   - **Enable Sign in with Google** 토글 ON
   - **Client ID**: Google Cloud Console에서 복사한 Client ID 붙여넣기
   - **Client Secret**: Google Cloud Console에서 복사한 Client Secret 붙여넣기
   - **Save** 클릭

---

## 2. GitHub OAuth 설정

### 2.1 GitHub에서 OAuth 앱 생성

1. **GitHub Settings 접속**
   - https://github.com/settings/developers
   - **OAuth Apps** > **New OAuth App** 클릭

2. **OAuth 앱 정보 입력**
   - Application name: `ZeroPM`
   - Homepage URL: `http://localhost:3005` (개발용) 또는 실제 도메인
   - Application description: `Zero-based Project Management Tool`
   - **Authorization callback URL**:
     ```
     https://rszftuyndidleofydsbb.supabase.co/auth/v1/callback
     ```
   - **Register application** 클릭

3. **Client ID 및 Secret 생성**
   - **Client ID** 복사
   - **Generate a new client secret** 클릭
   - **Client Secret** 복사 (한 번만 표시됨!)

### 2.2 Supabase에 GitHub OAuth 추가

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택: `rszftuyndidleofydsbb`

2. **Authentication 설정**
   - 왼쪽 메뉴: **Authentication** > **Providers**
   - **GitHub** 찾아서 클릭

3. **GitHub OAuth 활성화**
   - **Enable Sign in with GitHub** 토글 ON
   - **Client ID**: GitHub에서 복사한 Client ID 붙여넣기
   - **Client Secret**: GitHub에서 복사한 Client Secret 붙여넣기
   - **Save** 클릭

---

## 3. 로컬 개발 환경 설정

### 3.1 Redirect URL 추가 (개발용)

개발 환경에서 테스트하려면 로컬 URL도 추가해야 합니다.

#### Google Cloud Console
- **Credentials** > OAuth 클라이언트 선택
- **Authorized redirect URIs**에 추가:
  ```
  http://localhost:3005/auth/callback
  ```

#### GitHub OAuth App
- OAuth 앱 설정에서 **Authorization callback URL**에 추가:
  ```
  http://localhost:3005/auth/callback
  ```

### 3.2 Supabase 설정

Supabase Dashboard에서:
- **Authentication** > **URL Configuration**
- **Redirect URLs**에 추가:
  ```
  http://localhost:3005/auth/callback
  ```

---

## 4. 테스트

### 4.1 개발 서버 실행

```bash
cd /Users/sheplim/develop/work/zero-pm
npm run dev
```

### 4.2 로그인 테스트

1. 브라우저에서 http://localhost:3005/login 접속
2. **Google로 로그인** 버튼 클릭
3. Google 계정 선택 및 권한 승인
4. 로그인 성공 시 홈 페이지로 리다이렉트

5. 로그아웃 후 **GitHub으로 로그인** 버튼 클릭
6. GitHub 계정 권한 승인
7. 로그인 성공 시 홈 페이지로 리다이렉트

---

## 5. 프로덕션 배포 시

### 5.1 실제 도메인 추가

프로덕션 배포 시 실제 도메인을 추가해야 합니다:

#### Google Cloud Console
```
https://your-domain.com/auth/callback
```

#### GitHub OAuth App
```
https://your-domain.com/auth/callback
```

#### Supabase
```
https://your-domain.com/auth/callback
```

### 5.2 환경 변수 확인

`.env.local` 파일이 프로덕션에 포함되지 않도록 주의:
- Vercel, Netlify 등의 플랫폼에서는 환경 변수를 별도로 설정
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 6. 문제 해결

### "Redirect URI mismatch" 오류

- Google/GitHub OAuth 앱 설정에서 Redirect URI가 정확히 일치하는지 확인
- Supabase의 Redirect URL 설정 확인
- 프로토콜(http/https) 확인

### "Invalid client" 오류

- Client ID와 Client Secret이 정확한지 확인
- Supabase에 올바르게 입력되었는지 확인

### 로그인 후 리다이렉트 안 됨

- `src/app/auth/callback/page.tsx` 파일 확인
- 브라우저 콘솔에서 오류 메시지 확인

---

## 참고 자료

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
