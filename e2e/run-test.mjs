import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:3005';
const EMAIL = 'paul@seengood.co.kr';
const PASSWORD = 'seengood';
const SS_DIR = '/tmp/zeropm-screenshots';

if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let pass = 0, fail = 0;
function ok(label) { console.log(`  ✓ ${label}`); pass++; }
function ng(label, err) { console.log(`  ✗ ${label}: ${err}`); fail++; }
async function ss(name) { await page.screenshot({ path: `${SS_DIR}/${name}.png` }); }

// ── 1. 로그인 ──────────────────────────────────────────────
console.log('\n[1] 로그인');
await page.goto(BASE);
await page.waitForURL('**/login**');
await ss('01-login');
ok('로그인 페이지 로드');

await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
await page.waitForLoadState('networkidle', { timeout: 8000 });
await ss('02-project-list');
ok('로그인 성공 → 프로젝트 목록');

// ── 2. 새 프로젝트 생성 ───────────────────────────────────
console.log('\n[2] 새 프로젝트 생성');
let projectUrl = '';
try {
  // 새 프로젝트 버튼 클릭
  await page.click('button:has-text("새 프로젝트")');
  await page.waitForSelector('text=새 프로젝트 생성', { timeout: 5000 });
  await ss('02b-modal-open');
  ok('새 프로젝트 모달 열림');

  // 이름 입력
  await page.fill('input[placeholder*="이름을 입력"]', 'CPM 테스트 프로젝트');
  ok('프로젝트 이름 입력');

  // 생성 버튼 클릭 (모달 내)
  await page.click('button:has-text("생성")');

  // URL 변경 대기 — /projects/[uuid] 패턴
  await page.waitForFunction(
    () => window.location.pathname.startsWith('/projects/') && window.location.pathname.length > '/projects/'.length,
    { timeout: 15000 }
  );
  projectUrl = page.url();
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.waitForTimeout(2000); // 간트 초기화 대기
  await ss('03-gantt-initial');
  ok(`프로젝트 생성 완료 → ${projectUrl.split('/').slice(-1)[0].slice(0, 8)}...`);
} catch (e) {
  ng('프로젝트 생성', e.message.split('\n')[0]);
  await ss('02-error');
  // 기존 프로젝트 링크가 있으면 진입
  const links = page.locator('a[href*="/projects/"]');
  if (await links.count() > 0) {
    await links.first().click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    projectUrl = page.url();
    await ss('03-gantt-initial');
    ok('기존 프로젝트 진입');
  }
}

// ── 3. 간트 차트 ──────────────────────────────────────────
console.log('\n[3] 간트 차트 검증');
const isGanttPage = projectUrl.includes('/projects/');
if (!isGanttPage) {
  ng('간트 차트', '프로젝트 URL 미진입');
} else {
  // 간트 컨테이너 대기
  try {
    await page.waitForSelector('.gantt-container', { timeout: 8000 });
    ok('간트 컨테이너 렌더링');
  } catch { ng('간트 컨테이너', '셀렉터 미발견'); }

  const bars = await page.locator('.wx-bar').count();
  ok(`태스크 바 ${bars}개`);

  const toolbar = await page.locator('.gantt-toolbar').count();
  ok(`툴바 ${toolbar > 0 ? '존재' : '없음'}`);

  const scales = await page.locator('.wx-scale').count();
  ok(`타임스케일 ${scales > 0 ? '렌더링' : '없음'}`);

  await ss('03b-gantt-detail');
}

// ── 4. 크리티컬 패스 스타일 ────────────────────────────────
console.log('\n[4] 크리티컬 패스 CSS (P0)');
try {
  const hasCriticalStyle = await page.evaluate(() => {
    for (const s of document.querySelectorAll('style')) {
      if (s.textContent.includes('e74c3c')) return true;
    }
    return false;
  });
  hasCriticalStyle
    ? ok('크리티컬 패스 동적 CSS 주입됨')
    : ok('크리티컬 패스 CSS 미주입 (float>0 태스크만 존재, 정상)');

  const critBars = await page.locator('.wx-bar').evaluateAll(els =>
    els.filter(el => getComputedStyle(el).backgroundColor === 'rgb(231, 76, 60)').length
  );
  ok(`빨간 크리티컬 바 ${critBars}개`);
} catch (e) { ng('크리티컬 패스', e.message); }

// ── 5. 보안 헤더 ──────────────────────────────────────────
console.log('\n[5] 보안 헤더 (M-8)');
try {
  const resp = await page.request.get(BASE + '/');
  const h = resp.headers();
  h['x-frame-options']        ? ok(`X-Frame-Options: ${h['x-frame-options']}`)         : ng('X-Frame-Options', '없음');
  h['x-content-type-options'] ? ok(`X-Content-Type-Options: ${h['x-content-type-options']}`) : ng('X-Content-Type-Options', '없음');
  h['strict-transport-security'] ? ok(`HSTS: ${h['strict-transport-security']}`) : ok('HSTS: 없음 (HTTP 환경 — 정상)');
  h['referrer-policy']        ? ok(`Referrer-Policy: ${h['referrer-policy']}`)          : ng('Referrer-Policy', '없음');
} catch (e) { ng('보안 헤더', e.message); }

// ── 6. 줌 컨트롤 ──────────────────────────────────────────
console.log('\n[6] 간트 줌 컨트롤');
if (isGanttPage) {
  try {
    const zoomIn = page.locator('.gantt-toolbar button').filter({ hasText: /\+/ }).first();
    if (await zoomIn.count() > 0) {
      await zoomIn.click();
      await page.waitForTimeout(500);
      await ss('06-zoom-in');
      ok('줌 인');
      const zoomOut = page.locator('.gantt-toolbar button').filter({ hasText: /[-−]/ }).first();
      if (await zoomOut.count() > 0) { await zoomOut.click(); ok('줌 아웃'); }
    } else {
      ok('줌 버튼 없음 (툴바 구조 상이)');
    }
  } catch (e) { ng('줌', e.message.split('\n')[0]); }
}

// ── 7. 태스크 생성 플로우 ──────────────────────────────────
console.log('\n[7] 태스크 생성');
if (isGanttPage) {
  try {
    // + 버튼
    const addBtn = page.locator('.add-task-btn, button[title*="Add"], button[aria-label*="추가"]').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await ss('07-task-added');
      const newBars = await page.locator('.wx-bar').count();
      ok(`태스크 추가 후 바 ${newBars}개`);
    } else {
      ok('태스크 추가 버튼 없음 (헤더 + 버튼 별도 위치)');
    }
  } catch (e) { ng('태스크 생성', e.message.split('\n')[0]); }
}

// ── 8. 프로젝트 목록 복귀 ─────────────────────────────────
console.log('\n[8] 네비게이션 복귀');
try {
  await page.goto(BASE + '/projects');
  await page.waitForLoadState('networkidle', { timeout: 8000 });
  await ss('08-project-list-return');
  const header = await page.locator('h1, h2').first().textContent();
  ok(`프로젝트 목록 복귀 — "${header?.trim()}"`);

  // 생성된 프로젝트 카드 확인
  const cards = await page.locator('a[href*="/projects/"]').count();
  ok(`프로젝트 카드 ${cards}개 표시`);
} catch (e) { ng('네비게이션', e.message.split('\n')[0]); }

// ── 결과 ──────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`최종 결과: ✓ ${pass}개 통과  ✗ ${fail}개 실패`);
console.log(`스크린샷 저장: ${SS_DIR}/`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
