import type { GuideDiagnostic } from '../../types.js';
import type { DroneSnapshot } from './snapshot.js';

export type DroneSample = { elapsedMs: number; snapshot: DroneSnapshot };
function color(sample: DroneSample, index: number): string {
    const led = sample.snapshot.leds[index];
    if (!led) return 'off';
    if (led.r > 230 && led.g < 24 && led.b < 24) return 'red';
    if (led.g > 230 && led.r < 24 && led.b < 24) return 'green';
    if (led.b > 230 && led.r < 24 && led.g < 24) return 'blue';
    return led.r < 24 && led.g < 24 && led.b < 24 ? 'off' : 'other';
}
const error = (title: string, reason: string, fix: string): GuideDiagnostic => ({ kind: 'error', title, reason, fix });

/** Additional behavioural gates; a final colour or a drone already on the ground cannot pass these. */
export function gradeWalkthroughTrace(topic: string, samples: DroneSample[], language: 'lua' | 'python'): GuideDiagnostic[] {
    const diagnostics: GuideDiagnostic[] = [];
    if (samples.some(sample => ['CRASHED', 'DISARMED_FALL', 'ОШИБКА'].includes(sample.snapshot.status || ''))) {
        diagnostics.push(error('Запуск завершился ошибкой или аварией', 'Полезное действие до ошибки ещё не означает выполненный урок.', 'Исправьте первую ошибку программы или траекторию и запустите проверку снова.'));
    }
    if (topic === 'led-sequence') {
        const changes = samples.filter((sample, i) => i === 0 || color(sample, 0) !== color(samples[i - 1], 0));
        const visible = changes.filter(sample => color(sample, 0) !== 'off');
        if (visible.map(sample => color(sample, 0)).join(',') !== 'blue,green,red') {
            diagnostics.push(error('Последовательность цветов не подтверждена', 'Нужно увидеть синий, затем зелёный, затем красный. Один финальный красный цвет не подтверждает весь сигнал.', 'Верните три команды и видимые паузы между ними.'));
        } else if (visible.slice(1).some((sample, i) => sample.elapsedMs - visible[i].elapsedMs < 250)) {
            diagnostics.push(error('Цвета меняются слишком быстро', 'Между наблюдаемыми изменениями должно оставаться время для различения сигнала.', 'Задайте паузы по условию урока.'));
        }
    }
    if (topic === 'led-confirm' || topic === 'led-delayed') {
        const index = topic === 'led-delayed' && language === 'lua' ? 1 : 0;
        const target = topic === 'led-confirm' ? 'green' : 'blue';
        const light = samples.find(sample => color(sample, index) === target);
        const message = samples.find(sample => Boolean(sample.snapshot.printText?.trim()));
        if (!light) diagnostics.push(error('Нужный световой сигнал не появился', `Проверьте цвет и номер светодиода: ${index}.`, 'Задайте цвет по условию урока.'));
        if (!message) diagnostics.push(error('Нет текстового подтверждения', 'Во время запуска не наблюдалось сообщения программы.', 'Добавьте print после светового действия.'));
        if (message && light && message.elapsedMs < light.elapsedMs) diagnostics.push(error('Подтверждение появилось раньше сигнала', 'Сообщение не должно объявлять о действии до смены цвета.', 'Поместите сообщение после LED-команды в том же отложенном действии.'));
        if (topic === 'led-delayed' && light && light.elapsedMs < 600) diagnostics.push(error('Сигнал включился без нужного ожидания', 'Синий сигнал появился раньше предусмотренной секундной задержки.', 'Добавьте задержку до смены цвета.'));
    }
    if (topic === 'landing' || topic === 'mission') {
        const final = samples[samples.length - 1]?.snapshot;
        const transitions = final?.fsmTransitions || [];
        const takeoff = transitions.findIndex(item => item.to === 'TAKEOFF_PROCESS');
        const arrival = transitions.findIndex((item, i) => i > takeoff && item.from === 'FLYING_MOVING' && item.to === 'FLYING_HOVER');
        const landing = transitions.findIndex((item, i) => i > arrival && item.to === 'LANDING_PROCESS');
        if (takeoff < 0 || arrival < 0 || landing < 0 || !final || final.pos.z > .3 || final.fsmState !== 'IDLE') {
            diagnostics.push(error('Полный цикл посадки ещё не подтверждён', 'Нужны взлёт, прибытие, посадка после прибытия и остановка на земле. Исходное положение на земле не считается посадкой.', 'Проверьте порядок этапов и дождитесь завершения снижения.'));
        }
    }
    return diagnostics;
}
