import { test, expect } from '@playwright/test';

// The sidebar is a drawer below `md`. Before this existed the full nav list simply stacked on top
// of every page, pushing content off the first screen on a phone.
test.use({ viewport: { width: 390, height: 844 } });

test('drawer opens, navigates, and closes itself', async ({ page }) => {
  await page.goto('/#/overview');

  const nav = page.locator('#primary-nav');
  await expect(nav).toBeHidden();

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(nav).toBeVisible();

  await nav.getByRole('link', { name: 'Hardware' }).click();
  await expect(page).toHaveURL(/#\/hardware/);
  // Navigating dismisses it — leaving the drawer over the new page would be the obvious bug.
  await expect(nav).toBeHidden();
});

test('escape closes the drawer', async ({ page }) => {
  await page.goto('/#/overview');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#primary-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#primary-nav')).toBeHidden();
});

