import { test, expect } from '@playwright/test';

/**
 * Critical-path E2E smoke tests for ZeroPM.
 *
 * These tests verify the absolute minimum: the app loads and key surfaces
 * are reachable. Auth-gated tests are skipped when no session is available.
 */

test.describe('ZeroPM smoke tests', () => {
  test('page loads and title contains ZeroPM or Project', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    const titleMatches =
      title.toLowerCase().includes('zeropm') ||
      title.toLowerCase().includes('project');
    expect(titleMatches).toBe(true);
  });

  test('gantt container element exists after login flow', async ({ page }) => {
    // Navigate to the root; if auth is required we will be redirected to a
    // login page. We attempt a minimal login using env-provided credentials
    // and then check for the gantt container.  The test is skipped when the
    // required env vars are absent so CI pipelines without secrets don't fail.
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'E2E_EMAIL / E2E_PASSWORD not set — skipping auth-gated test');
      return;
    }

    await page.goto('/');

    // If redirected to login, fill credentials and submit.
    if (page.url().includes('login') || page.url().includes('auth')) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();
      // Wait for navigation away from the auth page.
      await page.waitForURL((url) => !url.toString().includes('login') && !url.toString().includes('auth'), {
        timeout: 15_000,
      });
    }

    // The SVAR Gantt component renders inside a container with the wx-gantt
    // class or a data attribute set by GanttView.jsx.
    const ganttContainer = page.locator('.wx-gantt, [data-testid="gantt-container"]').first();
    await expect(ganttContainer).toBeVisible({ timeout: 15_000 });
  });
});
