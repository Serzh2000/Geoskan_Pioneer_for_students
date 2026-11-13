/**
 * После сборки кладёт рядом с текстовыми файлами интерфейса сжатые копии .br и .gz (dist/public).
 * Сервер (server/static-compressed.ts) отдаёт их, когда браузер просит сжатие. Сжимается один раз при сборке, на лету сервер не тратит процессор.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..', 'dist', 'public');
const EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.txt', '.wasm', '.glb', '.map']);
const MIN_BYTES = 1024;

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else yield full;
    }
}

if (!fs.existsSync(ROOT)) {
    console.warn('[precompress] Нет папки dist/public: сначала vite build.');
    process.exit(0);
}

let files = 0;
let before = 0;
let after = 0;
for (const file of walk(ROOT)) {
    if (file.endsWith('.br') || file.endsWith('.gz') || !EXT.has(path.extname(file).toLowerCase())) continue;
    const data = fs.readFileSync(file);
    if (data.length < MIN_BYTES) continue;
    const br = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } });
    const gz = zlib.gzipSync(data, { level: 9 });
    // Сжатая копия, которая не меньше исходного, не нужна.
    if (br.length < data.length) fs.writeFileSync(`${file}.br`, br);
    if (gz.length < data.length) fs.writeFileSync(`${file}.gz`, gz);
    files++; before += data.length; after += Math.min(br.length, gz.length);
}
console.log(`[precompress] Файлов: ${files}, было ${(before / 1048576).toFixed(1)} МБ, с brotli/gzip ${(after / 1048576).toFixed(1)} МБ`);
