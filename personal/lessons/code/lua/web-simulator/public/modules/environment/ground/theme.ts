/**
 * Тема и цветовые палитры для пола и посадочной площадки.
 * Изолирует выбор светлой/темной схемы от построения геометрии.
 */
export type GroundTheme = 'light' | 'dark';

export type FloorPalette = {
    baseColor: string;
    lightSquare: string;
    darkSquare: string;
    seamColor: string;
    accentColor: string;
    speckleBaseTone: number;
    speckleLightAlpha: number;
    speckleDarkAlpha: number;
    scuffColor: string;
    scuffLightAlpha: number;
    scuffDarkAlpha: number;
};

export function getGroundTheme(): GroundTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function getFloorPalette(theme: GroundTheme): FloorPalette {
    if (theme === 'dark') {
        return {
            baseColor: '#0f172a',
            lightSquare: '#162033',
            darkSquare: '#0b1220',
            seamColor: 'rgba(148, 163, 184, 0.16)',
            accentColor: '#ff8f3a',
            speckleBaseTone: 180,
            speckleLightAlpha: 0.03,
            speckleDarkAlpha: 0.022,
            scuffColor: '255, 255, 255',
            scuffLightAlpha: 0.024,
            scuffDarkAlpha: 0.016
        };
    }

    return {
        baseColor: '#f5f7fa',
        lightSquare: '#fbfcfd',
        darkSquare: '#edf1f5',
        seamColor: 'rgba(148, 163, 184, 0.24)',
        accentColor: '#ff6b00',
        speckleBaseTone: 24,
        speckleLightAlpha: 0.018,
        speckleDarkAlpha: 0.016,
        scuffColor: '255, 255, 255',
        scuffLightAlpha: 0.02,
        scuffDarkAlpha: 0.016
    };
}
