import { test, expect } from '@playwright/test';

test.describe('Task Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the app title', async ({ page }) => {
    // task-app is a web component with Shadow DOM
    const title = page.locator('task-app').locator('h1');
    await expect(title).toHaveText('Task Manager');
  });

  test('shows stat cards with zero counts initially', async ({ page }) => {
    const statCards = page.locator('stat-card');
    await expect(statCards).toHaveCount(3);
  });

  test('can add a task', async ({ page }) => {
    // Find the input inside task-input shadow DOM
    const input = page.locator('task-input').locator('input');
    await input.fill('Buy groceries');

    const addBtn = page.locator('task-input').locator('button');
    await addBtn.click();

    // Task should appear in task-list
    const taskItems = page.locator('task-item');
    await expect(taskItems).toHaveCount(1);

    // Task text should be visible
    const taskText = taskItems.first().locator('.text');
    await expect(taskText).toHaveText('Buy groceries');
  });

  test('can add multiple tasks', async ({ page }) => {
    const input = page.locator('task-input').locator('input');
    const addBtn = page.locator('task-input').locator('button');

    await input.fill('Task 1');
    await addBtn.click();

    await input.fill('Task 2');
    await addBtn.click();

    await input.fill('Task 3');
    await addBtn.click();

    const taskItems = page.locator('task-item');
    await expect(taskItems).toHaveCount(3);
  });

  test('can add task with Enter key', async ({ page }) => {
    const input = page.locator('task-input').locator('input');
    await input.fill('Enter task');
    await input.press('Enter');

    const taskItems = page.locator('task-item');
    await expect(taskItems).toHaveCount(1);
  });

  test('can toggle task done state', async ({ page }) => {
    // Add a task first
    const input = page.locator('task-input').locator('input');
    await input.fill('Test task');
    await input.press('Enter');

    // Click the checkbox
    const checkbox = page.locator('task-item').locator('input[type="checkbox"]');
    await checkbox.click();

    // Task text should have line-through style
    const taskText = page.locator('task-item').locator('.text');
    await expect(taskText).toHaveCSS('text-decoration-line', 'line-through');
  });

  test('can delete a task', async ({ page }) => {
    // Add a task
    const input = page.locator('task-input').locator('input');
    await input.fill('Delete me');
    await input.press('Enter');

    await expect(page.locator('task-item')).toHaveCount(1);

    // Click delete button
    const deleteBtn = page.locator('task-item').locator('.delete');
    await deleteBtn.click();

    await expect(page.locator('task-item')).toHaveCount(0);
  });

  test('stat cards update when tasks change', async ({ page }) => {
    // Add two tasks
    const input = page.locator('task-input').locator('input');
    const addBtn = page.locator('task-input').locator('button');

    await input.fill('Task A');
    await addBtn.click();
    await input.fill('Task B');
    await addBtn.click();

    // Total should be 2
    const statCounts = page.locator('stat-card').locator('.count');
    await expect(statCounts.nth(0)).toHaveText('2'); // Total
    await expect(statCounts.nth(1)).toHaveText('2'); // Active
    await expect(statCounts.nth(2)).toHaveText('0'); // Done

    // Complete one task
    const checkbox = page.locator('task-item').first().locator('input[type="checkbox"]');
    await checkbox.click();

    await expect(statCounts.nth(0)).toHaveText('2'); // Total
    await expect(statCounts.nth(1)).toHaveText('1'); // Active
    await expect(statCounts.nth(2)).toHaveText('1'); // Done
  });

  test('filter buttons work', async ({ page }) => {
    // Add two tasks, complete one
    const input = page.locator('task-input').locator('input');
    await input.fill('Active task');
    await input.press('Enter');
    await input.fill('Done task');
    await input.press('Enter');

    // Complete second task
    const checkboxes = page.locator('task-item').locator('input[type="checkbox"]');
    await checkboxes.nth(1).click();

    // Click "active" filter
    const filterBtns = page.locator('filter-bar').locator('button');
    await filterBtns.nth(1).click(); // "active" button

    await expect(page.locator('task-item')).toHaveCount(1);

    // Click "done" filter
    await filterBtns.nth(2).click(); // "done" button
    await expect(page.locator('task-item')).toHaveCount(1);

    // Click "all" filter
    await filterBtns.nth(0).click(); // "all" button
    await expect(page.locator('task-item')).toHaveCount(2);
  });
});
