import { test } from '@playwright/test';
test.skip(process.env.SHOTS !== '1', 'set SHOTS=1');
test('custom circuit view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/#/new-analysis');
  await page.getByRole('button', { name: 'Your circuit' }).click();
  await page.getByRole('button', { name: 'QAOA layer (4 qubits)' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/custom-circuit.png' });
});
