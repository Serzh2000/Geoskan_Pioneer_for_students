import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const out = {
  console: [],
  requests: [],
  responses: [],
  requestFailed: [],
  checkpoints: []
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => out.console.push({ type: msg.type(), text: msg.text() }));
page.on('request', req => out.requests.push({ method: req.method(), url: req.url(), resourceType: req.resourceType() }));
page.on('response', res => out.responses.push({ status: res.status(), url: res.url() }));
page.on('requestfailed', req => out.requestFailed.push({ url: req.url(), errorText: req.failure()?.errorText || null }));

await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
out.checkpoints.push(await page.evaluate(() => ({
  readyState: document.readyState,
  hasOpenGuide: typeof (window).openMissionGuideModal === 'function',
  hasBlocklyGlobal: typeof (window).Blockly !== 'undefined',
  bodyTextSample: document.body.innerText.slice(0, 500)
})));

await page.evaluate(() => (window).openMissionGuideModal?.());
await page.waitForTimeout(1200);
out.checkpoints.push(await page.evaluate(() => ({
  overlayDisplay: document.getElementById('mission-guide-overlay')?.style.display || null,
  lessonTitle: document.querySelector('.guide-lesson-page__title')?.textContent?.trim() || null,
  hasBlocklyDiv: Boolean(document.getElementById('blocklyDiv')),
  hasBlocklyGlobal: typeof (window).Blockly !== 'undefined',
  blocklySvgCount: document.querySelectorAll('.blocklySvg').length,
  globals: Object.keys(window).filter((key) => /blockly|guide|mission/i.test(key)).slice(0, 30)
})));

await fs.writeFile('playwright-probe.json', JSON.stringify(out, null, 2), 'utf8');
await browser.close();
