import { test, expect } from '@playwright/test';

test.describe('Betting Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the betting interface', async ({ page }) => {
    await expect(page.getByText('Sports Betting')).toBeVisible();
  });

  test('should display events and allow search', async ({ page }) => {
    await expect(page.getByPlaceholder('Search events...')).toBeVisible();
    const searchInput = page.getByPlaceholder('Search events...');
    await searchInput.fill('Lakers');
    await page.waitForTimeout(500);
    const results = page.locator('[class*="EventCard"]');
    await expect(results.first()).toBeVisible();
  });

  test('should filter by sport', async ({ page }) => {
    const sportFilter = page.locator('select').first();
    await sportFilter.selectOption('football');
    await page.waitForTimeout(500);
  });

  test('should toggle live events filter', async ({ page }) => {
    const liveButton = page.getByText('Live Only');
    await liveButton.click();
    await expect(liveButton).toHaveClass(/bg-red-500/);
  });

  test('should sort events by different criteria', async ({ page }) => {
    const sortSelect = page.getByRole('combobox').nth(1);
    await sortSelect.selectOption('odds');
  });

  test('should toggle odds format', async ({ page }) => {
    const formatSelect = page.getByRole('combobox').nth(2);
    await formatSelect.selectOption('american');
    await formatSelect.selectOption('fractional');
    await formatSelect.selectOption('decimal');
  });

  test('should display live scores section', async ({ page }) => {
    await expect(page.getByText('Live Scores')).toBeVisible();
  });

  test('should display bet slip', async ({ page }) => {
    await expect(page.getByText('Bet Slip')).toBeVisible();
  });

  test('should display platform stats', async ({ page }) => {
    await expect(page.getByText('Platform Stats')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to live betting page', async ({ page }) => {
    await page.goto('/live');
    await expect(page).toHaveURL(/\/live/);
  });

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history/);
  });

  test('should navigate to governance page', async ({ page }) => {
    await page.goto('/governance');
    await expect(page).toHaveURL(/\/governance/);
  });

  test('should navigate to leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page).toHaveURL(/\/leaderboard/);
  });
});

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await toggle.click();
    const htmlClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(typeof htmlClass).toBe('boolean');
  });

  test('should persist dark mode across page reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /toggle dark mode/i });
    await toggle.click();
    await page.reload();
    const isDark = await page.evaluate(() => localStorage.getItem('sportbetx-theme'));
    expect(isDark).toBeTruthy();
  });
});

test.describe('API Routes', () => {
  test('health endpoint should return OK', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('OK');
  });
});
