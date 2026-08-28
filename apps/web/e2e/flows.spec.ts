import { test, expect } from '@playwright/test';

// §45 required E2E flows A–D, run against the built app (HashRouter, so deep links use /#/...).

test('Flow A — landing to a reliability recommendation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /reliability intelligence for quantum workloads/i })).toBeVisible();
  await page.getByRole('link', { name: /launch reliability lab/i }).click();
  await expect(page).toHaveURL(/#\/overview/);

  await page.getByRole('link', { name: /^New Analysis$/ }).first().click();
  await expect(page).toHaveURL(/#\/new-analysis/);
  await expect(page.getByRole('heading', { name: /choose a reliability strategy/i })).toBeVisible();

  // Change the goal priority and confirm a recommendation verdict is shown.
  await page.getByRole('button', { name: 'Maximize accuracy' }).click();
  await expect(page.getByText(/recommended to run|run with warnings|do not run/i).first()).toBeVisible();
});

test('Flow B — QEC Lab threshold plot responds to controls', async ({ page }) => {
  await page.goto('/#/qec-lab');
  await expect(page.getByRole('heading', { name: /logical error vs physical error/i })).toBeVisible();
  await expect(page.getByText('Simulated')).toBeVisible();
  await page.getByRole('button', { name: /phenomenological/i }).click();
  await expect(page.getByRole('img', { name: /logical error rate versus physical error rate/i })).toBeVisible();
});

test('Flow C — calibration drift is visible with validity state', async ({ page }) => {
  await page.goto('/#/hardware');
  await expect(page.getByRole('heading', { name: /backend profiles/i })).toBeVisible();
  await expect(page.getByText(/calibration drift/i).first()).toBeVisible();
  // At least one backend carries a non-stable validity state in the seeded data.
  await expect(page.getByText(/stale|watch|significant drift/i).first()).toBeVisible();
});

test('Flow D — every route in the 9-route IA is reachable', async ({ page }) => {
  const routes = [
    '/#/overview',
    '/#/new-analysis',
    '/#/workloads',
    '/#/hardware',
    '/#/strategies',
    '/#/qec-lab',
    '/#/experiments',
    '/#/integrations',
    '/#/settings',
  ];
  for (const r of routes) {
    await page.goto(r);
    await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
  }
});


// Regression: the app runs on HashRouter, so an in-page href="#workflow" would hijack the router
// hash and render a blank/404 view. The control must scroll and leave the route intact.
test('Explore the workflow scrolls without breaking the route', async ({ page }) => {
  await page.goto('/');
  const before = page.url();
  await page.getByRole('button', { name: /explore the workflow/i }).click();
  await page.waitForTimeout(700);
  // still on the landing route — not navigated to a dead #workflow route
  expect(page.url()).toBe(before);
  await expect(page.getByRole('heading', { name: /reliability intelligence/i })).toBeVisible();
  // and the workflow section is now in view
  await expect(page.getByText('Submit workload')).toBeInViewport();
});
