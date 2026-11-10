/**
 * Кладёт среду выполнения Python (Pyodide) рядом с приложением: public/vendor/pyodide/.
 * Тогда первый запуск Python не зависит от интернета и от CDN (школьные сети его часто режут) и стартует быстрее.
 * Файлы скачиваются один раз и не хранятся в git. Нет сети - скрипт только предупреждает, а приложение берёт CDN.
 */
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '0.26.2';
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;
const OUT = path.join(__dirname, '..', 'public', 'vendor', 'pyodide');
// numpy нужен кадрам камеры (cv2 в симуляторе); остальные пакеты программы не подгружают.
const PACKAGES = ['numpy'];
const CORE = ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

async function download(name) {
    const target = path.join(OUT, name);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) return false;
    const response = await fetch(BASE + name);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    return true;
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    let fetched = 0;
    for (const name of CORE) if (await download(name)) fetched++;
    const lock = JSON.parse(fs.readFileSync(path.join(OUT, 'pyodide-lock.json'), 'utf8'));
    const wanted = new Set();
    const visit = (name) => {
        if (wanted.has(name)) return;
        const entry = lock.packages[name];
        if (!entry) throw new Error(`В pyodide-lock.json нет пакета ${name}`);
        wanted.add(name);
        (entry.depends || []).forEach(visit);
    };
    PACKAGES.forEach(visit);
    for (const name of wanted) if (await download(lock.packages[name].file_name)) fetched++;
    console.log(fetched ? `[pyodide] Скачано файлов: ${fetched} (public/vendor/pyodide)` : '[pyodide] Уже на месте: public/vendor/pyodide');
}

main().catch((error) => {
    // Без сети приложение работает через CDN, поэтому сборку и запуск это не останавливает.
    console.warn(`[pyodide] Не удалось скачать Pyodide (${error.message}). Python будет грузиться с CDN.`);
});
