/**
 * Простая защита регистрации учителя от ботов без внешних сервисов (школьные сети их режут, а данные детей наружу не идут).
 * Сервер выдаёт вопрос с арифметикой и подписанный токен; в токене хэш ответа и время выдачи, состояния на сервере нет.
 * Токен действует один раз, не раньше чем через две секунды после выдачи (человек столько читает, бот отвечает мгновенно)
 * и не дольше получаса.
 */
import crypto from 'crypto';

const MIN_AGE_MS = 2000;
const MAX_AGE_MS = 30 * 60 * 1000;

export type Captcha = { token: string; question: string };

const sign = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
const answerHash = (secret: string, nonce: string, answer: number) => crypto.createHmac('sha256', secret).update(`${nonce}:${answer}`).digest('base64url');

function pick(max: number): number {
    return crypto.randomInt(0, max);
}

/** Вопрос и верный ответ. Числа небольшие, формулировки разные: один шаблон бот выучит быстро. */
function makeQuestion(): { question: string; answer: number } {
    const kind = pick(4);
    if (kind === 0) {
        const a = 3 + pick(7); const b = 2 + pick(7);
        return { question: `Сколько будет ${a} плюс ${b}? Ответьте цифрами.`, answer: a + b };
    }
    if (kind === 1) {
        const a = 9 + pick(8); const b = 2 + pick(7);
        return { question: `Сколько будет ${a} минус ${b}? Ответьте цифрами.`, answer: a - b };
    }
    if (kind === 2) {
        const a = 2 + pick(4); const b = 2 + pick(4);
        return { question: `Сколько будет ${a} умножить на ${b}? Ответьте цифрами.`, answer: a * b };
    }
    const legs = 2 + pick(4); const count = 2 + pick(4);
    return { question: `На каждом из ${count} дронов по ${legs} винта. Сколько всего винтов? Ответьте цифрами.`, answer: legs * count };
}

export class CaptchaIssuer {
    private used = new Map<string, number>();

    constructor(private secret: string = process.env.CAPTCHA_SECRET || crypto.randomBytes(32).toString('hex')) {}

    create(now = Date.now()): Captcha {
        const { question, answer } = makeQuestion();
        const nonce = crypto.randomBytes(12).toString('base64url');
        const payload = `${now}.${nonce}.${answerHash(this.secret, nonce, answer)}`;
        return { token: `${payload}.${sign(this.secret, payload)}`, question };
    }

    /** Верный ли ответ. Токен «сгорает» после первой проверки, даже неудачной. */
    verify(token: unknown, answer: unknown, now = Date.now()): boolean {
        if (typeof token !== 'string') return false;
        const parts = token.split('.');
        if (parts.length !== 4) return false;
        const [issuedText, nonce, hash, signature] = parts;
        const payload = `${issuedText}.${nonce}.${hash}`;
        const expected = Buffer.from(sign(this.secret, payload));
        const given = Buffer.from(signature);
        if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
        const issued = Number(issuedText);
        const age = now - issued;
        if (!Number.isFinite(issued) || age < MIN_AGE_MS || age > MAX_AGE_MS) return false;
        for (const [key, until] of this.used) if (until < now) this.used.delete(key);
        if (this.used.has(nonce)) return false;
        this.used.set(nonce, issued + MAX_AGE_MS);
        const number = Number(String(answer ?? '').trim());
        if (!Number.isInteger(number)) return false;
        const candidate = Buffer.from(answerHash(this.secret, nonce, number));
        const right = Buffer.from(hash);
        return candidate.length === right.length && crypto.timingSafeEqual(candidate, right);
    }
}
