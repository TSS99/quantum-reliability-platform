import { test, expect } from '@playwright/test';

test('landing renders and links into the lab', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /reliability intelligence/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /launch reliability lab/i })).toBeVisible();
});
