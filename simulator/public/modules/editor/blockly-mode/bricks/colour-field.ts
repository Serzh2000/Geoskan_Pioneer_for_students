import * as Blockly from 'blockly';

/*
 * Поле выбора цвета для блока «Цвет». В Blockly 12 поля цвета и угла вынесены из ядра в отдельные
 * пакеты, которых в проекте нет, поэтому цвет здесь свой: квадратик с цветом и палитра в выпадающем
 * окне. Значение - строка «#rrggbb» в нижнем регистре, как у Bricks.
 */

const PALETTE = [
    '#ff0000', '#ff7700', '#ffaa00', '#ffff00', '#aaff00', '#00ff00', '#00ffaa', '#00ffff',
    '#00aaff', '#0000ff', '#7700ff', '#ff00ff', '#ff0077', '#ffffff', '#aaaaaa', '#000000'
];

const HEX = /^#[0-9a-f]{6}$/;

function normalise(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim().toLowerCase();
    if (HEX.test(text)) return text;
    // Короткая запись #rgb тоже понятна.
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
    return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

type FieldInternals = { borderRect_?: SVGElement | null; fieldGroup_: SVGGElement; size_: { width: number; height: number } };

export class FieldHexColour extends Blockly.Field<string> {
    override SERIALIZABLE = true;
    CURSOR = 'pointer';
    private swatch: SVGElement | null = null;

    constructor(value: string = '#ff0000') {
        super(normalise(value) ?? '#ff0000');
    }

    protected override doClassValidation_(newValue?: unknown): string | null {
        return normalise(newValue);
    }

    protected override getDisplayText_(): string {
        return '     ';
    }

    protected override initView(): void {
        super.initView();
        const internals = this as unknown as FieldInternals;
        this.swatch = internals.borderRect_ ?? null;
        if (!this.swatch) {
            this.swatch = Blockly.utils.dom.createSvgElement(
                Blockly.utils.Svg.RECT,
                { class: 'blocklyFieldRect', rx: 4, ry: 4, x: 0, y: 0, height: 20, width: 36 },
                internals.fieldGroup_
            );
            internals.fieldGroup_.insertBefore(this.swatch, internals.fieldGroup_.firstChild);
        }
    }

    protected override render_(): void {
        super.render_();
        this.swatch?.setAttribute('style', `fill:${this.getValue() ?? '#ff0000'};fill-opacity:1;stroke:#ffffff88`);
        const internals = this as unknown as FieldInternals;
        if (this.swatch && this.swatch !== internals.borderRect_) {
            this.swatch.setAttribute('width', String(internals.size_.width));
            this.swatch.setAttribute('height', String(internals.size_.height));
        }
    }

    protected override showEditor_(): void {
        const content = Blockly.DropDownDiv.getContentDiv();
        content.textContent = '';
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,22px);gap:4px;padding:6px';
        for (const colour of PALETTE) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.title = colour;
            cell.setAttribute('aria-label', colour);
            cell.style.cssText = `width:22px;height:22px;border-radius:4px;border:1px solid #8886;background:${colour};cursor:pointer`;
            cell.addEventListener('click', () => {
                this.setValue(colour);
                Blockly.DropDownDiv.hideIfOwner(this as unknown as Blockly.Field<unknown>, true);
            });
            grid.appendChild(cell);
        }
        const custom = document.createElement('input');
        custom.type = 'color';
        custom.value = this.getValue() ?? '#ff0000';
        custom.title = 'Другой цвет';
        custom.style.cssText = 'grid-column:1 / -1;width:100%;height:28px;border:0;padding:0;background:none;cursor:pointer';
        custom.addEventListener('input', () => this.setValue(custom.value));
        grid.appendChild(custom);
        content.appendChild(grid);
        Blockly.DropDownDiv.setColour('#ffffff', '#cccccc');
        Blockly.DropDownDiv.showPositionedByField(this as unknown as Blockly.Field<unknown>);
    }
}
