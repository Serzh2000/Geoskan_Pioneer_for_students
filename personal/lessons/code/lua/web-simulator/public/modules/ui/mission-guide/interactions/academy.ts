import { addObjectToScene } from '../../../environment/index.js';
import { TRAINING_PROFILES, TRAINING_PROFILE_LABELS, type TrainingProfile } from '../../../environment/training/layout.js';
import { resetWalkthroughResult, walkthroughKey } from '../walkthrough/state.js';
import { isLessonCompleted, setActiveLessonId, setActivePracticeTrack } from '../state.js';
import type { RenderMissionGuidePanel } from '../types.js';
import { ACADEMY_READY_NUMBERS } from '../academy/practices/index.js';
import { prepareAcademyScene, restoreAcademyScene } from '../academy/scene.js';
import { resetSimulationState } from '../../../app/simulation-controls.js';

export function attachAcademyBindings(container: HTMLElement, language: 'lua' | 'python', lessonId: string, rerender?: RenderMissionGuidePanel): void {
    container.querySelector<HTMLButtonElement>('[data-academy-prepare]')?.addEventListener('click', event => {
        const number = Number((event.currentTarget as HTMLButtonElement).dataset.academyPrepare);
        const field = container.querySelector<HTMLInputElement>('[data-academy-lesson-seed]');
        const seed = field?.valueAsNumber;
        const status = container.querySelector<HTMLElement>('[data-academy-prepare-status]');
        if (!Number.isInteger(seed) || seed! < 0 || seed! > 4294967295) { if (status) status.textContent = 'Нужен целый seed от 0 до 4294967295.'; field?.setAttribute('aria-invalid', 'true'); field?.focus(); return; }
        field?.removeAttribute('aria-invalid');
        resetSimulationState();
        const ready = prepareAcademyScene(number, seed!);
        resetWalkthroughResult(walkthroughKey(language, lessonId));
        if (status) status.textContent = ready ? `Учебная сцена готова. Урок ${number}, seed ${seed}. Исходные объекты сохранены для возврата.` : 'Сцена ещё загружается. Повторите подготовку.';
    });
    container.querySelector<HTMLButtonElement>('[data-academy-restore]')?.addEventListener('click', () => {
        resetSimulationState(); restoreAcademyScene(); resetWalkthroughResult(walkthroughKey(language, lessonId));
        const status = container.querySelector<HTMLElement>('[data-academy-prepare-status]');
        if (status) status.textContent = 'Исходная сцена возвращена.';
    });
    container.querySelectorAll<HTMLButtonElement>('[data-academy-open]').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.academyOpen || '';
            const n = Number(id.slice(-3));
            const targetLanguage = n > 72 ? 'python' : language;
            const fullId = `${targetLanguage}-${id}`;
            const previous = ['lua', 'python'].some(track => isLessonCompleted(track as 'lua' | 'python', `${track}-academy-${String(n - 1).padStart(3, '0')}`));
            if (!/^academy-\d{3}$/.test(id) || !ACADEMY_READY_NUMBERS.has(n) || n > 1 && !isLessonCompleted(targetLanguage, fullId) && !previous) return;
            setActivePracticeTrack(targetLanguage);
            setActiveLessonId(targetLanguage, fullId);
            document.querySelectorAll<HTMLElement>('[data-guide-track]').forEach(tab => {
                tab.classList.toggle('is-active', tab.dataset.guideTrack === targetLanguage);
                tab.setAttribute('aria-selected', String(tab.dataset.guideTrack === targetLanguage));
            });
            rerender?.(targetLanguage);
        });
    });
    container.querySelector<HTMLButtonElement>('[data-academy-terrain]')?.addEventListener('click', () => {
        const profile = container.querySelector<HTMLSelectElement>('[data-academy-profile]')?.value as TrainingProfile;
        const field = container.querySelector<HTMLInputElement>('[data-academy-seed]');
        const seed = field?.valueAsNumber;
        const status = container.querySelector<HTMLElement>('[data-academy-terrain-status]');
        if (!TRAINING_PROFILES.includes(profile) || !Number.isInteger(seed) || seed! < 0 || seed! > 4294967295) {
            if (status) status.textContent = 'Укажите целый seed от 0 до 4294967295.';
            field?.setAttribute('aria-invalid', 'true');
            field?.focus();
            return;
        }
        field?.removeAttribute('aria-invalid');
        const group = addObjectToScene(`training-${profile}`, null, { trainingSeed: seed });
        resetWalkthroughResult(walkthroughKey(language, lessonId));
        if (status) status.textContent = group ? `Добавлен полигон «${TRAINING_PROFILE_LABELS[profile]}». Seed ${seed}. Откройте сцену или менеджер объектов для осмотра.` : 'Сцена ещё не готова. Повторите после её загрузки.';
    });
}
