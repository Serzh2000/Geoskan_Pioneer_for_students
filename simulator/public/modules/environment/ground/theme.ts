/**
 * Тема и цветовые палитры для пола и посадочной площадки.
 * Изолирует выбор светлой/темной схемы от построения геометрии.
 */
export type GroundTheme = 'light' | 'dark';

export function getGroundTheme(): GroundTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

