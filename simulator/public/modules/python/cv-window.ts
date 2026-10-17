/*
 * Окно кадров Python-программы: cv2.imshow и ImageViewer.imshow (pioneer_sdk2).
 *
 * Плавающее и немодальное - сцена под ним живёт и кликается. Окно
 * перетаскивается за заголовок, растягивается за правый нижний угол
 * (пропорции кадра сохраняются), разворачивается кнопкой и сворачивается
 * в лоток внизу экрана. Свёрнутое окно кадры не рисует - на это уходило
 * больше всего времени стрима.
 *
 * Кадр рисуется в один и тот же canvas: ImageData создаётся заново только
 * при смене размера, пиксели BGR переносятся в RGBA одним проходом по Uint32.
 */

export type CvTextOverlay = [string, number, number, number, number[], number];

type CvWindow = {
    name: string;
    root: HTMLDivElement;
    title: HTMLSpanElement;
    body: HTMLDivElement;
    canvas: HTMLCanvasElement | null;
    context: CanvasRenderingContext2D | null;
    image: ImageData | null;
    text: HTMLPreElement | null;
    chip: HTMLButtonElement | null;
    minimized: boolean;
    maximized: boolean;
    width: number;
    position: { x: number; y: number } | null;
};

const DEFAULT_WIDTH = 440;
const MIN_WIDTH = 220;
const STORAGE_KEY = 'geoskan_python_cv_windows_v1';

const windows = new Map<string, CvWindow>();
let layer: HTMLDivElement | null = null;
let tray: HTMLDivElement | null = null;
let onUserClose: () => void = () => undefined;

const ICONS = {
    video: '<path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/>',
    minimize: '<path d="M5 12l14 0"/>',
    maximize: '<path d="M4 8v-2a2 2 0 0 1 2 -2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2 -2v-2"/>',
    restore: '<path d="M5 9l4 0l0 -4"/><path d="M3 3l6 6"/><path d="M5 15l4 0l0 4"/><path d="M3 21l6 -6"/><path d="M19 9l-4 0l0 -4"/><path d="M15 9l6 -6"/><path d="M19 15l-4 0l0 4"/><path d="M15 15l6 6"/>',
    close: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>'
} as const;

function svg(name: keyof typeof ICONS, size = 15) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

type SavedWindow = { width?: number; x?: number; y?: number };

function loadSaved(): Record<string, SavedWindow> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

function save(win: CvWindow) {
    try {
        const all = loadSaved();
        all[win.name] = { width: win.width, ...(win.position ?? {}) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
        // Хранилище недоступно: окно просто откроется на месте по умолчанию.
    }
}

function ensureLayer() {
    if (layer && tray) return;
    layer = document.createElement('div');
    layer.className = 'py-cv-layer';
    tray = document.createElement('div');
    tray.className = 'py-cv-tray';
    tray.setAttribute('role', 'toolbar');
    tray.setAttribute('aria-label', 'Свёрнутые окна камеры');
    layer.appendChild(tray);
    document.body.appendChild(layer);
}

function clamp(win: CvWindow) {
    if (!win.position) return;
    const maxX = Math.max(0, window.innerWidth - win.root.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - 36);
    win.position = {
        x: Math.min(Math.max(0, win.position.x), maxX),
        y: Math.min(Math.max(0, win.position.y), maxY)
    };
}

function layout(win: CvWindow) {
    const { root } = win;
    root.hidden = win.minimized;
    root.classList.toggle('is-maximized', win.maximized);
    if (win.maximized) {
        root.style.width = '';
        root.style.left = '';
        root.style.top = '';
    } else {
        root.style.width = `${win.width}px`;
        if (!win.position) {
            // Новое окно - справа сверху, следующие - лесенкой.
            const index = [...windows.values()].indexOf(win);
            win.position = { x: window.innerWidth - win.width - 24 - index * 28, y: 72 + index * 28 };
        }
        clamp(win);
        root.style.left = `${win.position.x}px`;
        root.style.top = `${win.position.y}px`;
    }
    const maximize = root.querySelector<HTMLButtonElement>('[data-action="maximize"]');
    if (maximize) {
        maximize.innerHTML = svg(win.maximized ? 'restore' : 'maximize');
        maximize.title = win.maximized ? 'Вернуть прежний размер' : 'Развернуть';
        maximize.setAttribute('aria-label', maximize.title);
    }
    renderTray();
}

function renderTray() {
    if (!tray) return;
    const minimized = [...windows.values()].filter((win) => win.minimized);
    tray.hidden = minimized.length === 0;
    tray.replaceChildren(...minimized.map((win) => {
        if (!win.chip) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'py-cv-tray__chip';
            chip.addEventListener('click', () => {
                win.minimized = false;
                layout(win);
            });
            win.chip = chip;
        }
        win.chip.innerHTML = `${svg('video', 14)}<span>${escapeHtml(win.name)}</span>`;
        win.chip.title = `Развернуть окно «${win.name}»`;
        return win.chip;
    }));
}

function escapeHtml(text: string) {
    return text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
}

function installDragging(win: CvWindow, head: HTMLElement) {
    head.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || win.maximized || (event.target as HTMLElement).closest('button')) return;
        event.preventDefault();
        const rect = win.root.getBoundingClientRect();
        const grab = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        head.setPointerCapture(event.pointerId);
        win.root.classList.add('is-dragging');
        const move = (moveEvent: PointerEvent) => {
            win.position = { x: moveEvent.clientX - grab.x, y: moveEvent.clientY - grab.y };
            layout(win);
        };
        const up = () => {
            win.root.classList.remove('is-dragging');
            head.removeEventListener('pointermove', move);
            head.removeEventListener('pointerup', up);
            head.removeEventListener('pointercancel', up);
            save(win);
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        head.addEventListener('pointercancel', up);
    });
    head.addEventListener('dblclick', (event) => {
        if ((event.target as HTMLElement).closest('button')) return;
        win.maximized = !win.maximized;
        layout(win);
    });
}

function installResizing(win: CvWindow, grip: HTMLElement) {
    grip.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || win.maximized) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = win.width;
        grip.setPointerCapture(event.pointerId);
        win.root.classList.add('is-resizing');
        const move = (moveEvent: PointerEvent) => {
            const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - (win.position?.x ?? 0) - 8);
            win.width = Math.round(Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX)));
            layout(win);
        };
        const up = () => {
            win.root.classList.remove('is-resizing');
            grip.removeEventListener('pointermove', move);
            grip.removeEventListener('pointerup', up);
            grip.removeEventListener('pointercancel', up);
            save(win);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
        grip.addEventListener('pointercancel', up);
    });
    // С клавиатуры: стрелки влево/вправо меняют ширину.
    grip.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        win.width = Math.max(MIN_WIDTH, win.width + (event.key === 'ArrowRight' ? 40 : -40));
        layout(win);
        save(win);
    });
}

function button(action: string, icon: keyof typeof ICONS, label: string) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'py-cv-window__btn';
    el.dataset.action = action;
    el.title = label;
    el.setAttribute('aria-label', label);
    el.innerHTML = svg(icon);
    return el;
}

export function setCvWindowCloseHandler(handler: () => void) {
    onUserClose = handler;
}

export function openCvWindow(name: string): CvWindow | null {
    if (typeof document === 'undefined' || !document.body) return null;
    const existing = windows.get(name);
    if (existing) {
        if (existing.root.dataset.closed === 'true') {
            existing.root.dataset.closed = 'false';
            existing.minimized = false;
            layout(existing);
        }
        return existing;
    }
    ensureLayer();

    const root = document.createElement('div');
    root.className = 'py-cv-window';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', `Камера: ${name}`);

    const head = document.createElement('div');
    head.className = 'py-cv-window__head';
    const icon = document.createElement('span');
    icon.className = 'py-cv-window__icon';
    icon.innerHTML = svg('video', 14);
    const title = document.createElement('span');
    title.className = 'py-cv-window__title';
    title.textContent = name;
    title.title = `${name} - перетащите за заголовок, двойной щелчок разворачивает`;
    const minimize = button('minimize', 'minimize', 'Свернуть в лоток');
    const maximize = button('maximize', 'maximize', 'Развернуть');
    const close = button('close', 'close', 'Закрыть (как Esc)');
    head.append(icon, title, minimize, maximize, close);

    const body = document.createElement('div');
    body.className = 'py-cv-window__body';

    const grip = document.createElement('div');
    grip.className = 'py-cv-window__grip';
    grip.tabIndex = 0;
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-label', 'Изменить размер окна');
    grip.title = 'Потяните, чтобы изменить размер';
    grip.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M11 5L5 11"/><path d="M11 9L9 11"/></svg>';

    root.append(head, body, grip);
    layer!.insertBefore(root, tray);

    const saved = loadSaved()[name];
    const win: CvWindow = {
        name, root, title, body,
        canvas: null, context: null, image: null, text: null, chip: null,
        minimized: false, maximized: false,
        width: Math.max(MIN_WIDTH, Number(saved?.width) || DEFAULT_WIDTH),
        position: Number.isFinite(saved?.x) && Number.isFinite(saved?.y) ? { x: saved!.x!, y: saved!.y! } : null
    };
    windows.set(name, win);

    minimize.addEventListener('click', () => {
        win.minimized = true;
        layout(win);
    });
    maximize.addEventListener('click', () => {
        win.maximized = !win.maximized;
        layout(win);
    });
    close.addEventListener('click', () => {
        root.dataset.closed = 'true';
        win.minimized = false;
        root.hidden = true;
        renderTray();
        onUserClose();
    });
    installDragging(win, head);
    installResizing(win, grip);
    layout(win);
    return win;
}

/** Окно на экране и кадр в нём кто-то увидит. Свёрнутое или закрытое - нет. */
export function isCvWindowShowing(win: CvWindow) {
    return !win.minimized && win.root.dataset.closed !== 'true';
}

export function drawCvFrame(
    win: CvWindow,
    width: number,
    height: number,
    pixels: Uint8Array | ArrayLike<number>,
    texts?: CvTextOverlay[] | null,
    format: 'bgr' | 'rgba' = 'bgr'
) {
    if (!win.canvas) {
        win.canvas = document.createElement('canvas');
        win.context = win.canvas.getContext('2d');
        win.text?.remove();
        win.text = null;
        win.body.replaceChildren(win.canvas);
    }
    const canvas = win.canvas;
    const context = win.context;
    if (!context) return;
    if (canvas.width !== width || canvas.height !== height || !win.image) {
        canvas.width = width;
        canvas.height = height;
        win.image = context.createImageData(width, height);
        win.body.style.aspectRatio = `${width} / ${height}`;
    }
    if (format === 'rgba') {
        // Готовый RGBA из numpy: одно копирование памяти.
        win.image.data.set(pixels as ArrayLike<number>);
    } else {
        // BGR -> RGBA: одно слово на пиксель (порядок байт little-endian: ABGR).
        const out = new Uint32Array(win.image.data.buffer);
        for (let pixel = 0, src = 0; pixel < out.length; pixel += 1, src += 3) {
            out[pixel] = 0xff000000 | (pixels[src] << 16) | (pixels[src + 1] << 8) | pixels[src + 2];
        }
    }
    context.putImageData(win.image, 0, 0);
    if (Array.isArray(texts) && texts.length > 0) {
        const family = getComputedStyle(win.root).fontFamily || 'sans-serif';
        for (const [text, x, y, scale, color, thickness] of texts) {
            const [b = 255, g = 255, r = 255] = Array.from(color ?? []).map(Number);
            context.font = `${Number(thickness) >= 2 ? '600 ' : ''}${Math.max(6, Math.round(22 * Number(scale)))}px ${family}`;
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.fillText(String(text), Number(x), Number(y));
        }
    }
}

export function showCvText(win: CvWindow, text: string) {
    if (!win.text) {
        win.text = document.createElement('pre');
        win.text.className = 'py-cv-window__text';
        win.canvas = null;
        win.context = null;
        win.image = null;
        win.body.style.aspectRatio = '';
        win.body.replaceChildren(win.text);
    }
    win.text.textContent = text;
}

export function destroyAllCvWindows() {
    for (const win of windows.values()) win.root.remove();
    windows.clear();
    renderTray();
}
