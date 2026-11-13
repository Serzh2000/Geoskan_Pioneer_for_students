/**
 * Журнал попыток: что ученик отправил на проверку и что ему ответили.
 *
 * Зачёт миссии хранится в аккаунте (server/accounts.ts), а здесь — каждая проверка: миссия, язык, прошла ли она,
 * какие замечания получил ученик и его код. По этому видно, на каких миссиях и на каких замечаниях ученики застревают,
 * то есть какие формулировки заданий написаны плохо. Хранилище — файл JSON Lines рядом с файлом аккаунтов:
 * дописывание одной строки не портит прошлые записи, а при сбое теряется не больше последней строки.
 */
import fs from 'fs';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

export type Attempt = {
    at: number;
    userId: string;
    name: string;
    track: string;
    questId: string;
    solved: boolean;
    /** Заголовки замечаний проверки: «Нужен чистый зелёный или синий», «Проверьте подготовку» и т. п. */
    titles: string[];
    code: string;
    /** Промежуточный опыт миссии из нескольких запусков («Опыт записан, проверьте следующий случай»): не ошибка и не зачёт. */
    partial?: boolean;
};

export type QuestAttemptStats = {
    track: string;
    questId: string;
    attempts: number;
    solved: number;
    /** Промежуточные опыты: нужны миссии, но ошибкой не считаются. */
    partial: number;
    /** Настоящие неудачи: не зачёт и не промежуточный опыт. */
    failures: number;
    students: number;
    studentsSolved: number;
    /** Сколько настоящих неудач в среднем предшествовало зачёту (без обязательных промежуточных опытов). */
    avgFailsToSolve: number | null;
    /** Сколько проверок в среднем понадобилось тем ученикам, кто решил миссию. */
    avgAttemptsToSolve: number | null;
    topIssues: { title: string; count: number }[];
};

export const MAX_CODE_LENGTH = 6000;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const clip = (value: unknown, max: number) => String(value ?? '').slice(0, max);

export function resolveAttemptsFile(accountsFile: string, env: NodeJS.ProcessEnv = process.env): string {
    return env.ATTEMPTS_FILE ? path.resolve(env.ATTEMPTS_FILE) : path.join(path.dirname(accountsFile), 'attempts.jsonl');
}

export class AttemptLog {
    private writes: Promise<unknown> = Promise.resolve();
    constructor(private file: string) {}

    /** Приводит присланное клиентом к безопасной записи: длины обрезаются, лишние поля отбрасываются. */
    static sanitize(input: { userId: string; name: string; track: string; questId: string; body: any }, now = Date.now()): Attempt {
        const titles = Array.isArray(input.body?.titles) ? input.body.titles.slice(0, 5).map((title: unknown) => clip(title, 160)).filter(Boolean) : [];
        return {
            at: now, userId: input.userId, name: clip(input.name, 120), track: input.track, questId: input.questId,
            solved: input.body?.solved === true, titles, code: clip(input.body?.code, MAX_CODE_LENGTH),
            ...(input.body?.partial === true && input.body?.solved !== true ? { partial: true } : {})
        };
    }

    async add(attempt: Attempt): Promise<void> {
        try {
            if (fs.existsSync(this.file) && fs.statSync(this.file).size > MAX_FILE_BYTES) return;
        } catch { /* нет файла или нет доступа: пробуем писать */ }
        const line = JSON.stringify(attempt) + '\n';
        this.writes = this.writes.then(async () => {
            await mkdir(path.dirname(this.file), { recursive: true });
            await appendFile(this.file, line, 'utf8');
            this.cache = null;
        }).catch((error) => { console.error('[attempts]', error); });
        await this.writes;
    }

    private cache: { key: string; list: Attempt[] } | null = null;

    /** Весь журнал; разобранный файл запоминается, пока он не изменился (кабинеты читают его часто). */
    read(): Attempt[] {
        let key: string;
        try { const stat = fs.statSync(this.file); key = `${stat.mtimeMs}:${stat.size}`; } catch { return []; }
        if (this.cache?.key === key) return this.cache.list;
        let text: string;
        try { text = fs.readFileSync(this.file, 'utf8'); } catch { return []; }
        const out: Attempt[] = [];
        for (const line of text.split('\n')) {
            if (!line) continue;
            try { out.push(JSON.parse(line) as Attempt); } catch { /* оборванная последняя строка */ }
        }
        this.cache = { key, list: out };
        return out;
    }

    /** Все проверки одного ученика, по порядку. */
    forUser(userId: string): Attempt[] {
        return this.read().filter((attempt) => attempt.userId === userId);
    }

    /** Ученики, которые проверяли миссию и ни разу не прошли её; `fails` — число неудачных проверок. */
    stuckStudents(track: string, questId: string, onlyUsers?: Set<string>): { userId: string; name: string; fails: number; lastAt: number }[] {
        const byUser = new Map<string, Attempt[]>();
        for (const attempt of this.read()) {
            if (attempt.track !== track || attempt.questId !== questId) continue;
            if (onlyUsers && !onlyUsers.has(attempt.userId)) continue;
            if (attempt.partial) continue; // промежуточный опыт не делает ученика застрявшим
            const own = byUser.get(attempt.userId) ?? [];
            own.push(attempt);
            byUser.set(attempt.userId, own);
        }
        const out: { userId: string; name: string; fails: number; lastAt: number }[] = [];
        for (const [userId, own] of byUser) {
            if (own.some((attempt) => attempt.solved)) continue;
            out.push({ userId, name: own[own.length - 1].name, fails: own.length, lastAt: own[own.length - 1].at });
        }
        return out.sort((a, b) => b.fails - a.fails);
    }

    /** Сколько миссий ученик прошёл с первой проверки (для достижений). */
    firstTrySolved(userId: string): number {
        const seen = new Set<string>();
        let count = 0;
        for (const attempt of this.forUser(userId)) {
            if (attempt.partial) continue; // «с первой проверки» считается по зачётам и ошибкам, а не по обязательным опытам
            const key = `${attempt.track}\n${attempt.questId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (attempt.solved) count++;
        }
        return count;
    }

    stats(track?: string, onlyUsers?: Set<string>): QuestAttemptStats[] {
        const groups = new Map<string, Attempt[]>();
        for (const attempt of this.read()) {
            if (track && attempt.track !== track) continue;
            if (onlyUsers && !onlyUsers.has(attempt.userId)) continue;
            const key = `${attempt.track}\n${attempt.questId}`;
            const list = groups.get(key) ?? [];
            list.push(attempt);
            groups.set(key, list);
        }
        return [...groups.values()].map((list) => {
            const byStudent = new Map<string, Attempt[]>();
            for (const attempt of list) {
                const own = byStudent.get(attempt.userId) ?? [];
                own.push(attempt);
                byStudent.set(attempt.userId, own);
            }
            const issues = new Map<string, number>();
            for (const attempt of list) if (!attempt.solved && !attempt.partial) for (const title of new Set(attempt.titles)) issues.set(title, (issues.get(title) ?? 0) + 1);
            // Настоящие неудачи до первого зачёта: обязательные промежуточные опыты в счёт не идут.
            const failsToSolve = [...byStudent.values()].flatMap((own) => {
                const index = own.findIndex((attempt) => attempt.solved);
                return index < 0 ? [] : [own.slice(0, index).filter((attempt) => !attempt.partial).length];
            });
            const toSolve = [...byStudent.values()].flatMap((own) => {
                const index = own.findIndex((attempt) => attempt.solved);
                return index < 0 ? [] : [index + 1];
            });
            return {
                track: list[0].track, questId: list[0].questId, attempts: list.length, solved: list.filter((attempt) => attempt.solved).length,
                partial: list.filter((attempt) => attempt.partial).length, failures: list.filter((attempt) => !attempt.solved && !attempt.partial).length,
                students: byStudent.size, studentsSolved: toSolve.length,
                avgFailsToSolve: failsToSolve.length ? Math.round((failsToSolve.reduce((sum, value) => sum + value, 0) / failsToSolve.length) * 10) / 10 : null,
                avgAttemptsToSolve: toSolve.length ? Math.round((toSolve.reduce((sum, value) => sum + value, 0) / toSolve.length) * 10) / 10 : null,
                topIssues: [...issues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([title, count]) => ({ title, count }))
            };
        });
    }

    /** Последние неудачные попытки миссии: по коду видно, что именно ученики пишут не так. */
    recentFailures(track: string, questId: string, limit = 25, onlyUsers?: Set<string>): Attempt[] {
        return this.read().filter((attempt) => attempt.track === track && attempt.questId === questId && !attempt.solved && !attempt.partial && (!onlyUsers || onlyUsers.has(attempt.userId))).slice(-limit).reverse();
    }
}
