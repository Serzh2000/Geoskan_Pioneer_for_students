const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.openMissionGuideModal && window.openMissionGuideModal());
  await page.waitForTimeout(500);
  await page.click('[data-guide-mode="trainer"]');
  await page.waitForTimeout(1200);
  await page.click('[data-guide-nav="next"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const { Blockly } = await import('/modules/ui/mission-guide/blockly.ts');
    const ws = Blockly.getMainWorkspace();
    ws.clear();
    const ledbar = ws.newBlock('lua_ledbar_new'); ledbar.setFieldValue('4', 'COUNT');
    const blue = ws.newBlock('lua_led_set'); blue.setFieldValue('0','INDEX'); blue.setFieldValue('0','R'); blue.setFieldValue('0','G'); blue.setFieldValue('1','B');
    const timer1 = ws.newBlock('lua_timer_calllater'); timer1.setFieldValue('0.5','DELAY');
    const green = ws.newBlock('lua_led_set'); green.setFieldValue('1','INDEX'); green.setFieldValue('0','R'); green.setFieldValue('1','G'); green.setFieldValue('0','B');
    const timer2 = ws.newBlock('lua_timer_calllater'); timer2.setFieldValue('0.5','DELAY');
    const red = ws.newBlock('lua_led_set'); red.setFieldValue('2','INDEX'); red.setFieldValue('1','R'); red.setFieldValue('0','G'); red.setFieldValue('0','B');
    for (const b of [ledbar, blue, timer1, green, timer2, red]) { b.initSvg(); b.render(); }
    ledbar.nextConnection.connect(blue.previousConnection);
    blue.nextConnection.connect(timer1.previousConnection);
    timer1.getInput('CALLBACK').connection.connect(green.previousConnection);
    green.nextConnection.connect(timer2.previousConnection);
    timer2.getInput('CALLBACK').connection.connect(red.previousConnection);
    ledbar.moveBy(50, 50);
  });
  await page.waitForTimeout(500);
  await page.click('[data-guide-check]');
  for (const ms of [50, 200, 600, 1100, 1700]) {
    await page.waitForTimeout(ms === 50 ? 50 : ms-([50,200,600,1100,1700][[50,200,600,1100,1700].indexOf(ms)-1]||0));
    const snap = await page.evaluate(async(ms)=>{
      const editor = await import('/modules/editor/index.ts');
      const core = await import('/modules/core/state.ts');
      const d = core.drones[core.currentDroneId];
      return {
        ms,
        title: document.querySelector('.guide-lesson-page__title')?.textContent?.trim(),
        code: editor.getEditorValue(),
        banner: document.querySelector('.guide-run-banner')?.textContent?.trim(),
        current_time: d.current_time,
        running: d.running,
        status: d.status,
        timers: d.timers.map(t => ({ trigger_time: t.trigger_time, one_shot: t.one_shot, running: t.running })),
        leds: d.leds.map(led => ({ r: led.r, g: led.g, b: led.b }))
      };
    }, ms);
    console.log('snap', JSON.stringify(snap, null, 2));
  }
  await browser.close();
})();
