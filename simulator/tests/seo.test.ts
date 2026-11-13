/**
 * Поисковая оптимизация: заголовок, описание, превью для соцсетей, размеченные данные, текст для роботов,
 * robots.txt и sitemap.xml. Эти файлы должны попадать в сборку как есть, иначе сервер подменит их главной страницей.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const meta = (attr: 'name' | 'property', key: string): string | undefined =>
    new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];

describe('главная страница для поисковиков', () => {
    test('заголовок по-русски, с главными словами и не длиннее 70 знаков', () => {
        const title = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? '';
        expect(title).toMatch(/Симулятор квадрокоптера/);
        expect(title).toMatch(/Пионер/);
        expect(title.length).toBeLessThanOrEqual(70);
    });

    test('описание 70-180 знаков, один канонический адрес, роботам разрешено индексировать', () => {
        const description = meta('name', 'description') ?? '';
        expect(description.length).toBeGreaterThanOrEqual(70);
        expect(description.length).toBeLessThanOrEqual(180);
        expect(/<link rel="canonical" href="(https:\/\/[^"]+)"/.exec(html)?.[1]).toBe('https://simulator.sakoryagin.ru/');
        expect(meta('name', 'robots')).toMatch(/index/);
        expect(meta('name', 'robots')).not.toMatch(/noindex/);
    });

    test('превью для соцсетей: заголовок, описание, картинка 1200x630 по абсолютному адресу', () => {
        expect(meta('property', 'og:title')).toBeTruthy();
        expect(meta('property', 'og:description')).toBe(meta('name', 'description'));
        expect(meta('property', 'og:image')).toMatch(/^https:\/\/.+\.jpg$/);
        expect(meta('property', 'og:image:width')).toBe('1200');
        expect(meta('property', 'og:image:height')).toBe('630');
        expect(meta('name', 'twitter:card')).toBe('summary_large_image');
        const image = path.join(ROOT, 'static', 'og-image.jpg');
        expect(fs.existsSync(image)).toBe(true);
        expect(fs.statSync(image).size).toBeLessThan(300 * 1024);
    });

    test('размеченные данные - корректный JSON, приложение для обучения', () => {
        const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
        const data = JSON.parse(raw);
        expect(data['@context']).toBe('https://schema.org');
        expect(data['@type']).toBe('WebApplication');
        expect(data.applicationCategory).toBe('EducationalApplication');
        expect(data.inLanguage).toBe('ru');
    });

    test('у страницы один заголовок первого уровня с описанием, а не заставка', () => {
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        expect(/<h1>([^<]+)<\/h1>/.exec(html)?.[1]).toMatch(/квадрокоптера/);
        expect(html).toContain('id="seo-intro"');
        const intro = /<section id="seo-intro"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
        const words = intro.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
        expect(words.length).toBeGreaterThan(120);
        for (const term of ['Lua', 'Python', 'Blockly', 'Bricks', 'Пионер Базовый', 'Мини 2']) expect(intro).toContain(term);
        expect(html).toContain('<noscript>');
    });
});

describe('robots.txt и sitemap.xml', () => {
    const robots = fs.readFileSync(path.join(ROOT, 'static', 'robots.txt'), 'utf8');
    const sitemap = fs.readFileSync(path.join(ROOT, 'static', 'sitemap.xml'), 'utf8');

    test('robots.txt: всё открыто, кроме api, и указана карта сайта', () => {
        expect(robots).toMatch(/^User-agent: \*$/m);
        expect(robots).toMatch(/^Allow: \/$/m);
        expect(robots).toMatch(/^Disallow: \/api\/$/m);
        expect(robots).not.toMatch(/^Disallow: \/$/m);
        expect(robots).toMatch(/^Sitemap: https:\/\/simulator\.sakoryagin\.ru\/sitemap\.xml$/m);
    });

    test('sitemap.xml: корректная карта с главной страницей', () => {
        expect(sitemap.startsWith('<?xml')).toBe(true);
        expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
        expect(sitemap).toContain('<loc>https://simulator.sakoryagin.ru/</loc>');
        expect(sitemap.match(/<url>/g)?.length).toBe(sitemap.match(/<\/url>/g)?.length);
    });

    test('эти файлы попадают в сборку: статика лежит в static/, а не в public/ (там корень приложения)', () => {
        const config = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
        expect(config).toMatch(/publicDir:\s*path\.resolve\(__dirname,\s*'static'\)/);
        expect(fs.existsSync(path.join(ROOT, 'static', 'favicon.svg'))).toBe(true);
        expect(html).toContain('href="/favicon.svg"');
        // Pyodide кладётся туда же, откуда его читает загрузчик.
        expect(fs.readFileSync(path.join(ROOT, 'scripts', 'fetch-pyodide.cjs'), 'utf8')).toContain("'static', 'vendor', 'pyodide'");
    });
});
