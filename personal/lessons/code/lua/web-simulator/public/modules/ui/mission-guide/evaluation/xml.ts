export function getDirectChildByTagName(element: Element, tagName: string): Element | null {
    return Array.from(element.children).find((child) => child.localName === tagName) || null;
}

export function getDirectBlockChild(element: Element, wrapperTag: string): Element | null {
    const wrapper = getDirectChildByTagName(element, wrapperTag);
    if (!wrapper) return null;
    return Array.from(wrapper.children).find((child) => child.localName === 'block') || null;
}

export function getNextBlock(element: Element | null): Element | null {
    if (!element) return null;
    return getDirectBlockChild(element, 'next');
}

export function getStatementBlock(element: Element | null, name: string): Element | null {
    if (!element) return null;
    const statement = Array.from(element.children).find((child) => child.localName === 'statement' && child.getAttribute('name') === name);
    if (!statement) return null;
    return Array.from(statement.children).find((child) => child.localName === 'block') || null;
}

export function getFieldValue(element: Element | null, fieldName: string): string | null {
    if (!element) return null;
    const field = Array.from(element.children).find((child) => child.localName === 'field' && child.getAttribute('name') === fieldName);
    return field?.textContent ?? null;
}

export function hasBlockType(element: Element | null, blockType: string): boolean {
    return element?.getAttribute('type') === blockType;
}

export function hasFieldValue(element: Element | null, fieldName: string, expected: string): boolean {
    return getFieldValue(element, fieldName) === expected;
}

export function hasNumericFieldValue(element: Element | null, fieldName: string, expected: number): boolean {
    const actual = getFieldValue(element, fieldName);
    if (actual == null) return false;
    return Number(actual) === expected;
}

export function parseWorkspaceXml(workspaceXml: string | null | undefined): Element | null {
    if (!workspaceXml || typeof DOMParser === 'undefined') return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(workspaceXml, 'text/xml');
    const xmlRoot = doc.documentElement;
    if (!xmlRoot || xmlRoot.localName !== 'xml') return null;
    return xmlRoot;
}

export function findFirstBlockByType(root: Element | null, blockType: string): Element | null {
    if (!root) return null;
    if (root.localName === 'block' && root.getAttribute('type') === blockType) {
        return root;
    }
    for (const child of Array.from(root.children)) {
        const match = findFirstBlockByType(child, blockType);
        if (match) return match;
    }
    return null;
}
