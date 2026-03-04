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

  test('header displays note count', async ({ page }) => {
    const countText = await page.evaluate(() => {
      const header = document.querySelector('notes-app')
        ?.shadowRoot?.querySelector('app-header')
        ?.shadowRoot?.querySelector('.count');
      return header?.textContent ?? null;
    });
    expect(countText).toContain('0');
  });

  test('can add a note via state mutation', async ({ page }) => {
    // Directly call the add-note! function via the state module
    await page.evaluate(() => {
      // Access the notes atom via app-header's rich prop
      const notesApp = document.querySelector('notes-app') as any;
      const sr = notesApp?.shadowRoot;
      const header = sr?.querySelector('app-header') as any;
      // The rich prop 'note-count' holds the notes atom
      const notesAtom = header?.['note-count'];
      if (notesAtom) {
        // Simulate add-note by swapping the atom
        const vec = notesAtom.deref();
        notesAtom.reset(vec.conj({ id: 1, text: 'Test', created: 'now' }));
      }
    });
    await page.waitForTimeout(500);

    // Verify header count updated reactively
    const countText = await page.evaluate(() => {
      const header = document.querySelector('notes-app')
        ?.shadowRoot?.querySelector('app-header')
        ?.shadowRoot?.querySelector('.count');
      return header?.textContent ?? null;
    });
    expect(countText).toContain('1');
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
