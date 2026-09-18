import type { ScriptLanguage } from '../../api-docs/sections.js';
import type { GuideLessonState } from '../types.js';
import { getActiveLesson, getFirstUnlockedLesson, getCompletedLessonsCount, getLessonProgressState, getLessonsForChapter, isLessonCompleted } from '../state.js';
import { escapeHtml as esc, renderInline } from './support.js';

export function renderPortalIntro(state: GuideLessonState, language: ScriptLanguage): string {
 const completed = getCompletedLessonsCount(state, language);
 const active = getActiveLesson(state, language);
 const next = isLessonCompleted(language, active.id) ? getFirstUnlockedLesson(state, language) : active;
 const percent = Math.round(completed / Math.max(1,state.lessons.length) * 100);
 const done = completed === state.lessons.length;
 return `<div class="academy">
 <section class="academy-hero"><div class="academy-hero__copy"><span class="academy-eyebrow">PIONEER / ПРАКТИКА</span>
 <h1>От первой команды<br>до самостоятельного полёта</h1>
 <p>Соберите программу из блоков, разберитесь в командах ${language === 'python' ? 'Python' : 'Lua'} и проверьте поведение дрона в 3D-сцене.</p>
 <div class="academy-facts"><span>${state.lessons.length} заданий</span><span>${state.chapters.length} раздела</span><span>В своём темпе</span></div>
 <button class="guide-primary-action academy-start" data-guide-open-lesson="${esc(next.id)}">${done ? 'Повторить практику' : completed ? 'Продолжить обучение' : 'Начать первый урок'} →</button>
 <small>${done ? 'Все задания пройдены. Можно вернуться к любому уроку.' : `Следующий шаг: ${esc(next.title)}`}</small></div>
 <div class="academy-hero__visual" aria-hidden="true"><svg viewBox="0 0 360 260" fill="none"><path d="M30 190 180 108 330 190 180 272Z" stroke="currentColor" opacity=".12"/><path d="M30 148 180 66 330 148 180 230Z" stroke="currentColor" opacity=".2"/><path d="M180 76v115M74 133l106 58 106-58" stroke="currentColor" opacity=".3" stroke-dasharray="4 7"/><path d="m118 100 124 69M242 100l-124 69" stroke="currentColor" stroke-width="11"/><path d="m157 119 23-13 23 13v28l-23 13-23-13Z" fill="currentColor"/><g stroke="currentColor" stroke-width="3"><ellipse cx="113" cy="97" rx="39" ry="22"/><ellipse cx="247" cy="97" rx="39" ry="22"/><ellipse cx="113" cy="172" rx="39" ry="22"/><ellipse cx="247" cy="172" rx="39" ry="22"/></g><path d="M50 42h28M64 28v28M296 210h20M306 200v20" stroke="#ff852d" stroke-width="3"/></svg><span>КОМАНДА → СОБЫТИЕ → РЕЗУЛЬТАТ</span></div></section>
 <div class="academy-body"><aside class="academy-sidebar"><section class="academy-progress"><div><strong>Ваш прогресс</strong><b>${percent}%</b></div><progress value="${completed}" max="${state.lessons.length}" aria-label="Прогресс курса"></progress><p>Пройдено ${completed} из ${state.lessons.length} уроков</p></section>
 <section class="academy-how"><h2>Как проходит урок</h2><ol><li><b>Разберитесь в задаче</b><span>Изучите команды и ожидаемый результат.</span></li><li><b>Соберите программу</b><span>Перенесите нужные блоки в основной редактор.</span></li><li><b>Проверьте на сцене</b><span>Проверка найдёт замечания к цепочке, а симуляция покажет поведение дрона.</span></li></ol></section>
 <div class="academy-note"><strong>Наблюдайте за результатом</strong><p>Проверка цепочки и выполнение полёта — разные этапы. Убедитесь, что дрон сделал именно то, что требовалось в задании.</p></div></aside>
 <section class="academy-course"><div class="academy-section-heading"><div><span class="academy-eyebrow">ПРОГРАММА КУРСА</span><h2>Чему вы научитесь</h2></div><span>От простого к сложному</span></div>
 ${state.chapters.map((chapter,i) => {
  const lessons = getLessonsForChapter(state,chapter.id);
  const count = lessons.filter(l=>isLessonCompleted(language,l.id)).length;
  const titles = ['Сигналы и время','Подготовка и первый полёт','Маршрут и завершение миссии'];
  const summaries = ['Управляйте светодиодами и задавайте задержки. Разделяйте разовые команды и повторяющиеся действия.','Подготовьте аппарат, дождитесь готовности и отправьте его к точке. Связывайте команды с событиями.','Объедините взлёт, движение и посадку. Завершайте этап после подтверждения автопилота.'];
  return `<section class="academy-chapter"><header><span class="academy-chapter__number">0${i+1}</span><div><h3>${titles[i] || esc(chapter.title)}</h3><p>${summaries[i] || esc(chapter.summary)}</p></div><span class="academy-chapter__count">${count}/${lessons.length}</span></header><div class="academy-lessons">${lessons.map(item=>{
   const status = getLessonProgressState(state,language,item.id), locked=status==='locked', index=state.lessons.indexOf(item)+1;
   return `<${locked?'div':'button'} class="academy-lesson ${locked?'is-locked':status==='completed'?'is-complete':'is-available'}" ${locked?'':`type="button" data-guide-open-lesson="${esc(item.id)}"`}><span class="academy-lesson__number">${status==='completed'?'✓':String(index).padStart(2,'0')}</span><span class="academy-lesson__copy"><strong>${esc(item.title)}</strong><span>${renderInline(item.goal)}</span></span><span class="academy-lesson__state">${locked?'После урока '+(index-1):status==='completed'?'Повторить ↗':'Открыть →'}</span></${locked?'div':'button'}>`;
  }).join('')}</div></section>`;
 }).join('')}</section></div></div>`;
}
