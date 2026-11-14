/**
 * Страницы уроков для поисковиков (server/seo-pages.ts) и раздача сжатых файлов (server/static-compressed.ts).
 * Страницы строятся из настоящих списков миссий обучения, поэтому тест ловит и поломку самих уроков.
 */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import zlib from 'node:zlib';
import { buildTrackQuests } from '../public/modules/learning/tracks.js';
import { SEO_TRACKS, buildSeoSite, escapeHtml, plain, renderSitemap } from '../server/seo-pages.js';
import { cacheControlFor, pickEncoding, precompressedStatic, staticHeaders } from '../server/static-compressed.js';

const site = buildSeoSite((track) => buildTrackQuests(track), '2026-11-13');
const lessonFiles = site.filter((item) => /^uroki\/[^/]+\/[^/]+\/index\.html$/.test(item.file));
const sitemap = site.find((item) => item.file === 'sitemap-lessons.xml')!.content;

const field = (html: string, pattern: RegExp) => pattern.exec(html)?.[1] ?? '';

describe('страницы уроков', () => {
    test('по странице на каждую миссию каждого курса, плюс страницы курсов, список уроков и карта сайта', () => {
        const total = SEO_TRACKS.reduce((sum, info) => sum + buildTrackQuests(info.track).length, 0);
        expect(total).toBeGreaterThan(250);
        expect(lessonFiles).toHaveLength(total);
        for (const info of SEO_TRACKS) expect(site.some((item) => item.file === `uroki/${info.slug}/index.html`)).toBe(true);
        expect(site.some((item) => item.file === 'uroki/index.html')).toBe(true);
        expect(site).toHaveLength(total + SEO_TRACKS.length + 2);
    });

    test('у каждой страницы своё название и описание нужной длины, канонический адрес и корректные размеченные данные', () => {
        const titles = new Set<string>();
        for (const { file, content } of site.filter((item) => item.file.endsWith('.html'))) {
            const title = field(content, /<title>([^<]+)<\/title>/);
            const description = field(content, /name="description" content="([^"]*)"/).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            expect(title.length).toBeGreaterThan(10);
            expect(title.length).toBeLessThanOrEqual(80);
            expect(description.length).toBeGreaterThan(40);
            expect(description.length).toBeLessThanOrEqual(170);
            expect(titles.has(title)).toBe(false);
            titles.add(title);
            const expectedPath = '/' + file.replace(/index\.html$/, '');
            expect(field(content, /rel="canonical" href="([^"]+)"/)).toBe(`https://simulator.sakoryagin.ru${expectedPath}`);
            expect(content.match(/<h1>/g)).toHaveLength(1);
            for (const block of content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(block[1]);
        }
    });

    test('в тексте нет служебной разметки уроков и непарных тегов, а опасные знаки экранированы', () => {
        for (const { file, content } of lessonFiles) {
            const body = field(content, /<main>([\s\S]*?)<\/main>/);
            expect(body).not.toMatch(/<\/?(lua|py)>/);
            expect(body).not.toMatch(/`|\*\*/);
            expect(body.match(/<ol>/g)?.length ?? 0).toBe(body.match(/<\/ol>/g)?.length ?? 0);
            expect(body.length).toBeGreaterThan(300);
            expect(file).toMatch(/^uroki\/(lua|python|blockly|python-sdk2|bricks)\/[A-Za-z0-9_-]+\/index\.html$/);
        }
    });

    test('соседние миссии связаны ссылками «назад» и «вперёд», первая и последняя без лишних', () => {
        const lua = buildTrackQuests('lua');
        const first = lessonFiles.find((item) => item.file === `uroki/lua/${lua[0].id}/index.html`)!.content;
        const second = lessonFiles.find((item) => item.file === `uroki/lua/${lua[1].id}/index.html`)!.content;
        expect(first).not.toMatch(/← /);
        expect(first).toContain(`/uroki/lua/${lua[1].id}/`);
        expect(second).toContain(`/uroki/lua/${lua[0].id}/`);
    });

    test('карта сайта: все страницы по абсолютным адресам, без повторов', () => {
        const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
        expect(locs).toHaveLength(site.filter((item) => item.file.endsWith('index.html')).length);
        expect(new Set(locs).size).toBe(locs.length);
        expect(locs.every((loc) => loc.startsWith('https://simulator.sakoryagin.ru/uroki/') && loc.endsWith('/'))).toBe(true);
        expect(renderSitemap(['/a/'], '2026-01-01')).toContain('<loc>https://simulator.sakoryagin.ru/a/</loc>');
    });

    test('plain и escapeHtml', () => {
        expect(plain('Вызовите `arm()` и **подождите** <py>секунду</py>')).toBe('Вызовите arm() и подождите секунду');
        expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    });
});

describe('раздача сжатых файлов', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-'));
    const js = 'console.log("привет");'.repeat(200);
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<html>главная</html>'.repeat(60));
    fs.writeFileSync(path.join(dir, 'index.html.br'), zlib.brotliCompressSync('<html>главная</html>'.repeat(60)));
    fs.writeFileSync(path.join(dir, 'assets', 'app-AbC12345.js'), js);
    fs.writeFileSync(path.join(dir, 'assets', 'app-AbC12345.js.br'), zlib.brotliCompressSync(js));
    fs.writeFileSync(path.join(dir, 'assets', 'app-AbC12345.js.gz'), zlib.gzipSync(js));
    fs.writeFileSync(path.join(dir, 'plain.js'), js);
    fs.writeFileSync(path.join(dir, 'plain.js.gz'), zlib.gzipSync(js));
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'x');
    const app = express();
    app.use(precompressedStatic(dir));
    app.use(express.static(dir, { setHeaders: (res, file) => staticHeaders(res, file, dir) }));

    test('браузер с brotli получает .br, с gzip - .gz, без сжатия - обычный файл', async () => {
        // Клиент тестов сам распаковывает ответ: совпадение текста доказывает, что отдан корректный brotli.
        const br = await request(app).get('/assets/app-AbC12345.js').set('Accept-Encoding', 'br, gzip');
        expect(br.headers['content-encoding']).toBe('br');
        expect(br.headers.vary).toMatch(/Accept-Encoding/);
        expect(br.headers['content-type']).toMatch(/javascript/);
        expect(br.text).toBe(js);
        const gz = await request(app).get('/assets/app-AbC12345.js').set('Accept-Encoding', 'gzip');
        expect(gz.headers['content-encoding']).toBe('gzip');
        expect(gz.text).toBe(js);
        const none = await request(app).get('/assets/app-AbC12345.js').set('Accept-Encoding', 'identity');
        expect(none.headers['content-encoding']).toBeUndefined();
        expect(none.text).toBe(js);
    });

    test('главная страница по адресу «/» тоже отдаётся сжатой', async () => {
        const res = await request(app).get('/').set('Accept-Encoding', 'br');
        expect(res.headers['content-encoding']).toBe('br');
        expect(res.headers['cache-control']).toBe('public, max-age=0');
    });

    test('кэш: файлы с хэшем в assets/ на год, остальное проверяется заново', async () => {
        expect(cacheControlFor('/assets/app-AbC12345.js')).toBe('public, max-age=31536000, immutable');
        expect(cacheControlFor('/index.html')).toBe('public, max-age=0');
        expect(cacheControlFor('/assets/app.js')).toBe('public, max-age=0');
        const hashed = await request(app).get('/assets/app-AbC12345.js').set('Accept-Encoding', 'gzip');
        expect(hashed.headers['cache-control']).toContain('immutable');
        const plainFile = await request(app).get('/plain.js').set('Accept-Encoding', 'identity');
        expect(plainFile.headers['cache-control']).toBe('public, max-age=0');
        const hashedPlain = await request(app).get('/assets/app-AbC12345.js').set('Accept-Encoding', 'identity');
        expect(hashedPlain.headers['cache-control']).toContain('immutable');
    });

    test('файл без сжатой копии и чужие пути не отдаются через сжатие', async () => {
        const noCopy = await request(app).get('/secret.txt').set('Accept-Encoding', 'br');
        expect(noCopy.headers['content-encoding']).toBeUndefined();
        const escape = await request(app).get('/%2e%2e/%2e%2e/secret.txt').set('Accept-Encoding', 'br');
        expect(escape.headers['content-encoding']).toBeUndefined();
        expect((await request(app).post('/plain.js').set('Accept-Encoding', 'gzip')).headers['content-encoding']).toBeUndefined();
    });

    test('выбор кодировки', () => {
        expect(pickEncoding('gzip, deflate, br')).toBe('br');
        expect(pickEncoding('gzip;q=1.0, identity')).toBe('gzip');
        expect(pickEncoding('identity')).toBeNull();
        expect(pickEncoding(undefined)).toBeNull();
    });
});
