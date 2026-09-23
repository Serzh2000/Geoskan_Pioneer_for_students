/** Local teaching examples never change the student's code or course progress. */
export function attachLearningInteractions(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-guide-rgb]').forEach((button) => {
        button.addEventListener('click', () => {
            const lab = button.closest<HTMLElement>('[data-guide-color-max]');
            if (!lab) return;
            const channels = button.dataset.guideRgb!.split(',').map(Number);
            const maximum = Number(lab.dataset.guideColorMax);
            lab.querySelectorAll('[data-guide-rgb]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            const dot = lab.querySelector<HTMLElement>('[data-guide-color-dot]');
            if (dot) dot.style.background = `rgb(${channels.map((value) => value * 255).join(',')})`;
            const output = lab.querySelector('output');
            if (output) output.textContent = `${button.textContent}: R = ${channels[0] * maximum}, G = ${channels[1] * maximum}, B = ${channels[2] * maximum}`;
        });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-guide-quiz-answer]').forEach((button) => {
        button.addEventListener('click', () => {
            const quiz = button.closest<HTMLElement>('[data-guide-quiz]');
            const feedback = quiz?.querySelector<HTMLElement>('[data-guide-quiz-feedback]');
            if (!quiz || !feedback) return;
            const correct = button.dataset.guideQuizAnswer === 'correct';
            quiz.querySelectorAll('[data-guide-quiz-answer]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            feedback.hidden = false;
            feedback.dataset.result = correct ? 'correct' : 'retry';
            feedback.textContent = `${correct ? 'Верно.' : 'Пока не совсем. Попробуйте ещё раз.'} ${quiz.dataset.guideExplanation}`;
        });
    });
}
