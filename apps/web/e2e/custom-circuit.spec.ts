import { test, expect } from '@playwright/test';

// Tier 2: a user's own circuit drives the optimizer, not just the built-in examples.
test('a pasted circuit is parsed and re-optimises', async ({ page }) => {
  await page.goto('/#/new-analysis');
  await page.getByRole('button', { name: 'Your circuit' }).click();

  // the default template parses
  await expect(page.getByText(/Parsed OpenQASM 2/)).toBeVisible();

  // switching to a bigger circuit changes the analysed profile
  await page.getByRole('button', { name: 'GHZ (5 qubits)' }).click();
  await expect(page.getByText(/Parsed OpenQASM 2 · 5 qubits/)).toBeVisible();

  // and the optimizer still produces a verdict for it
  await expect(page.getByText(/recommended to run|run with warnings|do not run/i).first()).toBeVisible();
});

test('an invalid circuit is refused with a reason, not a crash', async ({ page }) => {
  await page.goto('/#/new-analysis');
  await page.getByRole('button', { name: 'Your circuit' }).click();
  await page.getByLabel('OpenQASM circuit').fill('this is not a circuit');
  await expect(page.getByText(/No qubit register found/i)).toBeVisible();
  // the app is still alive
  await expect(page.getByRole('heading', { name: /choose a reliability strategy/i })).toBeVisible();
});
