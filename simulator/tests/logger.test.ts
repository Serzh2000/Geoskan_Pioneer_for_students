import { extractTagAndMessage, resolveLogCategory } from '../public/modules/shared/logging/logger.js';

describe('Logger categories', () => {
    test('extracts bracket tags and message body', () => {
        expect(extractTagAndMessage('[GUIDE] Lesson opened')).toEqual({
            tag: '[GUIDE]',
            message: 'Lesson opened'
        });
    });

    test('extracts plain text tag with colon', () => {
        expect(extractTagAndMessage('Режим камеры: FREE')).toEqual({
            tag: 'Режим камеры',
            message: 'FREE'
        });
    });

    test('routes guide, camera and script messages to dedicated tabs', () => {
        const guide = extractTagAndMessage('[GUIDE] Workspace synchronized');
        const camera = extractTagAndMessage('Режим камеры: FOLLOW');
        const script = extractTagAndMessage('[Lua Timer] start()');

        expect(resolveLogCategory('[GUIDE] Workspace synchronized', guide)).toBe('guide');
        expect(resolveLogCategory('Режим камеры: FOLLOW', camera)).toBe('camera');
        expect(resolveLogCategory('[Lua Timer] start()', script)).toBe('script');
    });

    test('falls back to system category for untagged messages', () => {
        const parsed = extractTagAndMessage('Инициализация симулятора...');

        expect(resolveLogCategory('Инициализация симулятора...', parsed)).toBe('system');
    });
});
