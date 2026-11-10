/** Ошибка разбора или выполнения команды консоли: text печатается как есть, hint - строка-подсказка под ней. */
export class ConsoleError extends Error {
    constructor(message: string, readonly hint?: string) {
        super(message);
        this.name = 'ConsoleError';
    }
}
