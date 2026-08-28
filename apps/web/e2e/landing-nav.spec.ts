import { test, expect } from '@playwright/test';

// Regression. The landing nav bar shipped with href="#workflow", which HashRouter consumes as a
// route and resolves to nothing — the same 404 the hero button once caused, reintroduced by a
// later change. These links are buttons now; this test is what stops it coming back a third time.
test('landing section link scrolls without breaking the route', async ({ page }) => {
  await page.goto('/');
  const before = page.url();

  await page.getByRole('button', { name: 'Capabilities', exact: true }).click();
  await expect(page.locator('#capabilities')).toBeInViewport({ timeout: 8000 });

  // The decisive assertion: the router hash is untouched, so the app did not navigate anywhere.
  expect(page.url()).toBe(before);
  await expect(page.getByRole('button', { name: 'Capabilities', exact: true })).toHaveCount(1);
});
