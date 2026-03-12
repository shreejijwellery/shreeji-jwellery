/**
 * E2E UI tests for Admin Pricing and Public Pricing (Playwright).
 * Run: npx playwright test e2e/admin-pricing.spec.js
 * Requires: npm run dev (or BASE_URL to running app)
 *
 * Set env for admin login (optional):
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=xxx
 * Or tests will only run unauthenticated checks (pricing page, login page).
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Admin Pricing & Credits UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('text=Sign in').or(page.locator('text=Login')).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="username"], input[placeholder*="Username"]').first()).toBeVisible();
  });

  test('pricing page loads and shows structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    await expect(
      page.locator('text=Credit Packs').or(page.locator('text=Get started')).or(page.locator('text=Sign in')).or(page.locator('text=Pricing')).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('signup page has referral code field', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page.locator('input[name="referralCode"], input[placeholder*="Referral"]').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Pricing (authenticated)', () => {
  test.skip(!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD, 'Set ADMIN_USERNAME and ADMIN_PASSWORD to run');

  test('admin can open pricing & offers and see tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', process.env.ADMIN_USERNAME);
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
    await page.goto(`${BASE_URL}/admin-pricing`);
    await expect(page.getByRole('button', { name: 'Packs' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Offers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Promo codes' })).toBeVisible();
  });
});
