/* Пустое состояние консоли ROS 2: справка, готовые команды с кнопками «Копировать» и «Выполнить». */

/** Строка команды или ожидание состояния дрона между командами очереди. */
export type QueueItem = string | { wait: 'hover' | 'ground' };

const TRY_SNIPPETS: Array<{ label: string; text: string }> = [
    { label: 'Сервисы дрона', text: 'ros2 service list' },
    { label: 'Поля запроса полёта в точку', text: 'ros2 interface show gs_interfaces/srv/GoToLocalPoint' },
    { label: 'Заряд батареи', text: 'ros2 topic echo /geoscan/sensors/battery_state --once' }
];

export const FLIGHT_CYCLE = [
    'ros2 service call /geoscan/flight/arm gs_interfaces/srv/Arm "{timeout: 5, retries: 0}"',
    'ros2 service call /geoscan/flight/takeoff std_srvs/srv/Trigger "{}"',
    "ros2 service call /geoscan/flight/go_to_local_point gs_interfaces/srv/GoToLocalPoint \"{x: 0.0, y: 0.0, z: 1.0, yaw: 0.0, time: 5, frame_id: 'map'}\"",
    'ros2 service call /geoscan/flight/land std_srvs/srv/Trigger "{}"',
    'ros2 service call /geoscan/flight/disarm std_srvs/srv/Trigger "{}"'
];
export const FLIGHT_CYCLE_TEXT = FLIGHT_CYCLE.join('\n');
/** Те же команды, но между ними кнопка ждёт, пока дрон взлетит, долетит и сядет: команды полёта принимаются только в своём состоянии. */
export const FLIGHT_CYCLE_QUEUE: QueueItem[] = [
    FLIGHT_CYCLE[0], FLIGHT_CYCLE[1], { wait: 'hover' }, FLIGHT_CYCLE[2], { wait: 'hover' }, FLIGHT_CYCLE[3], { wait: 'ground' }, FLIGHT_CYCLE[4]
];

export interface IntroHooks {
    /** Сообщение для скрытой области role="status". */
    say(text: string): void;
    enqueue(items: QueueItem[]): void;
    focus(): void;
}

async function copyText (text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            document.body.append(area);
            area.select();
            const ok = document.execCommand('copy');
            area.remove();
            return ok;
        } catch {
            return false;
        }
    }
}

export function buildIntro(intro: HTMLElement, hooks: IntroHooks): void {
    const title = document.createElement('h3');
    title.className = 'ros2-intro__title';
    title.textContent = 'Консоль ROS 2';
    const lead = document.createElement('p');
    lead.className = 'ros2-intro__text';
    lead.textContent = 'Команды ros2 как на настоящем Пионере. Узел ros_pioneer_node (gs_core) уже запущен, как после ros2 launch; программа не нужна.';
    const keys = document.createElement('p');
    keys.className = 'ros2-intro__text ros2-intro__keys';
    keys.textContent = 'Enter - выполнить · Ctrl+C - остановить · Tab - дополнить · ↑ ↓ - история · help';

    const makeActions = (text: string, label: string, items: QueueItem[] = text.split('\n')) => {
        const actions = document.createElement('span');
        actions.className = 'ros2-try__actions';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'ros2-try__btn';
        copy.textContent = 'Копировать';
        copy.setAttribute('aria-label', `Копировать: ${label}`);
        copy.addEventListener('click', () => {
            void copyText(text).then((ok) => {
                copy.textContent = ok ? 'Скопировано' : 'Не удалось';
                hooks.say(ok ? 'Команда скопирована' : 'Копирование не удалось: выделите текст и нажмите Ctrl+C');
                window.setTimeout(() => { copy.textContent = 'Копировать'; }, 1600);
            });
        });
        const runBtn = document.createElement('button');
        runBtn.type = 'button';
        runBtn.className = 'ros2-try__btn ros2-try__btn--primary';
        runBtn.textContent = 'Выполнить';
        runBtn.setAttribute('aria-label', `Выполнить: ${label}`);
        runBtn.addEventListener('click', () => { hooks.enqueue(items); hooks.focus(); });
        actions.append(copy, runBtn);
        return actions;
    };

    const heading = document.createElement('h4');
    heading.className = 'ros2-intro__subtitle';
    heading.textContent = 'Попробуйте';
    const list = document.createElement('ul');
    list.className = 'ros2-try';
    for (const snippet of TRY_SNIPPETS) {
        const item = document.createElement('li');
        item.className = 'ros2-try__item';
        const code = document.createElement('code');
        code.className = 'ros2-try__code';
        code.textContent = snippet.text;
        code.title = snippet.label;
        item.append(code, makeActions(snippet.text, snippet.label));
        list.append(item);
    }
    const details = document.createElement('details');
    details.className = 'ros2-try__cycle';
    const summary = document.createElement('summary');
    summary.textContent = 'Полётный цикл из документации: arm, взлёт, точка, посадка, disarm';
    const pre = document.createElement('pre');
    pre.className = 'ros2-try__code ros2-try__code--block';
    pre.textContent = FLIGHT_CYCLE_TEXT;
    const note = document.createElement('p');
    note.className = 'ros2-intro__text';
    note.textContent = 'Симуляция должна идти (не пауза). Кнопка «Выполнить» сама ждёт взлёта и посадки между командами; если вставить все строки сразу, go_to_local_point придёт до взлёта и будет отклонён, поэтому вводите по одной.';
    details.append(summary, pre, makeActions(FLIGHT_CYCLE_TEXT, 'полётный цикл', FLIGHT_CYCLE_QUEUE), note);
    intro.replaceChildren(title, lead, keys, heading, list, details);
}
