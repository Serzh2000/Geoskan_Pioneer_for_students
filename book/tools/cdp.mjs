// Мини-клиент протокола DevTools: запускает headless Chrome и даёт page.eval / page.shot.
// Используется скриптами снимков экрана (book/tools/shots.mjs). Зависимость одна — пакет ws из simulator/node_modules.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../simulator/package.json'));
const WebSocket = require('ws');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));

export async function launch({ width = 1440, height = 900, dpr = 2, port = 9333, url = 'about:blank' } = {}) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bookshots-'));
    const proc = spawn(CHROME, [
        '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`, '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist', '--no-first-run', url
    ], { stdio: 'ignore' });
    let targets;
    for (let i = 0; i < 60; i += 1) {
        try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* ждём запуска */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    const target = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((r) => ws.on('open', r));
    let id = 0; const pending = new Map();
    ws.on('message', (data) => { const m = JSON.parse(data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } });
    const send = (method, params = {}) => new Promise((res, rej) => { id += 1; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
    const page = {
        send,
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
        async goto(u) { await send('Page.navigate', { url: u }); await page.sleep(1500); },
        async eval(expr) {
            const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
            return r.result.value;
        },
        async waitFor(expr, timeout = 30000) {
            const t0 = Date.now();
            while (Date.now() - t0 < timeout) { if (await page.eval(`Boolean(${expr})`).catch(() => false)) return true; await page.sleep(250); }
            throw new Error(`waitFor timeout: ${expr}`);
        },
        async click(selector) { return page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;e.click();return true})()`); },
        async shot(file, clip) {
            const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
        },
        async close() { try { await send('Browser.close'); } catch { /* закрыт */ } ws.close(); proc.kill(); }
    };
    return page;
}
