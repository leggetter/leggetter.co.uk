import { chromium } from 'playwright-core';

const OUT = process.argv[2];
const TAG = process.argv[3] ?? 'now';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

await page.goto('http://localhost:4322/deadball/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(1000);

const box = await page.locator('#pitch').boundingBox();
for (const [id, label] of [
  ['behind-taker', 'Behind the taker'],
  ['angled-behind', 'Angled, from above'],
  ['keeper-cam', 'Behind the goal'],
]) {
  await page.locator('#views button', { hasText: label }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${TAG}-${id}.png`, clip: box });
}

// Back to the default, then take a shot so the flight path is exercised.
await page.locator('#views button', { hasText: 'Behind the taker' }).click();
await page.waitForTimeout(400);
const sx = box.x + box.width / 2;
const sy = box.y + box.height * 0.78;
await page.mouse.move(sx, sy);
await page.mouse.down();
for (let s = 1; s <= 12; s++) {
  await page.mouse.move(sx + 13 * s, sy - 12 * s);
  await page.waitForTimeout(10);
}
await page.waitForTimeout(180);
await page.mouse.up();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/${TAG}-flight.png`, clip: box });
await page.waitForTimeout(2000);

const log = await page.evaluate(() => window.penaltyLog.all());
console.log(`${TAG}: shots logged ${log.length}, viewId ${log[0]?.viewId}`);
console.log(`${TAG}: errors ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close();
