/*
 * All fixed student-facing notice texts live here (battery, mission order,
 * pre-launch checks, real-drone upload, scene files). Builders are pure
 * functions that return NoticeText, so every wording is covered by
 * tests/notice-messages.test.ts and can be changed in one place.
 * Rules: title up to ~6 words; the message says what happened, why and the one
 * next step; never blame the student; backticks mark inline code.
 */
import { explainLuaSyntaxError } from './lua-errors.js';
import { code, type NoticeAction, type NoticeText } from './types.js';

/**
 * The textbook lessons that explain the matters a notice is about (academy lesson numbers, mission-guide/academy/catalog.ts):
 * 3 "Команда автопилоту" (a command before the one that depends on it), 29 "Отложенный сигнал" (Timer.callLater),
 * 32 "Получаем уведомление" (callback and events), 46 "Подтверждаем точку" (the next point after POINT_REACHED).
 */
export const GUIDE_LESSON = { command: 3, timer: 29, events: 32, confirmPoint: 46 } as const;

/** A button that opens the textbook at the lesson about this matter. */
export function openLessonAction(lesson: number): NoticeAction {
    return { kind: 'open-guide', label: 'Открыть урок', lesson };
}

/* ---------- Battery ---------- */

export function batteryLowNotice(percent: number, voltage: string): NoticeText {
    return {
        level: 'warn',
        title: 'Батарея садится',
        message: `Осталось ${percent}% (${voltage} В). Завершите задание и планируйте посадку.`
    };
}

export function batteryCriticalNotice(percent: number, voltage: string): NoticeText {
    return {
        level: 'error',
        title: 'Батарея почти пуста',
        message: `Осталось ${percent}% (${voltage} В). Посадите дрон сейчас, иначе он упадёт.`
    };
}

export function batteryDepletedNotice(): NoticeText {
    return {
        level: 'error',
        title: 'Батарея разряжена',
        message: 'Заряд закончился. Сбросьте симуляцию и начните новый вылет с полной батареей.'
    };
}

/* ---------- Mission order ---------- */

export function earlyRouteNotice(): NoticeText {
    return {
        level: 'warn',
        title: 'Маршрут слишком рано',
        message: `Команда ${code('goToLocalPoint(...)')} отправлена, пока дрон ещё взлетает. Отправляйте её по событию ${code('Ev.TAKEOFF_COMPLETE')}.`,
        actions: [openLessonAction(GUIDE_LESSON.confirmPoint)]
    };
}

export function missingCallbackNotice(apiName?: string): NoticeText {
    const skipped = apiName ? `Вызов ${code(apiName)} пропущен.` : 'Следующая команда пропущена.';
    return {
        level: 'warn',
        title: 'Нет функции callback',
        message: `Без ${code('function callback(event) ... end')} дрон выполнит только первую команду. ${skipped} Добавьте функцию, чтобы продолжать полёт по событиям.`,
        actions: [openLessonAction(GUIDE_LESSON.events)]
    };
}

export function simultaneousCommandsNotice(commands: string[]): NoticeText {
    const unique = Array.from(new Set(commands));
    const message = unique.length > 1
        ? `Дрон получил сразу несколько команд: ${unique.join(', ')}. Разнесите их по этапам через ${code('Timer.callLater(...)')} или ${code('callback(event)')}.`
        : commands.length > 1
            ? `Команда ${unique[0]} вызвана ${commands.length} раза за один шаг. Оставьте один вызов или разнесите их по времени.`
            : `Команда ${unique[0] || 'миссии'} запущена одновременно с другой. Подождите завершения этапа и запускайте следующую.`;
    return {
        level: 'warn',
        title: 'Команды наступают друг на друга',
        message,
        actions: [openLessonAction(GUIDE_LESSON.timer)]
    };
}

export function gamepadOverrideNotice(): NoticeText {
    return {
        level: 'info',
        title: 'Миссия главнее пульта',
        message: 'Пока идёт миссия, пульт не управляет дроном. Остановите программу, если хотите лететь вручную.'
    };
}

/* ---------- Pre-launch checks ---------- */

export function scenarioBlockedNotice(issues: string[]): NoticeText {
    const first = issues[0] || '';
    return {
        level: 'error',
        title: 'Запуск остановлен',
        message: issues.length === 1
            ? `${first}`
            : `Нужно поправить ${issues.length} места, иначе программа зависнет. Первое: ${first}`
    };
}

/** The first problem of a pre-launch check decides which lesson helps; problems without a lesson get no button. */
function guideActionsForIssue(issue: string): NoticeAction[] | undefined {
    if (/PREFLIGHT|подготов|arm\(\)/i.test(issue)) return [openLessonAction(GUIDE_LESSON.command)];
    if (/callback|POINT_REACHED|TAKEOFF_COMPLETE/i.test(issue)) return [openLessonAction(GUIDE_LESSON.events)];
    return undefined;
}

export function scenarioWarningNotice(issues: string[]): NoticeText {
    const first = issues[0] || '';
    return {
        level: 'warn',
        title: 'Проверьте программу',
        message: issues.length === 1
            ? first
            : `Есть ${issues.length} замечаний, дрон может полететь не так. Первое: ${first}`,
        actions: guideActionsForIssue(first)
    };
}

/* ---------- Script failures ---------- */

export function genericFailureTitle(kind: 'syntax' | 'runtime'): string {
    return kind === 'syntax' ? 'В коде опечатка' : 'Программа остановилась';
}

export function genericFailureMessage(kind: 'syntax' | 'runtime', original: string): string {
    const lastLine = String(original || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).pop() || '';
    const prefix = kind === 'syntax'
        ? 'Программа не запустилась: в коде ошибка, которую мы пока не умеем объяснять.'
        : 'Программа остановилась с ошибкой, которую мы пока не умеем объяснять.';
    return lastLine
        ? `${prefix} Исходное сообщение: «${lastLine.slice(0, 160)}». Проверьте строку и соседние.`
        : `${prefix} Проверьте последние изменения в коде.`;
}

/* ---------- Real drone (USB) ---------- */

type DroneErrorLike = { name?: string; message?: string; code?: string };

/** Explains a failure of the USB link/upload; `error` may be any thrown value. */
export function explainDroneError(error: DroneErrorLike, mode: 'upload' | 'connect' | 'start' | 'stop' = 'upload'): NoticeText {
    const raw = String(error?.message || '').trim();
    const fallbackTitle = {
        upload: 'Программа не загружена',
        connect: 'Дрон не подключился',
        start: 'Программа не запущена',
        stop: 'Программа не остановлена'
    }[mode];

    if (error?.name === 'LuaCompileError') {
        const explained = explainLuaSyntaxError(raw);
        const line = explained?.line;
        return {
            level: 'error',
            title: 'Программа не загружена',
            message: explained
                ? `${explained.title}. ${explained.message}`
                : `В коде ошибка, поэтому дрон программу не принял. Исправьте её и повторите. Сообщение: ${raw.slice(0, 140)}`,
            actions: typeof line === 'number' ? [{ kind: 'show-line', label: 'Показать строку', line }] : undefined
        };
    }
    if (error?.name === 'PortNotChosenError' || /Порт не выбран/.test(raw)) {
        return {
            level: 'info',
            title: 'Порт не выбран',
            message: 'В окне выбора должен быть дрон (USB) или USB-UART адаптер (CP210x, CH340, FTDI). Выберите его и нажмите «Подключить». Если списка нет, проверьте кабель и драйвер и закройте Pioneer Station.'
        };
    }
    if (error?.name === 'NotFoundError') {
        return { level: 'info', title: 'Дрон не выбран', message: 'Подключите дрон кабелем USB и выберите его в окне браузера. Затем повторите.' };
    }
    if (error?.name === 'SerialUnavailableError' || /не умеет работать с USB|Chrome или Edge/.test(raw)) {
        return { level: 'error', title: 'Нужен Chrome или Edge', message: 'Запись на дрон по USB работает только в Chrome и Edge. Откройте симулятор в одном из них.' };
    }
    if (/Не удалось открыть порт/.test(raw)) {
        return { level: 'error', title: 'Порт дрона занят', message: 'Другая программа держит USB-порт дрона. Закройте Pioneer Station и другие вкладки с симулятором, затем повторите.' };
    }
    if (error?.code === 'timeout' || /не отвечает/.test(raw)) {
        return { level: 'error', title: 'Дрон не отвечает', message: 'Дрон молчит. Проверьте кабель, закройте Pioneer Station и переподключите USB.' };
    }
    if (error?.code === 'refused' || /отклонил запись/.test(raw)) {
        return { level: 'error', title: 'Дрон не принял запись', message: 'Дрон отказался записывать файл. Подождите пару секунд, остановите программу на дроне и повторите.' };
    }
    if (/контрольная сумма/.test(raw)) {
        return { level: 'error', title: 'Файл записался с ошибкой', message: 'Дрон принял программу, но она не совпала с вашей. Повторите загрузку.' };
    }
    if (error?.code === 'closed' || /не подключ[её]н/.test(raw)) {
        return { level: 'error', title: 'Дрон не подключён', message: 'Связи с дроном нет. Подключите его в панели «Дрон» и повторите.' };
    }
    if (/нет Lua-компонента/.test(raw)) {
        return { level: 'error', title: 'На дроне нет Lua', message: 'В этом дроне нет компонента для Lua-программ. Проверьте прошивку в Pioneer Station.' };
    }
    return {
        level: 'error',
        title: fallbackTitle,
        message: raw ? `Дрон ответил ошибкой: «${raw.slice(0, 160)}». Проверьте USB-кабель и повторите.` : 'Дрон не ответил как ожидалось. Проверьте USB-кабель и повторите.'
    };
}

export function droneUploadedNotice(bytes: number, where: string): NoticeText {
    return {
        level: 'success',
        title: 'Программа на дроне',
        message: `Записано ${bytes} байт на ${where}. Чтобы запустить её, откройте панель «Дрон».`
    };
}

export function droneScriptStartedNotice(): NoticeText {
    return { level: 'success', title: 'Программа запущена', message: 'Дрон выполняет вашу программу. Остановить её можно в панели «Дрон».' };
}

export function droneScriptStoppedNotice(): NoticeText {
    return { level: 'info', title: 'Программа остановлена', message: 'Дрон больше не выполняет вашу программу.' };
}

/* ---------- Scene file ---------- */

export function sceneEmptyNotice(): NoticeText {
    return { level: 'info', title: 'Сцена пустая', message: 'Сохранять пока нечего. Добавьте на сцену хотя бы один объект.' };
}

export function sceneSavedNotice(count: number): NoticeText {
    return { level: 'success', title: 'Сцена сохранена', message: `В файл записано объектов: ${count}.` };
}

export function sceneLoadedNotice(added: number, failed: number): NoticeText {
    return {
        level: failed ? 'warn' : 'success',
        title: failed ? 'Сцена загружена не вся' : 'Сцена загружена',
        message: failed
            ? `Добавлено объектов: ${added}, пропущено: ${failed}. Пропущенные объекты в файле повреждены или неизвестны симулятору.`
            : `Добавлено объектов: ${added}.`
    };
}

export function sceneLoadFailedNotice(reason?: string): NoticeText {
    return {
        level: 'error',
        title: 'Файл сцены не открылся',
        message: reason
            ? `Это не похоже на файл сцены из симулятора (${reason.slice(0, 120)}). Выберите файл, который вы сохраняли кнопкой «Скачать сцену».`
            : 'Это не похоже на файл сцены из симулятора. Выберите файл, который вы сохраняли кнопкой «Скачать сцену».'
    };
}

/* ---------- External Python bridge ---------- */

export function bridgeCommandRejectedNotice(method: string, reason: string): NoticeText {
    return {
        level: 'warn',
        title: 'Команда из Python отклонена',
        message: `Симулятор не выполнил команду ${code(method)} из вашей Python-программы. Причина: ${reason.slice(0, 160)}. Проверьте порядок команд в программе.`
    };
}
