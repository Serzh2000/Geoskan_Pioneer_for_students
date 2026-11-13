/**
 * Раздача собранного интерфейса со сжатием и кэшем. Сборка кладёт рядом с файлами готовые .br и .gz
 * (scripts/precompress.cjs), сервер отдаёт их, когда браузер умеет, и ничего не сжимает на лету: главный файл
 * приложения весит 9 МБ, без сжатия первая загрузка занимала бы минуты, а поисковики считают скорость.
 * Файлы с хэшем в имени (assets/) кэшируются на год, остальное проверяется заново.
 */
import type express from 'express';
import fs from 'fs';
import path from 'path';

const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.map': 'application/json; charset=utf-8'
};

/** Что браузер умеет: br лучше gzip. */
export function pickEncoding(header: string | undefined): 'br' | 'gzip' | null {
    const accepted = String(header ?? '').toLowerCase().split(',').map((item) => item.trim().split(';')[0]);
    if (accepted.includes('br')) return 'br';
    if (accepted.includes('gzip')) return 'gzip';
    return null;
}

/** Хэшированные файлы сборки (assets/имя-хэш.js) не меняются никогда, поэтому их можно держать в кэше год. */
export function cacheControlFor(urlPath: string): string {
    return /^\/assets\/.+-[A-Za-z0-9_-]{6,}\.[a-z0-9]+$/.test(urlPath) ? 'public, max-age=31536000, immutable' : 'public, max-age=0';
}

export function precompressedStatic(root: string): express.RequestHandler {
    const base = path.resolve(root);
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') { next(); return; }
        const encoding = pickEncoding(req.headers['accept-encoding']);
        if (!encoding) { next(); return; }
        let urlPath: string;
        try { urlPath = decodeURIComponent(req.path); } catch { next(); return; }
        if (urlPath.endsWith('/')) urlPath += 'index.html';
        const file = path.resolve(base, `.${urlPath}`);
        // Только внутри папки сборки.
        if (file !== base && !file.startsWith(base + path.sep)) { next(); return; }
        const type = TYPES[path.extname(file).toLowerCase()];
        const compressed = `${file}.${encoding === 'br' ? 'br' : 'gz'}`;
        if (!type || !fs.existsSync(compressed) || !fs.existsSync(file)) { next(); return; }
        const stat = fs.statSync(compressed);
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Cache-Control', cacheControlFor(urlPath));
        res.setHeader('Last-Modified', fs.statSync(file).mtime.toUTCString());
        if (req.method === 'HEAD') { res.end(); return; }
        fs.createReadStream(compressed).on('error', () => res.destroy()).pipe(res);
    };
}

/** Заголовки кэша для файлов, которые отдаёт обычная статика (без сжатых копий). */
export function staticHeaders(res: express.Response, filePath: string, root: string): void {
    const rel = '/' + path.relative(path.resolve(root), filePath).split(path.sep).join('/');
    res.setHeader('Cache-Control', cacheControlFor(rel));
}
