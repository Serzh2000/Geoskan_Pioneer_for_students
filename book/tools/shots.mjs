// Снимки экрана симулятора для книги: node book/tools/shots.mjs [имя ...]
// Нужен запущенный симулятор (cd simulator && npm start, http://127.0.0.1:3011) и Chrome или Edge.
// Файлы пишутся в book/tex/images/simulator/. Размер окна 1440x900, DPR 2.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../tex/images/simulator');
const URL_ = process.env.SIM_URL || 'http://127.0.0.1:3011';
const want = new Set(process.argv.slice(2));
const wanted = (name) => want.size === 0 || want.has(name);

const p = await launch({ url: URL_, width: 1440, height: 900, dpr: 2 });
const text = (t) => `[...document.querySelectorAll('button,a,[role=button],[role=tab],label')].find(b=>b.getClientRects().length&&(b.textContent||'').trim().toLowerCase()===${JSON.stringify(t.toLowerCase())})`;
const clickLast = (t) => p.eval(`(()=>{const e=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&(b.textContent||'').trim().toLowerCase()===${JSON.stringify(t.toLowerCase())}).pop();if(!e)return false;e.click();return true})()`);
const clickText = (t) => p.eval(`(()=>{const e=${text(t)};if(!e)return false;e.click();return true})()`);
const setSelect = (selector, match) => p.eval(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});const o=[...s.options].find(o=>o.value===${JSON.stringify(match)}||o.textContent.trim()===${JSON.stringify(match)});if(!o)return 'нет: '+${JSON.stringify(match)};s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'})()`);
const shot = (name, clip) => p.shot(path.join(OUT, name), clip);
const openCode = async () => { if (!(await p.eval(`document.querySelector('#editor-panel')?.classList.contains('active')&&document.querySelector('#editor-panel').getClientRects().length>0`))) { await clickText('Код'); await p.sleep(1500); } };
const setLang = async (lang) => { console.log('lang', lang, await setSelect('#script-language-select', lang)); await p.sleep(1500); };
const loadExample = async (name) => { await p.waitFor(`document.querySelector('#file-selector')?.options.length>5`, 30000); console.log('example', name, await setSelect('#file-selector', name)); await p.sleep(1500); };
const progress = (done, current) => JSON.stringify({ completed: done, currentId: current });

try {
    // Экскурсию и прогресс настраиваем до загрузки интерфейса.
    await p.waitFor(`document.querySelector('#run-btn')`, 90000);
    await p.eval(`localStorage.setItem('geoskan_onboarding_tour_v1','skipped')`);
    await p.goto(URL_);
    await p.waitFor(`document.querySelector('#run-btn')`, 90000);
    await p.sleep(5000);

    if (wanted('01-scene.png')) {
        await p.eval(`window.closePanel&&window.closePanel()`); await p.sleep(1200);
        await shot('01-scene.png'); console.log('01');
    }
    if (wanted('02-editor-lua.png') || wanted('03-terminal.png')) {
        await openCode(); await setLang('lua'); await loadExample('02_sensors/getting_started_hello.lua');
        await shot('02-editor-lua.png'); console.log('02');
        await p.click('#run-btn'); await p.sleep(2500);
        await p.click('#editor-terminal-toggle-btn'); await p.sleep(1500);
        await shot('03-terminal.png'); console.log('03');
    }
    if (wanted('07-editor-python.png')) {
        await openCode(); await setLang('python'); await loadExample('02_pioneer_sdk/09_02_takeoff_land.py');
        await shot('07-editor-python.png'); console.log('07');
    }
    if (wanted('08-blockly.png')) {
        await openCode(); await setLang('blockly'); await p.sleep(1500);
        await shot('08-blockly.png'); console.log('08');
    }
    if (wanted('04-mission-card.png') || wanted('09-mission-map.png')) {
        if (await p.eval(`document.querySelector('#editor-terminal-toggle-btn')?.getAttribute('aria-pressed')==='true'`)) await p.click('#editor-terminal-toggle-btn');
        await p.click('#sidebar-guide-btn'); await p.sleep(1500);
        await clickText('Lua'); await p.sleep(1500);
        await shot('04-mission-card.png'); console.log('04');
        await clickText('Начать миссию'); await p.sleep(1500);
        await shot('10-mission-step.png'); console.log('10');
        await p.eval(`document.querySelector('[data-quest-next]')?.click()`); await p.sleep(1000);
        await clickText('Карта миссий'); await p.sleep(1500);
        await shot('09-mission-map.png'); console.log('09');
    }
    if (wanted('05-flight.png') || wanted('06-coords.png')) {
        await openCode(); await setLang('lua'); await loadExample('timed-square-flight.lua');
        await p.click('#run-btn');
        await p.waitFor(`/полёт|взл/i.test(document.querySelector('#run-state-chip')?.textContent||'')`, 90000).catch(() => console.log('нет полёта'));
        await p.sleep(30000);
        await p.eval(`window.closePanel&&window.closePanel()`); await p.sleep(800);
        await clickLast('Дрон'); await p.sleep(2500);
        await shot('05-flight.png'); console.log('05', await p.eval(`document.querySelector('#run-state-chip')?.textContent`));
        await clickText('Полёт'); await p.sleep(2500);
        await shot('06-coords.png'); console.log('06');
    }
    console.log(await p.eval(`document.body.innerText.slice(0,400)`));
} finally { await p.close(); process.exit(0); }
