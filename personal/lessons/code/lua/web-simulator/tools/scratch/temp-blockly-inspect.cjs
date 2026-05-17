const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.openMissionGuideModal && window.openMissionGuideModal());
  await page.waitForTimeout(800);
  await page.click('[data-guide-mode="trainer"]');
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => ({
    keys: Object.keys(window.Blockly).slice(0, 120),
    commonKeys: window.Blockly.common ? Object.keys(window.Blockly.common).slice(0, 80) : [],
    serializationKeys: window.Blockly.serialization ? Object.keys(window.Blockly.serialization).slice(0, 80) : [],
    svgCount: document.querySelectorAll('.blocklySvg').length
  }));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
