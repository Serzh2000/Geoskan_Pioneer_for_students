/** Страница политики: версия совпадает с версией согласия, есть обязательные разделы, нет ложных обещаний. */
import fs from 'node:fs';
import path from 'node:path';
import { CONSENT_VERSION } from '../server/legal-config.js';

const html = fs.readFileSync(path.resolve('static/privacy/index.html'), 'utf8');

describe('страница /privacy/', () => {
    test('версия в странице равна версии согласия', () => {
        expect(html).toContain(`<meta name="policy-version" content="${CONSENT_VERSION}">`);
    });
    test('есть разделы: данные, условия, права, контакты', () => {
        for (const id of ['data', 'terms', 'rights', 'contacts']) expect(html).toContain(`id="${id}"`);
    });
    test('не обещает «никаких персональных данных» и не использует внешние ресурсы', () => {
        expect(html).not.toMatch(/не хранит (вообще )?никаких персональных/i);
        expect(html).not.toMatch(/(src|href)="https?:\/\/(?!github\.com|simulator\.sakoryagin\.ru)/);
    });
    test('на неё ведут ссылки из мест согласия', () => {
        expect(fs.readFileSync(path.resolve('public/modules/learning/consent-gate.ts'), 'utf8')).toContain('/privacy/');
        expect(fs.readFileSync(path.resolve('static/sitemap.xml'), 'utf8')).toContain('/privacy/');
    });
});
