import { allowedWeather, formatHour, landscapeFogDensity, mixColor, normalizeHour, sanitizeAtmosphere, seasonLook, sunAt, weatherLook } from '../public/modules/world/atmosphere-model.js';

describe('landscape visibility', () => {
    // THREE.FogExp2 transmittance: how much of the original scene remains visible at a given depth.
    const transmittance = (density: number, depth: number) => Math.exp(-Math.pow(density * depth, 2));

    it('keeps a 600 m clear map readable from its full-map overview', () => {
        const density = landscapeFogDensity(600);
        expect(transmittance(density, 1000)).toBeGreaterThan(.8);
        expect(transmittance(density, 1500)).toBeGreaterThan(.65);
        expect(transmittance(density, 600)).toBeCloseTo(transmittance(landscapeFogDensity(30), 30));
    });

    it('preserves laboratory haze for a 30 m arena and invalid map extents', () => {
        for (const size of [30, 10, 0, -600, NaN, Infinity, -Infinity]) {
            expect(landscapeFogDensity(size)).toBe(.008);
        }
    });

    it('still reduces map visibility in cloudy and rainy weather', () => {
        const base = landscapeFogDensity(600);
        const visible = (weather: 'clear' | 'clouds' | 'rain') => transmittance(base * weatherLook(weather, 'summer').fogScale, 1000);
        expect(visible('rain')).toBeLessThan(visible('clouds'));
        expect(visible('clouds')).toBeLessThan(visible('clear'));
    });
});

describe('sun and sky', () => {
    it('is up at noon, down at midnight, and rises in the east and sets in the west', () => {
        expect(sunAt(12).height).toBeGreaterThan(.95);
        expect(sunAt(0).height).toBeLessThan(-.95);
        expect(sunAt(8).direction[0]).toBeGreaterThan(0);
        expect(sunAt(16).direction[0]).toBeLessThan(0);
    });
    it('gives light by day and glowing windows by night', () => {
        expect(sunAt(12).sunIntensity).toBeGreaterThan(2);
        expect(sunAt(12).night).toBeLessThan(.05);
        expect(sunAt(0).sunIntensity).toBe(0);
        expect(sunAt(0).night).toBeGreaterThan(.95);
        expect(sunAt(0).moonIntensity).toBeGreaterThan(.3);
    });
    it('has a warm sun and a real dusk between day and night', () => {
        const noon = sunAt(12), sunset = sunAt(17.6), dusk = sunAt(19), midnight = sunAt(0);
        expect(sunset.sunColor).not.toBe(noon.sunColor);
        expect(dusk.night).toBeGreaterThan(.1);
        expect(dusk.night).toBeLessThan(.95);
        expect(dusk.sky).not.toBe(midnight.sky);
    });
    it('is continuous: neighbouring minutes never jump', () => {
        let previous = sunAt(0);
        for (let h = .05; h <= 24; h += .05) {
            const current = sunAt(h);
            expect(Math.abs(current.night - previous.night)).toBeLessThan(.12);
            expect(Math.abs(current.sunIntensity - previous.sunIntensity)).toBeLessThan(.3);
            previous = current;
        }
    });
    it('formats and wraps hours', () => {
        expect(formatHour(7.5)).toBe('07:30');
        expect(formatHour(25.25)).toBe('01:15');
        expect(normalizeHour(-1)).toBe(23);
        expect(mixColor(0x000000, 0xffffff, .5)).toBe(0x808080);
    });
});

describe('seasons and weather', () => {
    it('summer leaves the generated colours alone, winter covers the ground and strips the broadleaf crowns', () => {
        expect(seasonLook('summer').groundAmount).toBe(0);
        expect(seasonLook('winter').groundAmount).toBeGreaterThan(.8);
        expect(seasonLook('winter').leavesVisible).toBe(false);
        expect(seasonLook('autumn').leavesVisible).toBe(true);
        expect(seasonLook('autumn').leaf).not.toBe(seasonLook('spring').leaf);
    });
    it('snow only in winter, rain only otherwise', () => {
        expect(allowedWeather('winter')).toContain('snow');
        expect(allowedWeather('winter')).not.toContain('rain');
        expect(allowedWeather('summer')).toContain('rain');
        expect(allowedWeather('summer')).not.toContain('snow');
    });
    it('weather dims the sun and thickens the air', () => {
        expect(weatherLook('clear', 'summer').sunScale).toBe(1);
        expect(weatherLook('rain', 'summer').sunScale).toBeLessThan(weatherLook('clouds', 'summer').sunScale);
        expect(weatherLook('rain', 'summer').rain).toBe(1);
        expect(weatherLook('snow', 'winter').snow).toBe(1);
        expect(weatherLook('rain', 'summer').fogScale).toBeGreaterThan(1);
    });
    it('sanitizes untrusted state', () => {
        expect(sanitizeAtmosphere({ season: 'winter', weather: 'rain' }).weather).toBe('clear');
        expect(sanitizeAtmosphere({ hour: NaN as unknown as number }).hour).toBe(0);
        expect(sanitizeAtmosphere({ season: 'monsoon' as never }).season).toBe('summer');
        expect(sanitizeAtmosphere({ mode: 'x' as never }).mode).toBe('theme');
    });
});
