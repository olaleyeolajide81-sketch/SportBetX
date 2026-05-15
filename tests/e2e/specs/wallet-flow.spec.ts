import { test, expect } from '@playwright/test';

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display connect wallet button', async ({ page }) => {
    const connectButton = page.getByText('Connect Wallet');
    await expect(connectButton).toBeVisible();
  });

  test('should display wallet button text', async ({ page }) => {
    const connectButton = page.getByText('Connect Wallet');
    await expect(connectButton).toBeEnabled();
  });
});

test.describe('Responsive Design', () => {
  test('should display mobile menu button on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuButton = page.getByLabel('Toggle navigation menu');
    await expect(menuButton).toBeVisible();
  });

  test('should open navigation drawer on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByLabel('Toggle navigation menu').click();
    await expect(page.getByText('Menu')).toBeVisible();
  });

  test('should close navigation drawer on backdrop click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByLabel('Toggle navigation menu').click();
    await page.locator('[class*="bg-black/50"]').click();
    await expect(page.getByText('Menu')).not.toBeVisible();
  });
});

test.describe('Performance', () => {
  test('page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});
