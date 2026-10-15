/*
 * Pure model of the sky: where the sun is, what colour the light and the air are, what each season does to the
 * ground and the trees, and how much weather dims everything. No THREE, no DOM: the scene code in atmosphere.ts
 * only applies these numbers, so the numbers can be tested.
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'clouds' | 'rain' | 'snow';
export type LightingMode = 'theme' | 'clock';
export type AtmosphereState = { mode: LightingMode; hour: number; season: Season; weather: Weather; auto: boolean };

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_LABELS: Record<Season, string> = { spring: 'Весна', summer: 'Лето', autumn: 'Осень', winter: 'Зима' };
export const WEATHER_LABELS: Record<Weather, string> = { clear: 'Ясно', clouds: 'Облачно', rain: 'Дождь', snow: 'Снег' };
export const DEFAULT_ATMOSPHERE: AtmosphereState = { mode: 'theme', hour: 12, season: 'summer', weather: 'clear', auto: false };

/** Keep the laboratory's relative haze across maps, including a distant full-map overview. */
export function landscapeFogDensity(size: number): number {
    const extent = Number.isFinite(size) && size > 0 ? Math.max(30, size) : 30;
    return .008 * 30 / extent;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function normalizeHour(hour: number): number { return ((hour % 24) + 24) % 24; }
export function formatHour(hour: number): string {
    const h = normalizeHour(hour), whole = Math.floor(h), minutes = Math.floor((h - whole) * 60);
    return `${String(whole).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function mixColor(a: number, b: number, t: number): number {
    const k = clamp(t);
    const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - k) + ((b >> shift) & 255) * k);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export type SunState = {
    /** Unit vector toward the sun (Z up). Below the horizon at night, where it points at the moon instead. */
    direction: [number, number, number];
    /** -1 (midnight) .. 1 (noon). */
    height: number;
    sunColor: number; sunIntensity: number;
    moonIntensity: number;
    ambient: number; hemiSky: number; hemiGround: number; hemiIntensity: number;
    sky: number;
    /** 0 by day, 1 at night: windows and street lamps glow with it. */
    night: number;
};

const NOON_SKY = 0xa9cdee, GOLDEN_SKY = 0xf0b384, DUSK_SKY = 0x3a3f6b, NIGHT_SKY = 0x080d1c;

export function sunAt(hourIn: number): SunState {
    const hour = normalizeHour(hourIn);
    // Sunrise 6:00 in the east (+X), noon in the south, sunset 18:00 in the west; the night half mirrors it for the moon.
    const phase = (hour - 6) / 12 * Math.PI;
    const height = Math.sin(phase);
    const east = Math.cos(phase);
    const direction: [number, number, number] = [east, -0.38 * Math.abs(height) - .1, Math.max(.06, Math.abs(height)) * (height >= 0 ? 1 : 1)];
    const length = Math.hypot(...direction);
    const unit: [number, number, number] = [direction[0] / length, direction[1] / length, direction[2] / length];

    const day = smooth(-.14, .24, height);                       // 0 in the dark, 1 in daylight
    const golden = (1 - smooth(.12, .55, Math.abs(height))) * smooth(-.2, .05, height); // warm near the horizon
    const night = 1 - smooth(-.42, .04, height);
    let sky = mixColor(DUSK_SKY, NOON_SKY, smooth(.0, .55, height));
    sky = mixColor(sky, GOLDEN_SKY, golden * .65);
    sky = mixColor(NIGHT_SKY, sky, smooth(-.5, -.02, height));

    return {
        direction: unit,
        height,
        sunColor: mixColor(0xfff3e4, 0xffa05a, golden),
        sunIntensity: 2.4 * day,
        moonIntensity: .35 * night,
        ambient: .06 + .14 * day,
        hemiSky: mixColor(0x1c2748, 0xd8ebff, day),
        hemiGround: mixColor(0x1a1d26, 0x59616b, day),
        hemiIntensity: .28 + .72 * day,
        sky,
        night
    };
}

export type SeasonLook = {
    /** Ground blends from its generated colour toward `ground` by `groundAmount` (noise adds variety). */
    ground: number; groundAmount: number;
    /** Broadleaf foliage colour and whether the crowns are there at all. */
    leaf: number; leafAmount: number; leavesVisible: boolean;
    /** Fir needles pick up this much snow. */
    firSnow: number;
    water: number; waterAmount: number;
    snowCover: number;
};

export function seasonLook(season: Season): SeasonLook {
    switch (season) {
        case 'spring': return { ground: 0x93b86a, groundAmount: .45, leaf: 0x9ccc65, leafAmount: .6, leavesVisible: true, firSnow: 0, water: 0x5f9aa6, waterAmount: .2, snowCover: 0 };
        case 'autumn': return { ground: 0xb08a45, groundAmount: .6, leaf: 0xd1782a, leafAmount: .85, leavesVisible: true, firSnow: 0, water: 0x4d6d72, waterAmount: .2, snowCover: 0 };
        case 'winter': return { ground: 0xeef3f7, groundAmount: .9, leaf: 0xdfe6ea, leafAmount: 1, leavesVisible: false, firSnow: .55, water: 0xc8dde6, waterAmount: .85, snowCover: 1 };
        default: return { ground: 0x7a8962, groundAmount: 0, leaf: 0x4f7a3a, leafAmount: 0, leavesVisible: true, firSnow: 0, water: 0x527c80, waterAmount: 0, snowCover: 0 };
    }
}

export type WeatherLook = {
    /** Multiplies sunlight (clouds and rain take the shadows away). */
    sunScale: number;
    /** Pulls the sky colour toward grey. */
    greyAmount: number; grey: number;
    fogScale: number;
    clouds: number;       // number of cloud banks
    rain: number; snow: number;
};

export function weatherLook(weather: Weather, season: Season): WeatherLook {
    switch (weather) {
        case 'clouds': return { sunScale: .55, greyAmount: .45, grey: 0x9aa4ad, fogScale: 1.4, clouds: 14, rain: 0, snow: 0 };
        case 'rain': return { sunScale: .22, greyAmount: .75, grey: 0x68727c, fogScale: 2.4, clouds: 18, rain: 1, snow: 0 };
        // Snow in summer is a joke; the model keeps it but the UI offers it only in winter, so just fall back to rain's gloom.
        case 'snow': return { sunScale: season === 'winter' ? .4 : .3, greyAmount: .6, grey: 0xb9c2ca, fogScale: 2, clouds: 18, rain: 0, snow: 1 };
        default: return { sunScale: 1, greyAmount: 0, grey: 0x9aa4ad, fogScale: 1, clouds: 5, rain: 0, snow: 0 };
    }
}

/** Snow only falls in winter and rain only when it is not freezing: the UI uses this to keep the combinations sensible. */
export function allowedWeather(season: Season): Weather[] {
    return season === 'winter' ? ['clear', 'clouds', 'snow'] : ['clear', 'clouds', 'rain'];
}

export function sanitizeAtmosphere(state: Partial<AtmosphereState>): AtmosphereState {
    const merged = { ...DEFAULT_ATMOSPHERE, ...state };
    const season = SEASONS.includes(merged.season) ? merged.season : 'summer';
    const weather = allowedWeather(season).includes(merged.weather) ? merged.weather : 'clear';
    return { mode: merged.mode === 'clock' ? 'clock' : 'theme', hour: normalizeHour(Number(merged.hour) || 0), season, weather, auto: Boolean(merged.auto) };
}
