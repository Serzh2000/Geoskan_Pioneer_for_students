type CvWindowState = {
    root: HTMLDivElement;
    title: HTMLDivElement;
    body: HTMLDivElement;
};

const cvWindows = new Map<string, CvWindowState>();
let cvKeyboardInstalled = false;
let lastCvKeyCode = -1;

function installCvKeyboardBridge() {
    if (cvKeyboardInstalled || typeof window === 'undefined') return;
    cvKeyboardInstalled = true;
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            lastCvKeyCode = 27;
            return;
        }
        if (event.key && event.key.length === 1) {
            lastCvKeyCode = event.key.charCodeAt(0);
        }
    });
}

function ensureCvWindow(windowName: string) {
    const existing = cvWindows.get(windowName);
    if (existing) {
        existing.root.style.display = 'flex';
        existing.title.textContent = windowName || 'OpenCV Preview';
        return existing;
    }

    const host = document.body;
    if (!host) return null;

    const root = document.createElement('div');
    root.className = 'python-cv-modal modal-overlay';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.padding = '24px';
    root.style.background = 'rgba(2, 6, 23, 0.7)';
    root.style.backdropFilter = 'blur(4px)';
    root.style.zIndex = '1200';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '14px 16px';
    header.style.background = 'rgba(30, 41, 59, 0.95)';
    header.style.borderBottom = '1px solid rgba(148, 163, 184, 0.18)';

    const title = document.createElement('div');
    title.textContent = windowName || 'OpenCV Preview';
    title.style.fontSize = '16px';
    title.style.fontWeight = '600';

    const hint = document.createElement('div');
    hint.textContent = '`q` or `Esc`';
    hint.style.fontSize = '12px';
    hint.style.opacity = '0.75';
    hint.style.marginLeft = '8px';

    const titleWrap = document.createElement('div');
    titleWrap.style.display = 'flex';
    titleWrap.style.alignItems = 'center';
    titleWrap.append(title, hint);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Закрыть';
    closeBtn.style.border = '1px solid rgba(148, 163, 184, 0.28)';
    closeBtn.style.background = 'rgba(15, 23, 42, 0.65)';
    closeBtn.style.color = '#e2e8f0';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '13px';
    closeBtn.style.padding = '6px 10px';
    closeBtn.style.borderRadius = '8px';
    closeBtn.addEventListener('click', () => {
        root.style.display = 'none';
        lastCvKeyCode = 27;
    });

    root.addEventListener('click', (event) => {
        if (event.target === root) {
            root.style.display = 'none';
            lastCvKeyCode = 27;
        }
    });

    header.append(titleWrap, closeBtn);

    const content = document.createElement('div');
    content.className = 'python-cv-modal__content';
    content.style.width = 'min(820px, calc(100vw - 48px))';
    content.style.maxHeight = 'min(88vh, 920px)';
    content.style.background = 'rgba(10, 14, 24, 0.98)';
    content.style.border = '1px solid rgba(96, 165, 250, 0.45)';
    content.style.borderRadius = '16px';
    content.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.45)';
    content.style.color = '#e5eefc';
    content.style.overflow = 'hidden';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const body = document.createElement('div');
    body.style.padding = '16px';
    body.style.fontFamily = 'ui-monospace, SFMono-Regular, Consolas, monospace';
    body.style.fontSize = '13px';
    body.style.lineHeight = '1.45';
    body.style.whiteSpace = 'pre-wrap';
    body.style.minHeight = '320px';
    body.style.maxHeight = 'calc(88vh - 64px)';
    body.style.overflow = 'auto';
    body.textContent = 'Ожидание кадра...';

    content.append(header, body);
    root.appendChild(content);
    host.appendChild(root);

    const state = { root, title, body };
    cvWindows.set(windowName, state);
    return state;
}

function renderCvFrameSummary(frame: unknown) {
    if (!frame) {
        return 'Кадр не получен.\nПроверьте, находится ли дрон в зоне видеомачты.';
    }

    if (typeof frame === 'object') {
        const payload = frame as Record<string, unknown>;
        if (payload.connected === false) {
            const details = typeof payload.message === 'string'
                ? payload.message
                : 'Камера не подключена.';
            return `Камера не подключена.\n${details}\n\nЧто сделать:\n1. Добавьте в сцену видеомачту.\n2. Подлетите дроном ближе к ней.\n3. Запустите пример снова или дождитесь следующего кадра.`;
        }
        if (payload.source === 'video-tower') {
            const lines = [
                'Источник: видеомачта',
                `Tower: ${String(payload.towerName || payload.towerId || 'unknown')}`,
                `Connected: ${String(payload.connected ?? true)}`,
                `Distance: ${String(payload.distance ?? '?')} m`,
                `Drone: ${JSON.stringify(payload.drone_position ?? payload.dronePosition ?? [])}`,
                `Tower: ${JSON.stringify(payload.tower_position ?? [])}`,
                `Delta: ${JSON.stringify(payload.delta ?? [])}`
            ];
            return lines.join('\n');
        }
        if (payload.source === 'fpv-direct') {
            const lines = [
                'Источник: FPV-камера дрона',
                `Connected: ${String(payload.connected ?? true)}`,
                `Distance: ${String(payload.distance ?? 'n/a')}`,
                `Drone: ${JSON.stringify(payload.drone_position ?? payload.dronePosition ?? [])}`
            ];
            return lines.join('\n');
        }
        return JSON.stringify(payload, null, 2);
    }

    return String(frame);
}

export function installCvRuntimeAPI(w: any) {
    installCvKeyboardBridge();
    w.pioneer_cv_imshow = (windowName: string, frame: unknown) => {
        const cvWindow = ensureCvWindow(String(windowName || 'OpenCV Preview'));
        if (!cvWindow) return null;
        cvWindow.root.style.display = 'flex';
        cvWindow.body.textContent = renderCvFrameSummary(frame);
        return null;
    };
    w.pioneer_cv_wait_key = (_delayMs: number) => {
        const keyCode = lastCvKeyCode;
        lastCvKeyCode = -1;
        return keyCode;
    };
    w.pioneer_cv_destroy_all_windows = () => {
        for (const state of cvWindows.values()) {
            state.root.remove();
        }
        cvWindows.clear();
        return null;
    };
}
