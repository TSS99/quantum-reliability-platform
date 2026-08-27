import { test } from '@playwright/test';

// Design-inspection pass (not a CI assertion): capture the surfaces at desktop + mobile so the
// redesign can be judged from pixels rather than from intent. Skipped unless SHOTS=1.
const SHOTS = process.env.SHOTS === '1';

const PAGES: [string, string][] = [
  ['landing', '/'],
  ['overview', '/#/overview'],
  ['new-analysis', '/#/new-analysis'],
  ['qec-lab', '/#/qec-lab'],
  ['hardware', '/#/hardware'],
];

test.describe('design shots', () => {
  test.skip(!SHOTS, 'set SHOTS=1 to capture');

  for (const [name, path] of PAGES) {
    test(`desktop ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForTimeout(1400); // let entrance motion settle
      await page.screenshot({ path: `shots/${name}-desktop.png`, fullPage: false });
    });
  }

  test('mobile landing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(1400);
    await page.screenshot({ path: 'shots/landing-mobile.png', fullPage: false });
  });

  test('light theme overview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/overview');
    await page.getByRole('button', { name: /switch to light theme/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shots/overview-light.png', fullPage: false });
  });
});
