import { TRAINING_PROFILES, TRAINING_PROFILE_LABELS } from '../../../environment/training/layout.js';
import { escapeHtml as esc } from './shared.js';

/** Course information stays in the rail; lesson navigation has one owner. */
export function renderAcademyRoadmap(language: 'lua' | 'python' = 'lua'): string {
    return `<div class="guide-academy-roadmap">
        <p>108 последовательных уроков: устройство аппарата, arm, свет, программа, события, координаты, маршруты, местность и телеметрия. Затем — камера, ArUco, наведение и самостоятельные миссии.</p>
        <p>Уроки 1–72 доступны на Lua и Python, 73–108 — на Python. Пройденная тема открывает следующую на обоих языках; черновики и проверка остаются отдельными. Сейчас выбран ${language === 'lua' ? 'Lua' : 'Python'}.</p>
        <section class="guide-academy-terrain"><p class="guide-academy-terrain__title">Учебные полигоны</p>
            <p>Карты занимают 600 × 600 м. Учебный маршрут сохраняет размер первых упражнений: 100 м на открытом полигоне и в лаборатории, до 180 м на остальных картах. Жилые районы, фермы и грузовые дворы имеют своё назначение; школы и больницы размещаются рядом с жильём. Seed воспроизводит местность, а старт и учебный коридор остаются свободными.</p>
            <label class="pk-field"><span class="pk-field__label">Местность</span><select aria-label="Местность" data-academy-profile>${TRAINING_PROFILES.map(profile => `<option value="${profile}">${esc(TRAINING_PROFILE_LABELS[profile])}</option>`).join('')}</select></label>
            <label class="pk-field"><span class="pk-field__label">Seed</span><input aria-label="Seed" aria-describedby="guide-terrain-status" type="number" min="0" max="4294967295" step="1" value="20261009" data-academy-seed></label>
            <button type="button" class="btn-secondary" data-academy-terrain>Добавить полигон в сцену</button>
            <p id="guide-terrain-status" data-academy-terrain-status role="status">Полигон добавляется отдельной группой. Его можно изменить или удалить в менеджере сцены. В уроках с полигоном используйте кнопку подготовки внутри практики.</p>
        </section>
    </div>`;
}
