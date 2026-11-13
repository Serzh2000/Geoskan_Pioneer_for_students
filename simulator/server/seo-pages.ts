/**
 * Статические страницы уроков для поисковиков: /uroki/, /uroki/<курс>/ и по странице на каждую миссию.
 * Приложение рисуется скриптом и роботу видно плохо, а у этих страниц есть своё название, текст и ссылки,
 * так что по запросам вроде «урок Lua квадрокоптер взлёт» человек попадает на нужную миссию.
 * Страницы строит scripts/generate-seo-pages.mjs при сборке из тех же списков миссий, что показывает обучение.
 */
/** Поля миссии, нужные страницам: подходит любая миссия обучения (Quest). Свой тип, чтобы серверная сборка не тянула код интерфейса. */
export type Quest = { id: string; number: number; title: string; goal: string; steps: string[]; hint: string; outcome: string; groupTitle: string };

export const SITE = 'https://simulator.sakoryagin.ru';

export type SeoTrack = {
    track: 'blocks' | 'lua' | 'python' | 'sdk2' | 'bricks';
    /** Адрес курса: /uroki/<slug>/. */
    slug: string;
    label: string;
    course: string;
    about: string;
};

export const SEO_TRACKS: readonly SeoTrack[] = [
    { track: 'lua', slug: 'lua', label: 'Lua', course: 'Курс Lua для Пионера Базовый', about: 'Программы на Lua выполняются прямо в симуляторе: от первой команды и светодиодов до маршрутов, датчиков, событий и камеры.' },
    { track: 'python', slug: 'python', label: 'Python', course: 'Курс Python (pioneer_sdk) для Пионера Базовый', about: 'Python с библиотекой pioneer_sdk: управление дроном по связи, полёт по точкам, светодиоды, камера и ArUco-метки.' },
    { track: 'blocks', slug: 'blockly', label: 'Blockly', course: 'Курс Blockly для Пионера Базовый', about: 'Программа собирается из блоков, как конструктор: взлёт, посадка, маршрут, светодиоды и условия без кода.' },
    { track: 'sdk2', slug: 'python-sdk2', label: 'Python SDK 2', course: 'Курс Python SDK 2 для Пионера Мини 2', about: 'Python с библиотекой pioneer_sdk2: программа выполняется на борту дрона. Камера, нейросети, ROS 2 и рой.' },
    { track: 'bricks', slug: 'bricks', label: 'Pioneer Bricks', course: 'Курс Pioneer Bricks для Пионера Мини 2', about: 'Блоки Pioneer Bricks, как в программе Геоскан: полёт, светодиоды, датчики и камера для Пионера Мини 2.' }
];

export const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Текст урока без разметки: обратные кавычки и ** убираются, остатки <lua>/<py> теряют теги. */
export function plain(text: string): string {
    return String(text ?? '')
        .replace(/<\/?(?:lua|py|code|b|strong|em|i|br)\s*\/?>/gi, ' ')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\*\*([^*]*)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

const clip = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30))}…`;
};

export const lessonPath = (slug: string, id: string) => `/uroki/${slug}/${id}/`;
export const coursePath = (slug: string) => `/uroki/${slug}/`;

const STYLE = `
:root{color-scheme:dark light;--bg:#151515;--card:#1f1f1f;--text:#e8e8e8;--muted:#a6a6a6;--line:#333;--accent:#ff6b00}
@media (prefers-color-scheme:light){:root{--bg:#f4f4f5;--card:#fff;--text:#1b1b1d;--muted:#5b5b60;--line:#dcdce0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent)}header,main,footer{max-width:860px;margin:0 auto;padding:16px 20px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.brand{font-weight:700;color:var(--text);text-decoration:none}.cta{display:inline-block;padding:10px 18px;border-radius:10px;background:var(--accent);color:#fff;font-weight:650;text-decoration:none}
nav.crumbs{font-size:14px;color:var(--muted)}nav.crumbs a{color:var(--muted)}h1{font-size:28px;line-height:1.25;margin:16px 0 8px}h2{font-size:20px;margin:28px 0 8px}
.lead{font-size:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:12px 0}
ol li,ul li{margin:6px 0}.pager{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:28px 0}.muted{color:var(--muted)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}footer{color:var(--muted);font-size:14px;border-top:1px solid var(--line);margin-top:32px}
`;

function shell(options: { title: string; description: string; path: string; body: string; jsonLd?: unknown; crumbs: Array<{ name: string; path?: string }> }): string {
    const url = `${SITE}${options.path}`;
    const crumbList = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [{ name: 'Симулятор', path: '/' }, ...options.crumbs].map((item, index) => ({
            '@type': 'ListItem', position: index + 1, name: item.name, ...(item.path ? { item: `${SITE}${item.path}` } : {})
        }))
    };
    const ld = [options.jsonLd, crumbList].filter(Boolean).map((item) => `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`).join('\n');
    const trail = [{ name: 'Симулятор', path: '/' }, ...options.crumbs].map((item) => (item.path ? `<a href="${item.path}">${escapeHtml(item.name)}</a>` : escapeHtml(item.name))).join(' › ');
    return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Симулятор Геоскан Пионер">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${escapeHtml(options.title)}">
<meta property="og:description" content="${escapeHtml(options.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<style>${STYLE}</style>
${ld}
</head>
<body>
<header><a class="brand" href="/">Симулятор квадрокоптера Геоскан Пионер</a><a class="cta" href="/">Открыть симулятор</a></header>
<main>
<nav class="crumbs" aria-label="Путь">${trail}</nav>
${options.body}
</main>
<footer>Бесплатный онлайн-симулятор квадрокоптера Геоскан Пионер: Lua, Python и блоки, уроки с проверкой полёта. <a href="/uroki/">Все уроки</a></footer>
</body>
</html>
`;
}

export function renderLessonPage(info: SeoTrack, quest: Quest, prev: Quest | null, next: Quest | null): string {
    const goal = plain(quest.goal);
    const steps = quest.steps.map(plain).filter(Boolean);
    const hint = plain(quest.hint);
    const outcome = plain(quest.outcome);
    const title = clip(`${quest.number}. ${plain(quest.title)}: урок ${info.label} для квадрокоптера Пионер`, 78);
    const description = clip(`${goal} Урок ${quest.number} курса «${info.course}» в симуляторе квадрокоптера Геоскан Пионер, с проверкой полёта.`, 158);
    const path = lessonPath(info.slug, quest.id);
    const body = `<h1>Миссия ${quest.number}. ${escapeHtml(plain(quest.title))}</h1>
<p class="muted">${escapeHtml(info.course)} · глава «${escapeHtml(plain(quest.groupTitle))}»</p>
<p class="lead">${escapeHtml(goal)}</p>
${steps.length ? `<h2>Что нужно сделать</h2>\n<ol>${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}
${hint ? `<h2>Подсказка</h2>\n<p>${escapeHtml(hint)}</p>` : ''}
${outcome ? `<h2>Что получится</h2>\n<p>${escapeHtml(outcome)}</p>` : ''}
<div class="card"><strong>Как пройти миссию.</strong> Откройте <a href="/">симулятор</a>, нажмите «Обучение», выберите «${escapeHtml(info.label)}» и найдите миссию ${quest.number}. Программа запускается в браузере, а проверка полёта засчитывает миссию.</div>
<div class="pager">${prev ? `<a href="${lessonPath(info.slug, prev.id)}">← ${prev.number}. ${escapeHtml(plain(prev.title))}</a>` : '<span></span>'}${next ? `<a href="${lessonPath(info.slug, next.id)}">${next.number}. ${escapeHtml(plain(next.title))} →</a>` : '<span></span>'}</div>
<p><a href="${coursePath(info.slug)}">Все миссии курса «${escapeHtml(info.course)}»</a></p>`;
    return shell({
        title, description, path, body,
        crumbs: [{ name: 'Уроки', path: '/uroki/' }, { name: info.label, path: coursePath(info.slug) }, { name: `Миссия ${quest.number}` }],
        jsonLd: {
            '@context': 'https://schema.org', '@type': 'LearningResource', name: `${quest.number}. ${plain(quest.title)}`, description: goal,
            inLanguage: 'ru', url: `${SITE}${path}`, learningResourceType: 'Практическое задание', educationalLevel: 'Начальный',
            isPartOf: { '@type': 'Course', name: info.course, url: `${SITE}${coursePath(info.slug)}`, provider: { '@type': 'Organization', name: 'Симулятор Геоскан Пионер', url: SITE } },
            isAccessibleForFree: true
        }
    });
}

export function renderCoursePage(info: SeoTrack, quests: Quest[]): string {
    const groups = new Map<string, Quest[]>();
    for (const quest of quests) (groups.get(quest.groupTitle) ?? groups.set(quest.groupTitle, []).get(quest.groupTitle)!).push(quest);
    const path = coursePath(info.slug);
    const body = `<h1>${escapeHtml(info.course)}</h1>
<p class="lead">${escapeHtml(info.about)}</p>
<p>В курсе ${quests.length} ${quests.length % 10 === 1 && quests.length % 100 !== 11 ? 'миссия' : 'миссий'} с проверкой полёта. Каждая миссия объясняет, что сделать, даёт подсказку и засчитывается после успешного запуска в симуляторе.</p>
${[...groups.entries()].map(([group, list]) => `<h2>${escapeHtml(plain(group))}</h2>\n<ul>${list.map((quest) => `<li><a href="${lessonPath(info.slug, quest.id)}">${quest.number}. ${escapeHtml(plain(quest.title))}</a></li>`).join('')}</ul>`).join('\n')}`;
    return shell({
        title: clip(`${info.course}: ${quests.length} уроков онлайн`, 78),
        description: clip(`${info.about} ${quests.length} миссий с проверкой полёта в симуляторе квадрокоптера Геоскан Пионер.`, 158),
        path, body, crumbs: [{ name: 'Уроки', path: '/uroki/' }, { name: info.label }],
        jsonLd: { '@context': 'https://schema.org', '@type': 'Course', name: info.course, description: info.about, inLanguage: 'ru', url: `${SITE}${path}`, provider: { '@type': 'Organization', name: 'Симулятор Геоскан Пионер', url: SITE }, isAccessibleForFree: true }
    });
}

export function renderIndexPage(courses: Array<{ info: SeoTrack; count: number }>): string {
    const total = courses.reduce((sum, item) => sum + item.count, 0);
    const body = `<h1>Уроки программирования квадрокоптера Геоскан Пионер</h1>
<p class="lead">Более ${Math.floor(total / 50) * 50} миссий с проверкой полёта: Lua, Python и блоки для Пионера Базовый и Пионера Мини 2. Устанавливать ничего не нужно, программа запускается в браузере.</p>
<div class="grid">${courses.map(({ info, count }) => `<a class="card" href="${coursePath(info.slug)}" style="text-decoration:none;color:inherit"><strong>${escapeHtml(info.course)}</strong><br><span class="muted">${count} миссий</span><p>${escapeHtml(info.about)}</p></a>`).join('')}</div>`;
    return shell({
        title: 'Уроки программирования квадрокоптера Пионер: Lua, Python, блоки',
        description: `Бесплатные уроки программирования квадрокоптера Геоскан Пионер: Lua, Python и блоки Blockly и Bricks. ${total} миссий с проверкой полёта.`.slice(0, 158),
        path: '/uroki/', body, crumbs: [{ name: 'Уроки' }],
        jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Уроки программирования квадрокоптера Геоскан Пионер', url: `${SITE}/uroki/`, inLanguage: 'ru' }
    });
}

export function renderSitemap(paths: string[], lastmod: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${SITE}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

export type SeoFile = { file: string; content: string };

/** Все файлы сайта уроков: относительные пути внутри static/. */
export function buildSeoSite(questsFor: (track: SeoTrack['track']) => Quest[], lastmod = new Date().toISOString().slice(0, 10)): SeoFile[] {
    const files: SeoFile[] = [];
    const paths: string[] = ['/uroki/'];
    const courses: Array<{ info: SeoTrack; count: number }> = [];
    for (const info of SEO_TRACKS) {
        const quests = questsFor(info.track);
        courses.push({ info, count: quests.length });
        files.push({ file: `uroki/${info.slug}/index.html`, content: renderCoursePage(info, quests) });
        paths.push(coursePath(info.slug));
        quests.forEach((quest, index) => {
            files.push({ file: `uroki/${info.slug}/${quest.id}/index.html`, content: renderLessonPage(info, quest, quests[index - 1] ?? null, quests[index + 1] ?? null) });
            paths.push(lessonPath(info.slug, quest.id));
        });
    }
    files.push({ file: 'uroki/index.html', content: renderIndexPage(courses) });
    files.push({ file: 'sitemap-lessons.xml', content: renderSitemap(paths, lastmod) });
    return files;
}
