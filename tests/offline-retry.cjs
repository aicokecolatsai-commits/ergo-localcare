const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const url = new URL(process.env.ERGO_TEST_URL || 'http://127.0.0.1:8194/');
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') throw new Error('此測試僅允許本機模擬器');
  url.searchParams.set('session', 'offline_test_' + Date.now());
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  try {
    await page.goto(url.href);
    await page.waitForTimeout(1000);
    await page.locator('.role-choice').first().click();
    await page.locator('#btn-bodymap-next').click();
    await context.setOffline(true);
    for (let i = 0; i < 4; i++) { await page.locator('.option-btn').first().click(); await page.waitForTimeout(200); }
    await page.locator('#step-result').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => ErgoPending.list().length), 1);
    assert.match(await page.locator('#cloud-pending-status').innerText(), /尚未確認送達/);
    assert.ok(dialogs.some(text => text.includes('保留')));
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await context.setOffline(false);
    await page.goto(url.href);
    await page.waitForFunction(() => ErgoPending.list().length === 0, null, { timeout: 30000 });
    console.log('通過：斷線待送、重新開啟及恢復連線後自動送達');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
