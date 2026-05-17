const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.openMissionGuideModal && window.openMissionGuideModal());
  await page.waitForTimeout(800);
  await page.click('[data-guide-mode="trainer"]');
  await page.waitForTimeout(1500);
  const data = await page.evaluate(async () => {
    const m = await import('/modules/ui/mission-guide/blockly.ts');
    const Blockly = m.Blockly;
    return {
      keys: Object.keys(Blockly).slice(0, 120),
      commonKeys: Blockly.common ? Object.keys(Blockly.common).slice(0, 80) : [],
      hasGetMainWorkspace: typeof Blockly.getMainWorkspace,
      hasCommonGetMainWorkspace: typeof Blockly.common?.getMainWorkspace,
      wsType: Blockly.common?.getMainWorkspace ? typeof Blockly.common.getMainWorkspace() : 'n/a',
      svgCount: document.querySelectorAll('.blocklySvg').length
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
