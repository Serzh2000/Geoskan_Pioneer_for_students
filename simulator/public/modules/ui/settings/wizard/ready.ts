import { simSettings, type AuxChannelRange } from '../../../core/state.js';
import { formatRefLabel } from './summary.js';

/*
 * The last screen of the setup: what ended up where, and the few things to do to take off. Written from the saved
 * settings, so it is also what the simulator will really do.
 */

const range = (r: AuxChannelRange) => `${r.min}–${r.max}`;

export function buildReadyHtml(): string {
    const m = simSettings.gamepadMapping;
    const sticks: Array<[string, string]> = [
        ['Газ', m.throttle], ['Рыскание', m.yaw], ['Тангаж', m.pitch], ['Крен', m.roll]
    ];
    const modes = simSettings.gamepadModeRanges;
    const rows = [
        ...sticks.map(([name, ref]) => `<li><b>${name}</b><span>${formatRefLabel(ref as never)}</span></li>`),
        `<li><b>Взвод</b><span>${formatRefLabel(m.armSwitch)}, взведён при ${range(simSettings.gamepadAuxRanges.arm)}</span></li>`,
        `<li><b>Режим</b><span>${formatRefLabel(m.modeSwitch)}: стабилизация ${range(modes.stabilize)}, высота ${range(modes.althold)}, позиция ${range(modes.loiter)}</span></li>`,
        `<li><b>Магнит</b><span>${formatRefLabel(m.magnetBtn)}, включён при ${range(simSettings.gamepadAuxRanges.magnet)}</span></li>`
    ];
    return `
        <ul class="gp-ready-list">${rows.join('')}</ul>
        <p class="gp-ready-title">Как взлететь</p>
        <ol class="gp-ready-steps">
            <li>Закройте мастер и убедитесь, что симулятор запущен. Газ опустите вниз до упора.</li>
            <li>Поставьте тумблер режима на «Стабилизацию» и включите взвод: моторы начнут вращаться.</li>
            <li>Плавно поднимите газ: дрон оторвётся от земли. Стики наклоняют его так же, как на настоящем пульте.</li>
            <li>Что-то идёт не туда? Откройте «Пульт» ещё раз: любой шаг можно повторить отдельно.</li>
        </ol>`;
}
