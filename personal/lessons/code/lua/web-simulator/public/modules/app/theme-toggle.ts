import { setEditorTheme } from '../editor/index.js';

export type AppTheme = 'light' | 'dark';

const APP_THEME_STORAGE_KEY = 'geoskan_app_theme_v1';

function getStoredTheme(): AppTheme | null {
    if (typeof window === 'undefined') return null;

    const savedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
}

function getSystemTheme(): AppTheme {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(): AppTheme {
    return getStoredTheme() || getSystemTheme();
}

function updateThemeToggleButton(theme: AppTheme): void {
    const themeToggleButton = document.getElementById('theme-toggle') as HTMLButtonElement | null;
    if (!themeToggleButton) return;

    const label = themeToggleButton.querySelector('.header-theme-toggle__label');
    themeToggleButton.setAttribute('aria-pressed', String(theme === 'dark'));
    themeToggleButton.title = theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему';
    themeToggleButton.setAttribute('aria-label', themeToggleButton.title);
    if (label) {
        label.textContent = theme === 'dark' ? 'Темная тема' : 'Светлая тема';
    }
}

export function applyAppTheme(theme: AppTheme): void {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    updateThemeToggleButton(theme);
    setEditorTheme(theme);
    window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
}

export function initThemeToggle(): void {
    const themeToggleButton = document.getElementById('theme-toggle') as HTMLButtonElement | null;
    const initialTheme = resolveTheme();

    updateThemeToggleButton(initialTheme);
    document.documentElement.style.colorScheme = initialTheme;
    setEditorTheme(initialTheme);

    if (!themeToggleButton) return;

    themeToggleButton.addEventListener('click', () => {
        const currentTheme = (document.documentElement.dataset.theme as AppTheme | undefined) || initialTheme;
        applyAppTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}
