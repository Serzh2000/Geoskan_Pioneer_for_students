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

async function snapshot(label) {
  const data = await page.evaluate(async (label) => {
    const core = await import('/modules/core/state.ts');
    const editor = await import('/modules/editor/index.ts');
    const preview = await import('/modules/ui/mission-guide/scene-preview.ts');
    return {
      label,
      lessonTitle: document.querySelector('.guide-lesson-page__title')?.textContent?.trim() || null,
      lessonBadge: document.querySelector('.guide-lesson-page__badge')?.textContent?.trim() || null,
      banner: document.querySelector('.guide-run-banner')?.textContent?.trim() || null,
      checkSummary: document.getElementById('guide-check-summary')?.textContent?.trim() || null,
      diagnosticsText: document.getElementById('diagnostics-container')?.textContent?.trim() || null,
      logsText: document.getElementById('logs')?.textContent?.trim() || null,
      previewActiveFlag: preview.isMissionGuideScenePreviewActive(),
      previewHostActive: document.getElementById('mission-guide-scene-preview-host')?.classList.contains('is-active') || false,
      sceneInPreview: document.querySelector('#mission-guide-scene-preview-host .scene-container') !== null,
      blocklySvgCount: document.querySelectorAll('.blocklySvg').length,
      activeTabTrainer: document.querySelector('[data-guide-mode="trainer"]')?.classList.contains('is-active') || false,
      editorValue: editor.getEditorValue(),
      drone: core.drones[core.currentDroneId] ? {
        id: core.currentDroneId,
        running: core.drones[core.currentDroneId].running,
        status: core.drones[core.currentDroneId].status,
        fsmState: core.drones[core.currentDroneId].fsmState,
        currentTime: core.drones[core.currentDroneId].current_time,
        pos: core.drones[core.currentDroneId].pos,
        targetPos: core.drones[core.currentDroneId].target_pos,
        timers: core.drones[core.currentDroneId].timers.length,
        queue: core.drones[core.currentDroneId].command_queue.length
      } : null
    };
  }, label);
  out.checkpoints.push(data);
}

async function buildLesson1() {
  await page.evaluate(async () => {
    const { Blockly } = await import('/modules/ui/mission-guide/blockly.ts');
    const ws = Blockly.getMainWorkspace();
    ws.clear();
    const a = ws.newBlock('lua_ledbar_new');
    a.setFieldValue('4', 'COUNT');
    const b = ws.newBlock('lua_led_set');
    b.setFieldValue('0', 'INDEX');
    b.setFieldValue('1', 'R');
    b.setFieldValue('0', 'G');
    b.setFieldValue('0', 'B');
    a.initSvg(); a.render();
    b.initSvg(); b.render();
    a.nextConnection.connect(b.previousConnection);
    a.moveBy(40, 40);
    Blockly.svgResize(ws);
  });
}

async function buildLesson2() {
  await page.evaluate(async () => {
    const { Blockly } = await import('/modules/ui/mission-guide/blockly.ts');
    const ws = Blockly.getMainWorkspace();
    ws.clear();
    const ledbar = ws.newBlock('lua_ledbar_new');
    ledbar.setFieldValue('4', 'COUNT');
    const blue = ws.newBlock('lua_led_set');
    blue.setFieldValue('0', 'INDEX');
    blue.setFieldValue('0', 'R');
    blue.setFieldValue('0', 'G');
    blue.setFieldValue('1', 'B');
    const timer1 = ws.newBlock('lua_timer_calllater');
    timer1.setFieldValue('0.5', 'DELAY');
    const green = ws.newBlock('lua_led_set');
    green.setFieldValue('1', 'INDEX');
    green.setFieldValue('0', 'R');
    green.setFieldValue('1', 'G');
    green.setFieldValue('0', 'B');
    const timer2 = ws.newBlock('lua_timer_calllater');
    timer2.setFieldValue('0.5', 'DELAY');
    const red = ws.newBlock('lua_led_set');
    red.setFieldValue('2', 'INDEX');
    red.setFieldValue('1', 'R');
    red.setFieldValue('0', 'G');
    red.setFieldValue('0', 'B');

    for (const block of [ledbar, blue, timer1, green, timer2, red]) {
      block.initSvg();
      block.render();
    }

    ledbar.nextConnection.connect(blue.previousConnection);
    blue.nextConnection.connect(timer1.previousConnection);
    timer1.getInput('CALLBACK').connection.connect(green.previousConnection);
    green.nextConnection.connect(timer2.previousConnection);
    timer2.getInput('CALLBACK').connection.connect(red.previousConnection);
    ledbar.moveBy(40, 40);
    Blockly.svgResize(ws);
  });
}

await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.evaluate(() => window.openMissionGuideModal?.());
await page.waitForTimeout(800);
await page.click('[data-guide-mode="trainer"]');
await page.waitForFunction(() => document.querySelectorAll('.blocklySvg').length > 0);
await page.waitForTimeout(800);
await snapshot('trainer-opened');

await buildLesson1();
await page.waitForTimeout(500);
await snapshot('lesson1-built');
await page.click('[data-guide-check]');
await page.waitForTimeout(1500);
await snapshot('lesson1-started');

const split1 = { requestsStart: out.requests.length, responsesStart: out.responses.length, consoleStart: out.console.length };
await page.click('[data-guide-nav="next"]');
await page.waitForTimeout(1200);
await snapshot('lesson2-opened');
await buildLesson2();
await page.waitForTimeout(500);
await snapshot('lesson2-built');
await page.click('[data-guide-check]');
await page.waitForTimeout(2500);
await snapshot('lesson2-started');

out.transitionDelta = {
  requests: out.requests.slice(split1.requestsStart),
  responses: out.responses.slice(split1.responsesStart),
  console: out.console.slice(split1.consoleStart)
};

await fs.writeFile('playwright-repro.json', JSON.stringify(out, null, 2), 'utf8');
await browser.close();
