const FRAME = 'M3.6 4.4c5.4-.4 11.2-.4 16.6 0 .4 5.4.4 10.8 0 16.2-5.4.4-11.2.4-16.6 0-.3-5.4-.3-10.8 0-16.2z';
const TICK = 'M5.4 12.6c2.2 1.7 3.8 3.4 5 5.6C13.2 12.2 16.8 7.4 21.4 3.4';

type Option = [value: string, label: string];

/** One question as a list of boxes: the student ticks the one they hold true, and the tick is drawn with a pencil. */
function question(part: 'lift' | 'vision', title: string, options: Option[]): string {
    const rows = options.map(([value, label]) => `<label class="ck-option"><input class="ck-input" type="radio" name="academy-${part}" value="${value}" data-academy-part="${part}">
            <span class="ck-box" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path class="ck-frame" d="${FRAME}"/><path class="ck-tick" pathLength="1" d="${TICK}"/></svg></span><span class="ck-text">${label}</span></label>`).join('');
    return `<fieldset class="ck-question"><legend class="pk-field__label">${title}</legend>${rows}</fieldset>`;
}

/** The two answers of an inspection lesson: which part gives the lift and which one sees. Read back by the check. */
export function renderInspectionQuestions(): string {
    return `<div class="guide-inspection-questions"><h2>Ваши ответы</h2>
        ${question('lift', 'Какая часть создаёт тягу?', [['camera', 'Камера'], ['rotors', 'Винты'], ['leds', 'Светодиоды']])}
        ${question('vision', 'Какая часть получает изображение?', [['rotors', 'Винты'], ['leds', 'Светодиоды'], ['camera', 'Камера']])}</div>`;
}
