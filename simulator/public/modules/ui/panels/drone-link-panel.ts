import { droneLink, type LinkSnapshot } from '../../hardware/drone-link.js';
import { isWebSerialSupported } from '../../hardware/web-serial-transport.js';
import { log } from '../../shared/logging/logger.js';
import { droneScriptStartedNotice, droneScriptStoppedNotice, explainDroneError } from '../../shared/notice-messages/catalog.js';
import type { NoticeText } from '../../shared/notice-messages/types.js';

/*
 * The "Дрон" panel: the connection to a real Pioneer and what it reports - identity, attitude, power, sensors,
 * memory - plus the explicit start/stop of the program that the editor's "На дрон" button wrote. Everything shown
 * here is rendered from droneLink's snapshot; nothing is kept in the panel itself.
 */

const MAX_RPM = 12000;
/** Pixels of the artificial horizon per degree of pitch. */
const HORIZON_PX_PER_DEGREE = 1.4;

const CHIP_STATES: Record<LinkSnapshot['status'], { label: string; tone: string }> = {
    disconnected: { label: 'Не подключён', tone: 'pk-chip--plain' },
    connecting: { label: 'Подключаюсь…', tone: 'pk-chip--warning' },
    connected: { label: 'Подключён', tone: 'pk-chip--success' },
    lost: { label: 'Нет связи', tone: 'pk-chip--danger' }
};

const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

function setText(id: string, text: string): void {
    const element = byId(id);
    if (element && element.textContent !== text) element.textContent = text;
}

function fixed(value: number | undefined, digits: number): string {
    return value === undefined ? '—' : value.toFixed(digits);
}

function kibibytes(bytes: number | undefined): string {
    return bytes === undefined ? '—' : `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} КБ`;
}

function clock(seconds: number | undefined): string {
    if (seconds === undefined) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setMeter(barId: string, fraction: number): void {
    const bar = byId(barId);
    if (!bar) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    bar.style.width = `${(clamped * 100).toFixed(1)}%`;
    bar.parentElement?.setAttribute('aria-valuenow', String(Math.round(clamped * Number(bar.parentElement.getAttribute('aria-valuemax') ?? 100))));
}

function setChip(element: HTMLElement | null, label: string, tone: string): void {
    if (!element) return;
    element.textContent = label;
    element.classList.remove('pk-chip--plain', 'pk-chip--success', 'pk-chip--warning', 'pk-chip--danger', 'pk-chip--accent');
    element.classList.add(tone);
}

function render(snapshot: LinkSnapshot): void {
    const { status, info, telemetry: t, error } = snapshot;
    const connected = status === 'connected';

    setChip(byId('drone-link-chip'), CHIP_STATES[status].label, CHIP_STATES[status].tone);
    const tab = byId('sidebar-drone-link-btn');
    if (tab) tab.dataset.link = status;

    // Connection block
    const connectBtn = byId<HTMLButtonElement>('drone-link-connect-btn');
    const disconnectBtn = byId<HTMLButtonElement>('drone-link-disconnect-btn');
    if (connectBtn) {
        connectBtn.hidden = connected;
        connectBtn.disabled = status === 'connecting' || !isWebSerialSupported();
        connectBtn.textContent = status === 'connecting' ? 'Подключаюсь…' : status === 'lost' ? 'Подключить снова' : 'Подключить дрон';
    }
    if (disconnectBtn) disconnectBtn.hidden = !connected;
    const identity = byId('drone-link-identity');
    if (identity) identity.hidden = !connected || !info;
    const hint = byId('drone-link-hint');
    if (hint) {
        hint.hidden = connected;
        hint.textContent = isWebSerialSupported()
            ? 'Подключите Пионер к компьютеру по USB. Pioneer Station должна быть закрыта: порт может держать только одна программа.'
            : 'Связь с дроном по USB работает в Chrome и Edge. Откройте симулятор в одном из них.';
    }
    const errorBox = byId('drone-link-error');
    if (errorBox) {
        errorBox.hidden = !error;
        if (!error) {
            errorBox.textContent = '';
        } else {
            const explained = explainDroneError({ message: error }, 'connect');
            errorBox.textContent = `${explained.title}. ${explained.message.replace(/`/g, '')}`;
        }
    }
    if (info) {
        setText('drone-link-board', `№${info.boardNumber}`);
        setText('drone-link-firmware', `сборка ${info.firmwareBuild}`);
        setText('drone-link-protocol', info.protocol);
    }

    const live = byId('drone-link-live');
    if (live) live.hidden = !connected;
    if (!connected) return;

    // Attitude
    const roll = t.roll ?? 0;
    const pitch = t.pitch ?? 0;
    byId('drone-link-horizon-world')?.setAttribute('transform', `rotate(${(-roll).toFixed(1)}) translate(0 ${(pitch * HORIZON_PX_PER_DEGREE).toFixed(1)})`);
    setText('dl-roll', fixed(t.roll, 1));
    setText('dl-pitch', fixed(t.pitch, 1));
    setText('dl-yaw', fixed(t.yaw === undefined ? undefined : ((t.yaw % 360) + 360) % 360, 1));
    setText('dl-altitude', fixed(t.altitude, 2));
    setText('drone-link-attitude-text', `Крен ${fixed(t.roll, 1)}°, тангаж ${fixed(t.pitch, 1)}°`);

    // Power and motors
    setText('dl-voltage', fixed(t.voltage, 2));
    setText('dl-current', fixed(t.current, 2));
    for (let motor = 0; motor < 4; motor += 1) {
        const rpm = t[`rpm${motor}`];
        setText(`dl-rpm${motor}`, rpm === undefined ? '—' : String(Math.round(rpm)));
        setMeter(`dl-rpm${motor}-bar`, (rpm ?? 0) / MAX_RPM);
    }

    // Sensors
    setText('dl-range', t.range === undefined ? '—' : String(Math.round(t.range)));
    setText('dl-pressure', t.pressure === undefined ? '—' : (t.pressure / 1000).toFixed(2));
    setText('dl-accelz', fixed(t.accelZ, 2));

    // Memory and system
    const used = t.allocatedMemory;
    const free = t.freeMemory;
    if (used !== undefined && free !== undefined) {
        setText('dl-memory-text', `${kibibytes(used)} из ${kibibytes(used + free)}`);
        setMeter('dl-memory-bar', used / (used + free));
    }
    setText('dl-lua-memory', kibibytes(t.luaMemory));
    setText('dl-flash', kibibytes(t.flashSize));
    setText('dl-cpu', t.cpuFrequency === undefined ? '—' : `${Math.round(t.cpuFrequency / 1e6)} МГц`);
    setText('dl-uptime', clock(t.uptime));
    setText('dl-boots', t.bootCount === undefined ? '—' : String(t.bootCount));

    // The program
    const running = t.luaRun === 1;
    const scriptChip = byId('drone-link-script-chip');
    setChip(scriptChip, running ? 'Работает' : 'Остановлена', running ? 'pk-chip--success' : 'pk-chip--plain');
    const startBtn = byId<HTMLButtonElement>('drone-link-start-btn');
    const stopBtn = byId<HTMLButtonElement>('drone-link-stop-btn');
    const noLua = info ? !info.hasLua : false;
    if (startBtn) {
        startBtn.hidden = running;
        startBtn.disabled = snapshot.uploading || noLua;
    }
    if (stopBtn) {
        stopBtn.hidden = !running;
        stopBtn.disabled = snapshot.uploading;
    }
    const scriptHint = byId('drone-link-script-hint');
    if (scriptHint) {
        const uploaded = snapshot.lastUpload;
        scriptHint.textContent = snapshot.uploading
            ? 'Идёт загрузка программы…'
            : noLua
                ? 'На этом дроне нет Lua-компонента.'
                : uploaded
                    ? `Из редактора загружено в ${new Date(uploaded.at).toLocaleTimeString('ru-RU', { hour12: false })}: ${uploaded.bytes} байт. Запуск — только по кнопке.`
                    : 'Кнопка «На дрон» в редакторе только записывает программу. Запуск — здесь, когда вы готовы.';
    }
}

export function initDroneLinkPanel(): void {
    const connectBtn = byId<HTMLButtonElement>('drone-link-connect-btn');
    if (!connectBtn) return;
    const confirmBox = byId('drone-link-confirm');
    const startRow = byId('drone-link-start-row');
    const errorBox = byId('drone-link-error');

    const showConfirm = (open: boolean) => {
        if (confirmBox) confirmBox.hidden = !open;
        if (startRow) startRow.hidden = open;
        if (open) byId('drone-link-confirm-no')?.focus();
    };

    const notify = (notice: NoticeText) => {
        (window as unknown as { showSimulationNotice?: (payload: NoticeText) => void }).showSimulationNotice?.(notice);
    };

    const reportFailure = (mode: 'connect' | 'start' | 'stop', error: unknown) => {
        const like = error instanceof Error
            ? { name: error.name, message: error.message, code: (error as { code?: string }).code }
            : { message: String(error) };
        const failure = explainDroneError(like, mode);
        if (errorBox) {
            errorBox.hidden = false;
            errorBox.textContent = `${failure.title}. ${failure.message.replace(/`/g, '')}`;
        }
        notify(failure);
        log(`[DRONE] ${failure.title}: ${failure.message.replace(/`/g, '')}`, 'error');
    };

    droneLink.subscribe(render);

    connectBtn.addEventListener('click', () => {
        droneLink.connect().catch((error) => {
            // A closed picker is not an error worth shouting about.
            if (error instanceof DOMException && error.name === 'NotFoundError') return;
            reportFailure('connect', error);
        });
    });
    byId('drone-link-disconnect-btn')?.addEventListener('click', () => void droneLink.disconnect());

    byId('drone-link-start-btn')?.addEventListener('click', () => showConfirm(true));
    byId('drone-link-confirm-no')?.addEventListener('click', () => {
        showConfirm(false);
        byId('drone-link-start-btn')?.focus();
    });
    byId('drone-link-confirm-yes')?.addEventListener('click', async () => {
        showConfirm(false);
        try {
            await droneLink.setScriptRunning(true);
            log('[DRONE] Программа на дроне запущена.', 'info');
            notify(droneScriptStartedNotice());
        } catch (error) {
            reportFailure('start', error);
        }
    });
    byId('drone-link-stop-btn')?.addEventListener('click', async () => {
        try {
            await droneLink.setScriptRunning(false);
            log('[DRONE] Программа на дроне остановлена.', 'info');
            notify(droneScriptStoppedNotice());
        } catch (error) {
            reportFailure('stop', error);
        }
    });

    // A lost link must not leave the confirmation open for a drone that is no longer there.
    droneLink.subscribe((snapshot) => {
        if (snapshot.status !== 'connected') showConfirm(false);
    });
}
