/**
 * Рисунки достижений: медали в виде SVG. Форма и цвет металла показывают редкость (бронза, серебро, золото, фирменная
 * оранжевая), значок внутри — за что награда. Пока награда не получена, медаль серая, а вокруг идёт кольцо прогресса.
 * Все цвета лежат в самом рисунке: медаль одинаково читается в тёмной и светлой теме.
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'brand';
export type Glyph = 'drone' | 'num10' | 'num25' | 'num50' | 'num100' | 'flame' | 'target' | 'book' | 'globe' | 'bolt' | 'blocks' | 'moon' | 'code';

const METALS: Record<Tier, { light: string; mid: string; dark: string; rim: string; ink: string }> = {
    bronze: { light: '#f0b27a', mid: '#cd7f32', dark: '#8a4b1a', rim: '#ffd4a8', ink: '#4a2508' },
    silver: { light: '#f4f7fb', mid: '#b4bfcd', dark: '#76849a', rim: '#ffffff', ink: '#2c3646' },
    gold: { light: '#fff0a8', mid: '#f2b632', dark: '#b8780f', rim: '#fff9d6', ink: '#5a3a02' },
    brand: { light: '#ffc08a', mid: '#ff6b00', dark: '#b34400', rim: '#ffe2cc', ink: '#4a1d00' }
};

/** Контур медали: чем выше редкость, тем сложнее форма. Все контуры вписаны в круг радиусом 46 с центром (60, 56). */
function shapePath(tier: Tier): string {
    if (tier === 'bronze') return 'M60 10a46 46 0 1 1 0 92a46 46 0 1 1 0-92z';
    if (tier === 'silver') return 'M60 9l39.800 23v46L60 101 20.200 78V32z';
    if (tier === 'gold') {
        // двенадцатилучевая розетка
        const points: string[] = [];
        for (let i = 0; i < 24; i += 1) {
            const radius = i % 2 === 0 ? 47 : 40.500;
            const angle = (Math.PI * 2 * i) / 24 - Math.PI / 2;
            points.push(`${(60 + radius * Math.cos(angle)).toFixed(2)} ${(56 + radius * Math.sin(angle)).toFixed(2)}`);
        }
        return `M${points.join('L')}z`;
    }
    return 'M60 8c14 8 28 9 40 9v35c0 26-17 41-40 50C37 93 20 78 20 52V17c12 0 26-1 40-9z';
}

/** Значки: рисуются в квадрате 48 × 48 с центром в (24, 24), цвет задаёт `ink`. */
function glyphMarkup(glyph: Glyph, ink: string, light: string): string {
    const stroke = `fill="none" stroke="${ink}" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"`;
    const fill = `fill="${ink}"`;
    const numeral = (text: string, size: number) => `<text x="24" y="${size > 20 ? 33 : 32}" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-1" ${fill}>${text}</text>`;
    switch (glyph) {
        case 'drone':
            return `<g ${stroke}><path d="M16 16l16 16M32 16L16 32"/></g><rect x="19" y="19" width="10" height="10" rx="3" ${fill}/>
                ${[[12, 12], [36, 12], [12, 36], [36, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${light}" fill-opacity=".55" stroke="${ink}" stroke-width="2.600"/>`).join('')}`;
        case 'num10': return numeral('10', 24);
        case 'num25': return numeral('25', 24);
        case 'num50': return numeral('50', 24);
        case 'num100': return numeral('100', 19);
        case 'flame':
            return `<path d="M24 6c1 7 9 10 9 20a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 4 3 4-1-6 0-11 2-16z" ${fill}/><path d="M24 40a4.500 4.500 0 0 1-4.500-4.500c0-3 2.500-4 4.500-7 2 3 4.500 4 4.500 7A4.500 4.500 0 0 1 24 40z" fill="${light}"/>`;
        case 'target':
            return `<circle cx="22" cy="26" r="16" ${stroke}/><circle cx="22" cy="26" r="9" ${stroke}/><circle cx="22" cy="26" r="3" ${fill}/><path d="M23 25l15-15M33 8l7 1 1 7" ${stroke}/>`;
        case 'book':
            return `<path d="M24 12c-4-3-10-4-16-3v26c6-1 12 0 16 3 4-3 10-4 16-3V9c-6-1-12 0-16 3z" ${stroke}/><path d="M24 12v26" ${stroke}/>`;
        case 'globe':
            return `<circle cx="24" cy="24" r="16" ${stroke}/><ellipse cx="24" cy="24" rx="7" ry="16" ${stroke}/><path d="M8 24h32M10.500 15h27M10.500 33h27" ${stroke}/>`;
        case 'bolt':
            return `<path d="M27 4L10 27h12l-3 17 19-25H26z" ${fill}/>`;
        case 'blocks':
            return `<rect x="7" y="25" width="15" height="15" rx="3" ${fill}/><rect x="26" y="25" width="15" height="15" rx="3" ${fill}/><rect x="16.500" y="8" width="15" height="15" rx="3" fill="${light}" stroke="${ink}" stroke-width="2.800"/>`;
        case 'moon':
            return `<path d="M33 31A15 15 0 1 1 20 9a12 12 0 0 0 13 22z" ${fill}/><circle cx="35" cy="12" r="4.500" ${fill}/>`;
        case 'code':
            return `<path d="M17 13L6 24l11 11M31 13l11 11-11 11M27 9L21 39" ${stroke}/>`;
    }
}

let uid = 0;

export type MedalOptions = {
    tier: Tier;
    glyph: Glyph;
    earned: boolean;
    /** Доля выполнения 0–1: для ещё не полученной награды рисуется кольцо. */
    fraction?: number;
    /** Подпись для вспомогательных технологий. */
    label: string;
    size?: number;
};

/** Медаль целиком: лента, металл, блик, значок и кольцо прогресса. Каждый рисунок получает свои идентификаторы градиентов. */
export function renderMedal({ tier, glyph, earned, fraction = 0, label, size = 96 }: MedalOptions): string {
    const id = `m${++uid}`;
    const metal = METALS[tier];
    const ring = Math.max(0, Math.min(1, fraction));
    const circumference = 2 * Math.PI * 52;
    const gradient = earned
        ? `<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metal.light}"/><stop offset=".5" stop-color="${metal.mid}"/><stop offset="1" stop-color="${metal.dark}"/></linearGradient>`
        : `<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a93a0"/><stop offset="1" stop-color="#5a6270"/></linearGradient>`;
    const ink = earned ? metal.ink : '#2a303a';
    const rim = earned ? metal.rim : '#aab2bf';
    const ribbon = earned
        ? `<path d="M40 96l-9 22 13-6 6 10 6-27z" fill="#d13b2e"/><path d="M80 96l9 22-13-6-6 10-6-27z" fill="#a82a20"/>`
        : '';
    const progress = !earned && ring > 0
        ? `<circle cx="60" cy="56" r="52" fill="none" stroke="#ff6b00" stroke-width="3.500" stroke-linecap="round" stroke-dasharray="${(circumference * ring).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 60 56)"/>`
        : '';
    const track = !earned ? `<circle cx="60" cy="56" r="52" fill="none" stroke="#6f7886" stroke-opacity=".35" stroke-width="3.500" stroke-dasharray="2 5"/>` : '';
    const shine = earned
        ? `<path d="M26 40c6-18 20-26 40-26-14 5-24 14-30 32z" fill="#fff" fill-opacity=".38"/>`
        : '';
    return `<svg class="medal medal--${tier}${earned ? ' is-earned' : ' is-locked'}" viewBox="0 0 120 124" width="${size}" height="${Math.round(size * 124 / 120)}" role="img" aria-label="${label.replace(/"/g, '&quot;')}" focusable="false">
        <defs>${gradient}<radialGradient id="${id}g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        ${track}${progress}${ribbon}
        <path d="${shapePath(tier)}" fill="url(#${id}f)" stroke="${rim}" stroke-width="2.500" stroke-linejoin="round"/>
        <path d="${shapePath(tier)}" fill="url(#${id}g)" transform="translate(60 56) scale(.84) translate(-60 -56)" opacity="${earned ? 1 : .25}"/>
        <circle cx="60" cy="56" r="29" fill="${earned ? metal.light : '#9aa3b0'}" fill-opacity="${earned ? '.30' : '.25'}" stroke="${rim}" stroke-opacity=".7" stroke-width="1.500"/>
        <g transform="translate(36 32)" opacity="${earned ? 1 : .7}">${glyphMarkup(glyph, ink, earned ? metal.light : '#b9c0cb')}</g>
        ${shine}
    </svg>`;
}

/** Звания по числу пройденных миссий: чем больше, тем больше шевронов в эмблеме. */
export const RANKS: ReadonlyArray<{ from: number; title: string }> = [
    { from: 0, title: 'Новичок' },
    { from: 5, title: 'Курсант' },
    { from: 15, title: 'Стажёр' },
    { from: 30, title: 'Пилот' },
    { from: 60, title: 'Штурман' },
    { from: 100, title: 'Командир звена' },
    { from: 180, title: 'Мастер полётов' }
];

export function rankFor(done: number): { index: number; title: string; next: { title: string; need: number } | null } {
    let index = 0;
    RANKS.forEach((rank, i) => { if (done >= rank.from) index = i; });
    const next = RANKS[index + 1];
    return { index, title: RANKS[index].title, next: next ? { title: next.title, need: next.from - done } : null };
}

/** Эмблема звания: щит и шевроны по числу ступеней. */
export function renderRankBadge(index: number, size = 44): string {
    const chevrons = Array.from({ length: Math.max(1, Math.min(index, 6)) }, (_, i) => `<path d="M14 ${30 - i * 5}l10 6 10-6" fill="none" stroke="#fff" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    return `<svg class="rank-badge" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="M24 3c6 4 12 5 18 5v16c0 12-8 19-18 23C14 43 6 36 6 24V8c6 0 12-1 18-5z" fill="#ff6b00"/><path d="M24 3c6 4 12 5 18 5v16c0 12-8 19-18 23z" fill="#b34400" fill-opacity=".35"/>${index === 0 ? '<circle cx="24" cy="24" r="4" fill="#fff"/>' : chevrons}</svg>`;
}
