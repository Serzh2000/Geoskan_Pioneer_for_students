/**
 * Анонимная метрика действий: что открывают, где просят подсказку, сколько времени тратят на миссию, где уходят.
 * Нужна, чтобы понимать, что в симуляторе и уроках улучшать.
 *
 * Здесь нет ни имён, ни логинов, ни кода, ни свободного текста: событие — это название из закрытого списка, язык,
 * номер миссии, число и случайный номер вкладки (создаётся в браузере и не связан с аккаунтом). Хранилище — JSON Lines рядом с файлом аккаунтов.
 */
import fs from 'fs';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

export const METRIC_EVENTS = [
    'session_start',   // открыли симулятор; detail = guest | student | teacher
    'mode_enter',      // вошли в режим; detail = learning | free
    'quest_open',      // открыли миссию
    'hint_open',       // открыли подсказку
    'quest_done',      // миссия засчитана; value = секунд с открытия
    'quest_leave',     // ушли с непройденной миссии; value = секунд на ней
    'map_open',        // открыли карту заданий
    'track_switch',    // переключили язык; detail = lua | python | blocks
    'cabinet_open',    // открыли личный кабинет
    'feature_use'      // использовали возможность; detail = короткое имя
] as const;
export type MetricName = (typeof METRIC_EVENTS)[number];

/** org - организация вошедшего пользователя (ставит сервер, не страница); у гостя и у старых записей её нет, они считаются «Основной». */
export type MetricEvent = { at: number; sid: string; name: MetricName; track?: string; questId?: string; value?: number; detail?: string; org?: string };

const SID = /^[A-Za-z0-9_-]{6,40}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DETAIL = /^[a-z0-9_.-]{1,40}$/;
const TRACKS = ['blocks', 'lua', 'python', 'sdk2', 'bricks'];
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

export function resolveMetricsFile(accountsFile: string, env: NodeJS.ProcessEnv = process.env): string {
    return env.METRICS_FILE ? path.resolve(env.METRICS_FILE) : path.join(path.dirname(accountsFile), 'metrics.jsonl');
}

/** Приводит присланное к безопасному событию или отбрасывает его (null). Лишние поля не сохраняются. */
export function sanitizeEvent(input: any, now = Date.now()): MetricEvent | null {
    if (!input || typeof input !== 'object') return null;
    if (!METRIC_EVENTS.includes(input.name) || typeof input.sid !== 'string' || !SID.test(input.sid)) return null;
    const event: MetricEvent = { at: now, sid: input.sid, name: input.name };
    if (TRACKS.includes(input.track)) event.track = input.track;
    if (typeof input.questId === 'string' && ID.test(input.questId)) event.questId = input.questId;
    if (typeof input.detail === 'string' && DETAIL.test(input.detail)) event.detail = input.detail;
    if (Number.isFinite(input.value)) event.value = Math.max(0, Math.min(Math.round(input.value), 24 * 3600));
    return event;
}

const median = (values: number[]): number | null => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

export type QuestMetrics = {
    track: string; questId: string; opens: number; sessions: number; hints: number; done: number; leaves: number;
    medianDoneSeconds: number | null; medianLeaveSeconds: number | null;
};

export class MetricsLog {
    private writes: Promise<unknown> = Promise.resolve();
    constructor(private file: string) {}

    async add(events: MetricEvent[]): Promise<void> {
        if (!events.length) return;
        try {
            if (fs.existsSync(this.file) && fs.statSync(this.file).size > MAX_FILE_BYTES) return;
        } catch { /* нет файла: пробуем писать */ }
        const text = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
        this.writes = this.writes.then(async () => {
            await mkdir(path.dirname(this.file), { recursive: true });
            await appendFile(this.file, text, 'utf8');
        }).catch((error) => { console.error('[metrics]', error); });
        await this.writes;
    }

    read(since = 0): MetricEvent[] {
        let text: string;
        try { text = fs.readFileSync(this.file, 'utf8'); } catch { return []; }
        const out: MetricEvent[] = [];
        for (const line of text.split('\n')) {
            if (!line) continue;
            try {
                const event = JSON.parse(line) as MetricEvent;
                if (event.at >= since) out.push(event);
            } catch { /* оборванная последняя строка */ }
        }
        return out;
    }

    /** Сводка за последние `days` дней: по миссиям и в целом. */
    summary(days = 30, now = Date.now(), org?: string | null, mainOrg = 'org-main') {
        // org: только события этой организации; null или не задана - все (админ).
        const events = this.read(now - days * DAY).filter((event) => !org || (event.org ?? mainOrg) === org);
        const quests = new Map<string, { m: QuestMetrics; sids: Set<string>; done: number[]; leave: number[] }>();
        const entry = (event: MetricEvent) => {
            const key = `${event.track}\n${event.questId}`;
            let item = quests.get(key);
            if (!item) {
                item = { m: { track: event.track!, questId: event.questId!, opens: 0, sessions: 0, hints: 0, done: 0, leaves: 0, medianDoneSeconds: null, medianLeaveSeconds: null }, sids: new Set(), done: [], leave: [] };
                quests.set(key, item);
            }
            return item;
        };
        const sessions = new Set<string>();
        const sessionsByDay: Record<string, Set<string>> = {};
        const roles: Record<string, number> = {};
        const features: Record<string, number> = {};
        const tracks: Record<string, number> = {};
        let mapOpens = 0;
        let cabinetOpens = 0;
        for (const event of events) {
            sessions.add(event.sid);
            (sessionsByDay[new Date(event.at).toISOString().slice(0, 10)] ??= new Set()).add(event.sid);
            if (event.name === 'session_start' && event.detail) roles[event.detail] = (roles[event.detail] ?? 0) + 1;
            if (event.name === 'feature_use' && event.detail) features[event.detail] = (features[event.detail] ?? 0) + 1;
            if (event.name === 'track_switch' && event.detail) tracks[event.detail] = (tracks[event.detail] ?? 0) + 1;
            if (event.name === 'map_open') mapOpens++;
            if (event.name === 'cabinet_open') cabinetOpens++;
            if (!event.track || !event.questId) continue;
            if (event.name === 'quest_open') { const item = entry(event); item.m.opens++; item.sids.add(event.sid); }
            else if (event.name === 'hint_open') entry(event).m.hints++;
            else if (event.name === 'quest_done') { const item = entry(event); item.m.done++; if (event.value !== undefined) item.done.push(event.value); }
            else if (event.name === 'quest_leave') { const item = entry(event); item.m.leaves++; if (event.value !== undefined) item.leave.push(event.value); }
        }
        const perQuest: QuestMetrics[] = [...quests.values()].map(({ m, sids, done, leave }) => ({
            ...m, sessions: sids.size, medianDoneSeconds: median(done), medianLeaveSeconds: median(leave)
        }));
        return {
            days, events: events.length, sessions: sessions.size, roles, features, tracks, mapOpens, cabinetOpens,
            sessionsByDay: Object.fromEntries(Object.entries(sessionsByDay).map(([day, who]) => [day, who.size])),
            quests: perQuest
        };
    }
}
