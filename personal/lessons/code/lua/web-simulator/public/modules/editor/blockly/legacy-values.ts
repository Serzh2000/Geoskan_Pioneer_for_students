/** Old lesson XML stored LED numbers as fields. The live teaching blocks use value inputs. */
export function migrateLessonLedValues(root: Element): void {
    for (const block of Array.from(root.querySelectorAll('block'))) {
        const names = block.getAttribute('type') === 'lua_ledbar_new' ? ['COUNT']
            : block.getAttribute('type') === 'lua_led_set' ? ['INDEX', 'R', 'G', 'B'] : [];
        for (const name of names) {
            const field = Array.from(block.children).find(child => child.localName === 'field' && child.getAttribute('name') === name);
            if (!field || !Number.isFinite(Number(field.textContent))) continue;
            const value = root.ownerDocument.createElement('value');
            value.setAttribute('name', name);
            const shadow = root.ownerDocument.createElement('shadow');
            shadow.setAttribute('type', 'math_number');
            const number = root.ownerDocument.createElement('field');
            number.setAttribute('name', 'NUM');
            number.textContent = field.textContent;
            shadow.appendChild(number);
            value.appendChild(shadow);
            field.replaceWith(value);
        }
    }
}
