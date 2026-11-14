/**
 * Строит статические страницы уроков для поисковиков (static/uroki/ и static/sitemap-lessons.xml) из списков миссий обучения.
 * Запускается при сборке перед vite build: папка static/ копируется в сборку как есть. В git эти файлы не хранятся.
 * Ошибка не останавливает сборку: без страниц уроков приложение работает так же.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'static');

async function main() {
    // Списки миссий лежат в TypeScript кода интерфейса: читаем их через сервер Vite (без браузера и без порта).
    const server = await createServer({
        root, configFile: false, appType: 'custom', logLevel: 'silent',
        server: { middlewareMode: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true, include: [] }
    });
    try {
        const tracks = await server.ssrLoadModule('/public/modules/learning/tracks.ts');
        const seo = await server.ssrLoadModule('/server/seo-pages.ts');
        const cache = new Map();
        const questsFor = (track) => {
            if (!cache.has(track)) cache.set(track, tracks.buildTrackQuests(track));
            return cache.get(track);
        };
        const files = seo.buildSeoSite(questsFor);
        fs.rmSync(path.join(out, 'uroki'), { recursive: true, force: true });
        for (const { file, content } of files) {
            const target = path.join(out, file);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content, 'utf8');
        }
        console.log(`[seo] Страниц уроков: ${files.length - 1} (static/uroki), карта сайта: static/sitemap-lessons.xml`);
    } finally {
        await server.close();
    }
}

main().catch((error) => {
    console.warn(`[seo] Не удалось построить страницы уроков (${error?.message ?? error}). Сборка продолжается без них.`);
});
