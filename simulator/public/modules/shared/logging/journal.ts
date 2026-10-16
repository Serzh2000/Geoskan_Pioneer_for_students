import type { LogRecord } from './logger.js';

const labels: Record<string, string> = {system:'Система',guide:'Обучение',camera:'Камера',editor:'Редактор',scene:'Сцена',script:'Программа'};
const levels: Record<string, string> = {info:'Событие',action:'Действие',warn:'Внимание',error:'Ошибка',success:'Готово'};
let query = '', source = 'all', level = 'all', technical = false, follow = true;
const bound = new WeakSet<HTMLElement>();

export function isTechnicalLog(entry: Pick<LogRecord, 'tag' | 'message' | 'tone'>): boolean {
    if (entry.tone === 'error' || entry.tone === 'warn') return false;
    return /\[(3D-CLICK|3D-INIT|3DDBG|GUIDE-ZOOM|VISUAL|DEBUG)/i.test(entry.tag)
        || (entry.tag === '[GUIDE]' && /(?:^\w+_\w+|\w+=)/.test(entry.message));
}

export function filterJournal(entries: LogRecord[], filters: {query:string; source:string; level:string; technical:boolean}): LogRecord[] {
    return entries.filter(e => (filters.source === 'all' || e.category === filters.source)
        && (filters.level === 'all' || e.tone === filters.level)
        && (filters.technical || !isTechnicalLog(e))
        && `${e.message} ${e.tag} ${labels[e.category]}`.toLocaleLowerCase('ru').includes(filters.query.toLocaleLowerCase('ru').trim()));
}

export function renderJournal(stream: HTMLElement, entries: LogRecord[]) {
    const panel = document.getElementById('logs-panel');
    const redraw = () => renderJournal(stream, entries);
    if (panel && !bound.has(panel)) {
        bound.add(panel);
        const input = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`);
        input<HTMLInputElement>('logs-search')?.addEventListener('input', e => {query = (e.target as HTMLInputElement).value; redraw();});
        input<HTMLSelectElement>('logs-source')?.addEventListener('change', e => {source = (e.target as HTMLSelectElement).value; redraw();});
        input<HTMLSelectElement>('logs-severity')?.addEventListener('change', e => {level = (e.target as HTMLSelectElement).value; redraw();});
        input<HTMLInputElement>('logs-technical')?.addEventListener('change', e => {technical = (e.target as HTMLInputElement).checked; redraw();});
        input<HTMLInputElement>('logs-follow')?.addEventListener('change', e => {follow = (e.target as HTMLInputElement).checked; redraw();});
        input('logs-clear')?.addEventListener('click', () => {entries.length = 0; redraw();});
        input('logs-export')?.addEventListener('click', () => {
            const text = entries.map(e => `${e.time} ${e.tone.toUpperCase()} ${e.tag} ${e.message}`).join('\n');
            const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
            const link = document.createElement('a'); link.href = url; link.download = 'pioneer-journal.txt'; link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        stream.addEventListener('scroll', () => {
            if (follow && stream.scrollHeight - stream.scrollTop - stream.clientHeight > 40) {
                follow = false;
                const checkbox = input<HTMLInputElement>('logs-follow'); if (checkbox) checkbox.checked = false;
            }
        }, {passive:true});
    }
    const filtered = filterJournal(entries, {query,source,level,technical});
    const status = document.getElementById('logs-status');
    if (status) status.textContent = `${filtered.length} из ${entries.length} событий · диагностика ${technical ? 'включена' : 'скрыта'}`;
    const fragment = document.createDocumentFragment();
    for (const entry of filtered) {
        const row = document.createElement('article'); row.className = `journal-entry journal-entry--${entry.tone}`;
        const meta = document.createElement('div'); meta.className = 'journal-entry__meta';
        const category = document.createElement('strong'); category.textContent = labels[entry.category];
        const time = document.createElement('time'); time.textContent = entry.time;
        const tone = document.createElement('span'); tone.className = 'journal-entry__tone'; tone.textContent = levels[entry.tone];
        meta.append(category, time, tone);
        const message = document.createElement('p'); message.textContent = entry.category === 'camera'
            ? ({FREE:'Свободная камера',DRONE:'Камера следует за дроном',FPV:'Вид от первого лица',GROUND:'Вид сверху'}[entry.message.toUpperCase()] || entry.message)
            : entry.message;
        row.append(meta, message);
        if (technical) {const tag = document.createElement('small'); tag.textContent = entry.tag; row.append(tag);}
        fragment.append(row);
    }
    if (!filtered.length) {const empty = document.createElement('div'); empty.className = 'journal-empty'; empty.textContent = entries.length ? 'Ничего не найдено. Измените поиск или фильтры.' : 'Пока тихо. Здесь появятся события программы и сцены.'; fragment.append(empty);}
    const scroll = stream.scrollTop; stream.replaceChildren(fragment); stream.scrollTop = follow ? stream.scrollHeight : scroll;
}
