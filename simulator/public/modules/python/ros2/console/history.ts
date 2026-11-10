/** История команд консоли: ↑ и ↓ как в bash, черновик строки сохраняется при переходах. */
export class CommandHistory {
    private readonly items: string[];
    private cursor: number;
    private draft = '';

    constructor(initial: readonly string[] = [], private readonly limit = 200) {
        this.items = initial.slice(-limit);
        this.cursor = this.items.length;
    }

    get entries(): readonly string[] {
        return this.items;
    }

    /** Запоминает выполненную команду (пустые и подряд идущие повторы пропускаются). */
    push(line: string): void {
        const text = line.trim();
        if (text && this.items[this.items.length - 1] !== text) {
            this.items.push(text);
            if (this.items.length > this.limit) this.items.shift();
        }
        this.cursor = this.items.length;
        this.draft = '';
    }

    /** ↑: предыдущая команда; current - то, что сейчас в строке (сохраняется как черновик на краю). */
    previous(current: string): string {
        if (this.cursor === this.items.length) this.draft = current;
        this.cursor = Math.max(0, this.cursor - 1);
        return this.items[this.cursor] ?? current;
    }

    /** ↓: следующая команда или черновик. */
    next(current: string): string {
        if (this.cursor >= this.items.length) return current;
        this.cursor += 1;
        return this.cursor === this.items.length ? this.draft : this.items[this.cursor];
    }

    reset(): void {
        this.cursor = this.items.length;
        this.draft = '';
    }
}
