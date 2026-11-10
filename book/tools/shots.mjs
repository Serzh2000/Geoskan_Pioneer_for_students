// Снимки экрана симулятора для книги: node book/tools/shots.mjs [имя ...]
// Нужен запущенный симулятор (cd simulator && npm start, http://127.0.0.1:3011) и Chrome или Edge.
// Файлы пишутся в book/tex/images/simulator/. Окно 1440x900, DPR 2, светлая тема, экскурсия пропущена.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../tex/images/simulator');
const URL_ = process.env.SIM_URL || 'http://127.0.0.1:3011';
const want = new Set(process.argv.slice(2));
const wanted = (...names) => want.size === 0 || names.some((n) => want.has(n));

const p = await launch({ url: URL_, width: 1440, height: 900, dpr: 2 });
const text = (t) => `[...document.querySelectorAll('button,a,[role=button],[role=tab],label')].find(b=>b.getClientRects().length&&(b.textContent||'').trim().toLowerCase()===${JSON.stringify(t.toLowerCase())})`;
const clickText = (t) => p.eval(`(()=>{const e=${text(t)};if(!e)return false;e.click();return true})()`);
const setSelect = (selector, match) => p.eval(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});const o=[...s.options].find(o=>o.value===${JSON.stringify(match)}||o.textContent.trim()===${JSON.stringify(match)});if(!o)return 'нет: '+${JSON.stringify(match)};s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'})()`);
const shot = (name, clip) => p.shot(path.join(OUT, name), clip);
const READY = `document.querySelector('#run-btn')&&(()=>{const s=document.querySelector('#app-splash');return !s||!s.getClientRects().length||getComputedStyle(s).opacity==='0'})()`;
const fresh = async () => { await p.goto(URL_); await p.waitFor(READY, 120000); await p.sleep(5000); };
const openCode = async () => { if (!(await p.eval(`document.querySelector('#editor-panel')?.classList.contains('active')&&document.querySelector('#editor-panel').getClientRects().length>0`))) { await clickText('Код'); await p.sleep(1500); } };
const setModel = async (m) => { await p.click(`[data-editor-drone-model=${m}]`); await p.sleep(2500); };
const setLang = async (lang) => { console.log('lang', lang, await setSelect('#script-language-select', lang)); await p.sleep(1500); };
const loadExample = async (name) => { await p.waitFor(`document.querySelector('#file-selector')?.options.length>5`, 30000); console.log('example', name, await setSelect('#file-selector', name)); await p.sleep(2000); };

try {
    await p.waitFor(`document.querySelector('#run-btn')`, 120000);
    // Экскурсию (ключ v2) и светлую тему задаём до загрузки интерфейса.
    await p.eval(`localStorage.setItem('geoskan_onboarding_tour_v2','skipped');localStorage.setItem('geoskan_app_theme_v1','light')`);
    await fresh();

    if (wanted('01-scene.png')) {
        await p.eval(`window.closePanel&&window.closePanel()`); await p.sleep(1200);
        await shot('01-scene.png'); console.log('01');
    }
    // Базовый
    if (wanted('02-editor-lua.png', '03-terminal.png')) {
        await openCode(); await setModel('pioneer-basic'); await setLang('lua'); await loadExample('timed-square-flight.lua');
        await shot('02-editor-lua.png'); console.log('02');
        await loadExample('02_sensors/getting_started_hello.lua');
        await p.click('#run-btn'); await p.sleep(2500);
        await p.click('#editor-terminal-toggle-btn'); await p.sleep(1500);
        await shot('03-terminal.png'); console.log('03');
        await p.click('#stop-btn'); await p.sleep(500);
    }
    if (wanted('07-editor-python.png')) {
        await openCode(); await setLang('python'); await loadExample('03_flight_control/10_02_square.py');
        await shot('07-editor-python.png'); console.log('07');
    }
    if (wanted('08-blockly.png')) {
        await openCode(); await setLang('blockly'); await loadExample('02_flight/01_square.json'); await p.sleep(1500);
        await shot('08-blockly.png'); console.log('08');
    }
    // Мини 2
    if (wanted('11-editor-mini2.png', '12-bricks.png')) {
        await fresh(); await openCode(); await setModel('pioneer-mini2');
        await setLang('python'); await loadExample('05_square_mission.py');
        await shot('11-editor-mini2.png'); console.log('11');
        await setLang('blockly'); await loadExample('bricks/u05_polet_kvadrat.xml'); await p.sleep(1500);
        await shot('12-bricks.png'); console.log('12');
    }
    // Обучение
    if (wanted('04-mission-card.png', '04-editor-mission.png', '10-mission-step.png', '09-mission-map.png', '13-mission-map-sdk2.png', '14-mission-tracks.png')) {
        await fresh(); await p.click('#sidebar-guide-btn'); await p.sleep(2000);
        await clickText('Lua'); await p.sleep(1500);
        await shot('04-mission-card.png'); console.log('04');
        await clickText('Мини 2 · Python'); await p.sleep(1500);
        const box = await p.eval(`(()=>{const e=${text('Карта миссий')};const r=e.getBoundingClientRect();return {x:1050,y:12,width:376,height:Math.round(r.bottom+16-12)}})()`);
        await shot('14-mission-tracks.png', box); console.log('14', JSON.stringify(box));
        await clickText('Lua'); await p.sleep(1000);
        await clickText('Начать миссию'); await p.sleep(1500);
        await shot('10-mission-step.png'); console.log('10');
        await shot('04-editor-mission.png', { x: 0, y: 0, width: 1440, height: 520 });
        await p.eval(`document.querySelector('[data-quest-next]')?.click()`); await p.sleep(1000);
        await clickText('Карта миссий'); await p.sleep(1500);
        await shot('09-mission-map.png'); console.log('09');
        await fresh(); await p.click('#sidebar-guide-btn'); await p.sleep(2000);
        await clickText('Мини 2 · Python'); await p.sleep(1500);
        await clickText('Карта миссий'); await p.sleep(1500);
        await shot('13-mission-map-sdk2.png'); console.log('13');
    }
    if (wanted('05-flight.png', '06-coords.png')) {
        await fresh(); await openCode(); await setModel('pioneer-basic'); await setLang('lua'); await loadExample('timed-square-flight.lua');
        await p.click('#run-btn');
        await p.waitFor(`/полёт|взл/i.test(document.querySelector('#run-state-chip')?.textContent||'')`, 90000).catch(() => console.log('нет полёта'));
        await p.sleep(30000);
        await p.eval(`window.closePanel&&window.closePanel()`); await p.sleep(800);
        await p.eval(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&(b.textContent||'').trim()==='Дрон'&&b.getBoundingClientRect().y>600);if(!e)return false;e.click();return true})()`); await p.sleep(5000);
        await p.eval(`window.dispatchEvent(new Event('resize'))`); await p.sleep(5000);
        await shot('05-flight.png'); console.log('05', await p.eval(`document.querySelector('#run-state-chip')?.textContent`));
        await clickText('Полёт'); await p.sleep(2500);
        await shot('06-coords.png'); console.log('06');
    }
} finally { await p.close(); setTimeout(() => process.exit(0), 500); }
