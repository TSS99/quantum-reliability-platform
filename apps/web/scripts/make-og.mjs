/**
 * Renders scripts/og-card.html to public/og.png at 1200x630.
 *
 * Social scrapers do not accept SVG, so the card has to be a raster. It is produced here by
 * headless Chromium from checked-in HTML — deterministic, reviewable in a diff, and regenerable
 * by anyone with `node scripts/make-og.mjs`.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file://' + resolve(here, 'og-card.html'), { waitUntil: 'networkidle' });
await page.screenshot({ path: resolve(here, '../public/og.png') });
await browser.close();
console.log('wrote public/og.png');
