import { test, expect } from '@playwright/test';

test.describe('Multi-Namespace App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test('renders the notes-app component', async ({ page }) => {
    const app = page.locator('notes-app');
    await expect(app).toHaveCount(1);
  });

  test('multi-file build produces working bundle', async ({ page }) => {
    // The page loads and renders the root component — verifies that
    // cross-namespace imports (app.core -> app.state, app.utils,
    // app.components.*) all resolve correctly during vite build.
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    const app = page.locator('notes-app');
    await expect(app).toHaveCount(1);
  });

  test('nested web components are registered', async ({ page }) => {
    // Verify that components from different namespaces are all registered
    const registered = await page.evaluate(() => {
      return ['notes-app', 'app-header', 'note-input', 'note-item'].map(
        tag => ({ tag, defined: !!customElements.get(tag) })
      );
    });
    for (const { tag, defined } of registered) {
      expect(defined, `${tag} should be registered`).toBe(true);
    }
  });
});
