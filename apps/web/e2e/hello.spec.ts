import { test, expect } from '@playwright/test';

test('hello route renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /quantum reliability platform/i })).toBeVisible();
});
