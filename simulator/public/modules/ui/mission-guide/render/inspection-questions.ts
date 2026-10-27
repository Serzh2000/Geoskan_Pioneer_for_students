/** The two answers of an inspection lesson: which part gives the lift and which one sees. Read back by the check. */
export function renderInspectionQuestions(): string {
    return `<div class="guide-inspection-questions"><h2>Ваши ответы</h2>
        <label class="pk-field"><span class="pk-field__label">Какая часть создаёт тягу?</span>
            <select aria-label="Какая часть создаёт тягу?" data-academy-part="lift"><option value="">Выберите часть</option><option value="camera">Камера</option><option value="rotors">Винты</option><option value="leds">Светодиоды</option></select></label>
        <label class="pk-field"><span class="pk-field__label">Какая часть получает изображение?</span>
            <select aria-label="Какая часть получает изображение?" data-academy-part="vision"><option value="">Выберите часть</option><option value="rotors">Винты</option><option value="leds">Светодиоды</option><option value="camera">Камера</option></select></label></div>`;
}
