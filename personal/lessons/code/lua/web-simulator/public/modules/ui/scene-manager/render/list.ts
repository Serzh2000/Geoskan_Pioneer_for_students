import type { UICallbacks } from '../../index.js';
import type { SceneManagerDomRefs, SceneManagerEntry } from '../types.js';
import type { SceneTreeState } from '../view-state.js';
import { escapeHtml } from './format.js';
import { getSceneObjectIcon } from './icons.js';
import { tablerIcon } from '../../icons/tabler.js';
import {
    formatObjectCount,
    getEntryKind,
    getEntryMeta,
    getEntryTitle,
    isProtectedEntry,
    matchesQuery
} from './label.js';

const TWISTY_ICON = tablerIcon('chevron-right');
const FOCUS_ICON = tablerIcon('focus-2');
const DELETE_ICON = tablerIcon('trash');

type VisibleRow = {
    entry: SceneManagerEntry;
    hasChildren: boolean;
    expanded: boolean;
};

function buildVisibleRows(objects: SceneManagerEntry[], tree: SceneTreeState): VisibleRow[] {
    const query = tree.query.trim().toLowerCase();
    const childrenOf = new Map<string, SceneManagerEntry[]>();
    for (const entry of objects) {
        const key = entry.parentId || '';
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(entry);
    }

    const rows: VisibleRow[] = [];
    const walk = (parentId: string) => {
        for (const entry of childrenOf.get(parentId) || []) {
            const children = childrenOf.get(entry.id) || [];
            const subtreeMatches = query ? subtreeHasMatch(entry, childrenOf, query) : true;
            if (!subtreeMatches) continue;

            const hasChildren = children.length > 0;
            // While filtering, containers open themselves so matching descendants stay reachable.
            const expanded = hasChildren && (!!query || tree.expandedIds.has(entry.id));
            rows.push({ entry, hasChildren, expanded });
            if (expanded) walk(entry.id);
        }
    };
    walk('');
    return rows;
}

function subtreeHasMatch(
    entry: SceneManagerEntry,
    childrenOf: Map<string, SceneManagerEntry[]>,
    query: string
): boolean {
    if (matchesQuery(entry, query)) return true;
    return (childrenOf.get(entry.id) || []).some((child) => subtreeHasMatch(child, childrenOf, query));
}

function createRow(
    row: VisibleRow,
    selectedId: string | null,
    callbacks: UICallbacks,
    tree: SceneTreeState,
    rerender: () => void
): HTMLElement {
    const { entry, hasChildren, expanded } = row;
    const depth = Number(entry.depth || 0);
    // entry.selected also covers Ctrl+click multi-selection (viewport or
    // list); selectedId alone only ever tracks the single "last" one.
    const isSelected = entry.selected || entry.id === selectedId;
    const kind = getEntryKind(entry);

    const item = document.createElement('div');
    item.className = 'scene-tree-row' + (isSelected ? ' is-selected' : '');
    item.style.setProperty('--tree-depth', String(depth));
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(depth + 1));
    item.setAttribute('aria-selected', String(isSelected));
    if (hasChildren) item.setAttribute('aria-expanded', String(expanded));

    const twisty = document.createElement('button');
    twisty.type = 'button';
    twisty.className = 'scene-tree-twisty' + (expanded ? ' is-expanded' : '');
    twisty.tabIndex = -1;
    if (hasChildren) {
        twisty.innerHTML = TWISTY_ICON;
        twisty.setAttribute('aria-label', expanded ? 'Свернуть' : 'Развернуть');
        twisty.addEventListener('click', (event) => {
            event.stopPropagation();
            if (tree.expandedIds.has(entry.id)) tree.expandedIds.delete(entry.id);
            else tree.expandedIds.add(entry.id);
            rerender();
        });
    } else {
        twisty.classList.add('is-empty');
        twisty.disabled = true;
        twisty.setAttribute('aria-hidden', 'true');
    }

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'scene-tree-main';
    main.dataset.id = entry.id;
    main.title = `${getEntryTitle(entry)} — ${getEntryMeta(entry)}`;
    main.tabIndex = isSelected ? 0 : -1;
    main.addEventListener('focus', () => {
        item.parentElement?.querySelectorAll<HTMLButtonElement>('.scene-tree-main').forEach(button => { button.tabIndex = button === main ? 0 : -1; });
    });
    main.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const buttons = Array.from(item.parentElement?.querySelectorAll<HTMLButtonElement>('.scene-tree-main') || []);
        const index = buttons.indexOf(main);
        if (event.key === 'ArrowUp') buttons[Math.max(0, index - 1)]?.focus();
        if (event.key === 'ArrowDown') buttons[Math.min(buttons.length - 1, index + 1)]?.focus();
        if (event.key === 'Home') buttons[0]?.focus();
        if (event.key === 'End') buttons[buttons.length - 1]?.focus();
        if (event.key === 'ArrowRight' && hasChildren) {
            if (!expanded) { tree.expandedIds.add(entry.id); rerender(); }
            else buttons[index + 1]?.focus();
        }
        if (event.key === 'ArrowLeft') {
            if (expanded) { tree.expandedIds.delete(entry.id); rerender(); }
            else buttons.find(button => button.dataset.id === entry.parentId)?.focus();
        }
    });
    main.innerHTML = `
        <span class="scene-manager-item__icon">${getSceneObjectIcon(entry)}</span>
        <span class="scene-manager-item__content">
            <span class="scene-manager-item__title">${escapeHtml(getEntryTitle(entry))}</span>
            <span class="scene-manager-item__meta">${escapeHtml(getEntryMeta(entry))}</span>
        </span>
        ${kind ? `<span class="scene-tree-kind">${escapeHtml(kind)}</span>` : ''}
    `;
    main.addEventListener('click', (event) => {
        tree.suppressInspectorJump = true;
        if (event.ctrlKey || event.metaKey) {
            callbacks.sceneManager?.toggleMultiSelect(entry.id);
        } else {
            callbacks.sceneManager?.select(entry.id);
        }
        rerender();
    });
    main.addEventListener('dblclick', () => {
        tree.suppressInspectorJump = true;
        callbacks.sceneManager?.focus(entry.id);
        rerender();
    });

    const actions = document.createElement('span');
    actions.className = 'scene-tree-actions';

    const focusBtn = document.createElement('button');
    focusBtn.type = 'button';
    focusBtn.className = 'scene-tree-action';
    focusBtn.innerHTML = FOCUS_ICON;
    focusBtn.title = 'Навести камеру на объект';
    focusBtn.setAttribute('aria-label', `Навести камеру: ${getEntryTitle(entry)}`);
    focusBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        tree.suppressInspectorJump = true;
        callbacks.sceneManager?.focus(entry.id);
        rerender();
    });
    actions.appendChild(focusBtn);

    if (!isProtectedEntry(entry)) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'scene-tree-action scene-tree-action--danger';
        deleteBtn.innerHTML = DELETE_ICON;
        deleteBtn.title = 'Удалить объект';
        deleteBtn.setAttribute('aria-label', `Удалить: ${getEntryTitle(entry)}`);
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            tree.suppressInspectorJump = true;
            callbacks.sceneManager?.remove(entry.id);
            rerender();
        });
        actions.appendChild(deleteBtn);
    }

    item.append(twisty, main, actions);
    return item;
}

export function renderObjectList(
    callbacks: UICallbacks,
    elements: SceneManagerDomRefs,
    objects: SceneManagerEntry[],
    selectedId: string | null,
    rerender: () => void,
    tree: SceneTreeState
) {
    if (!elements.listEl || !callbacks.sceneManager) return;

    const rows = buildVisibleRows(objects, tree);
    const selected = objects.filter(entry => entry.selected || entry.id === selectedId);
    const summary = document.getElementById('scene-selection-summary');
    if (summary) {
        const label = selected.length > 1 ? `Выбрано объектов: ${selected.length}`
            : selected.length === 1 ? getEntryTitle(selected[0]) : 'Выберите объект в списке или на сцене';
        if (summary.textContent !== label) summary.textContent = label;
        summary.closest('.scene-selection-bar')?.classList.toggle('has-selection', selected.length > 0);
    }
    if (elements.listCountEl) {
        const matchCount = objects.filter(entry => matchesQuery(entry, tree.query.trim().toLowerCase())).length;
        elements.listCountEl.textContent = tree.query.trim()
            ? `${matchCount} из ${objects.length}` : formatObjectCount(objects.length);
    }

    const focused = document.activeElement as HTMLElement | null;
    const focusedId = focused?.classList.contains('scene-tree-main') ? focused.dataset.id : null;
    const scrollTop = elements.listEl.scrollTop;
    elements.treeCollapseBtn?.toggleAttribute('disabled', !objects.some(entry => Number(entry.childCount) > 0));
    elements.listEl.innerHTML = '';
    if (!rows.length) {
        const empty = document.createElement('p');
        empty.className = 'scene-tree-empty';
        empty.textContent = tree.query.trim()
            ? 'Ничего не найдено. Измените запрос или очистите поиск.'
            : 'Сцена пуста. Добавьте объект или загрузите пресет.';
        elements.listEl.appendChild(empty);
        return;
    }

    for (const row of rows) {
        elements.listEl.appendChild(createRow(row, selectedId, callbacks, tree, rerender));
    }
    const buttons = Array.from(elements.listEl.querySelectorAll<HTMLButtonElement>('.scene-tree-main'));
    if (!buttons.some(button => button.tabIndex === 0) && buttons[0]) buttons[0].tabIndex = 0;
    if (focusedId) buttons.find(button => button.dataset.id === focusedId)?.focus({ preventScroll: true });
    elements.listEl.scrollTop = scrollTop;
}
