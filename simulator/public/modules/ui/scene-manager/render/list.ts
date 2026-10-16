import type { UICallbacks } from '../../index.js';
import type { SceneManagerDomRefs, SceneManagerEntry } from '../types.js';
import type { SceneTreeState } from '../view-state.js';
import { escapeHtml } from './format.js';
import { getSceneObjectIcon } from './icons.js';
import { tablerIcon } from '../../icons/tabler.js';
import {
    formatObjectCount,
    getEntryMeta,
    getEntryTitle,
    isGroundEntry,
    isGroupEntry,
    isPresetEntry,
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
    rerender: () => void,
    depthOffset = 0
): HTMLElement {
    const { entry, hasChildren, expanded } = row;
    const depth = Number(entry.depth || 0) + depthOffset;
    // entry.selected also covers Ctrl+click multi-selection (viewport or
    // list); selectedId alone only ever tracks the single "last" one.
    const isSelected = entry.selected || entry.id === selectedId;
    // Inline delete confirmation lives in the row itself; protected objects never get it.
    const isConfirming = tree.pendingDeleteId === entry.id && !isProtectedEntry(entry);

    const item = document.createElement('div');
    item.className = 'pk-row scene-tree-row' + (isSelected ? ' is-selected' : '');
    item.dataset.kind = entry.isDrone ? 'drone' : isGroundEntry(entry) ? 'ground' : isGroupEntry(entry) || isPresetEntry(entry) ? 'group' : 'prop';
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
        <span class="pk-row__icon">${getSceneObjectIcon(entry)}</span>
        <span class="pk-row__text">
            <span class="pk-row__name">${escapeHtml(getEntryTitle(entry))}</span>
            <span class="pk-row__meta">${isConfirming ? 'Удалить?' : escapeHtml(getEntryMeta(entry))}</span>
        </span>
    `;
    main.addEventListener('click', (event) => {
        tree.pendingDeleteId = null;
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
    focusBtn.className = 'pk-row__action scene-tree-action';
    focusBtn.innerHTML = FOCUS_ICON;
    focusBtn.title = 'Навести камеру на объект';
    focusBtn.setAttribute('aria-label', `Навести камеру: ${getEntryTitle(entry)}`);
    focusBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        tree.pendingDeleteId = null;
        tree.suppressInspectorJump = true;
        callbacks.sceneManager?.focus(entry.id);
        rerender();
    });

    const focusRowMain = () => {
        const buttons = item.parentElement?.querySelectorAll<HTMLButtonElement>('.scene-tree-main');
        Array.from(buttons || []).find(button => button.dataset.id === entry.id)?.focus({ preventScroll: true });
    };

    if (isConfirming) {
        actions.classList.add('is-confirming');
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'btn-secondary btn--sm btn--danger scene-tree-confirm';
        confirm.dataset.action = 'delete-confirm';
        confirm.textContent = 'Удалить';
        confirm.setAttribute('aria-label', `Удалить: ${getEntryTitle(entry)}`);
        confirm.addEventListener('click', (event) => {
            event.stopPropagation();
            tree.pendingDeleteId = null;
            tree.suppressInspectorJump = true;
            callbacks.sceneManager?.remove(entry.id);
            rerender();
        });
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn-secondary btn--sm scene-tree-confirm';
        cancel.dataset.action = 'delete-cancel';
        cancel.textContent = 'Отмена';
        cancel.addEventListener('click', (event) => {
            event.stopPropagation();
            tree.pendingDeleteId = null;
            rerender();
            focusRowMain();
        });
        actions.append(confirm, cancel);
        item.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault(); event.stopPropagation();
            tree.pendingDeleteId = null;
            rerender();
            focusRowMain();
        });
    } else {
        actions.appendChild(focusBtn);
        if (!isProtectedEntry(entry)) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'pk-row__action scene-tree-action scene-tree-action--danger';
            deleteBtn.innerHTML = DELETE_ICON;
            deleteBtn.title = 'Удалить объект';
            deleteBtn.setAttribute('aria-label', `Удалить: ${getEntryTitle(entry)}`);
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                tree.pendingDeleteId = entry.id;
                tree.suppressInspectorJump = true;
                rerender();
                // The question is on screen: put the keyboard on the safe answer.
                const list = document.getElementById('scene-object-list');
                const mains = Array.from(list?.querySelectorAll<HTMLElement>('.scene-tree-main') || []);
                const row = mains.find(button => button.dataset.id === entry.id)?.closest('.scene-tree-row');
                row?.querySelector<HTMLButtonElement>('[data-action="delete-cancel"]')?.focus({ preventScroll: true });
            });
            actions.appendChild(deleteBtn);
        } else {
            // Protected rows keep the Delete slot empty so every row's Focus button stays in the same place.
            const slot = document.createElement('span');
            slot.className = 'scene-tree-action-slot';
            slot.setAttribute('aria-hidden', 'true');
            actions.appendChild(slot);
        }
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
    if (tree.pendingDeleteId && !rows.some(row => row.entry.id === tree.pendingDeleteId)) tree.pendingDeleteId = null;
    const selected = objects.filter(entry => entry.selected || entry.id === selectedId);
    const summary = document.getElementById('scene-selection-summary');
    if (summary) {
        const label = selected.length > 1 ? `Выбрано объектов: ${selected.length}`
            : selected.length === 1 ? getEntryTitle(selected[0]) : 'Выберите объект в списке или на сцене';
        if (summary.textContent !== label) summary.textContent = label;
        summary.closest('.scene-selection-bar')?.classList.toggle('has-selection', selected.length > 0);
    }
    const tabCount = document.getElementById('scene-tab-inspector-count');
    if (tabCount) tabCount.textContent = selected.length ? String(selected.length) : '';
    if (elements.listCountEl) {
        const matchCount = objects.filter(entry => matchesQuery(entry, tree.query.trim().toLowerCase())).length;
        elements.listCountEl.textContent = tree.query.trim()
            ? `${matchCount} из ${objects.length}` : formatObjectCount(objects.length);
    }
    const hint = document.getElementById('scene-tree-hint');
    if (hint) {
        hint.innerHTML = selected.length === 0
            ? 'Выберите объект в списке или на сцене: откроются его свойства.'
            : 'Двойной щелчок — перейти к объекту. Несколько объектов — <span class="pk-kbd">Ctrl</span> + щелчок.';
    }

    const toolbar = document.querySelector<HTMLElement>('.scene-tree-toolbar');
    if (toolbar) toolbar.hidden = objects.length < 8 && !tree.query.trim();

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

    // Two groups: the fixed base of the field, and what the student placed. A row's children follow their parent.
    const base: VisibleRow[] = [];
    const mine: VisibleRow[] = [];
    let current = mine;
    for (const row of rows) {
        if (Number(row.entry.depth || 0) === 0) {
            current = row.entry.isDrone || row.entry.draggable === false ? base : mine;
        }
        current.push(row);
    }
    const listEl = elements.listEl;
    const filtering = !!tree.query.trim();
    const topLevel = (group: VisibleRow[]) => group.filter(row => Number(row.entry.depth || 0) === 0).length;

    // One add action, one weight: it carries the accent colour only while the student has placed nothing.
    const addButton = document.getElementById('scene-add-object-btn');
    const needsFirstObject = !mine.length && !filtering;
    addButton?.classList.toggle('btn-primary', needsFirstObject);
    addButton?.classList.toggle('btn-secondary', !needsFirstObject);

    // The tree: two folders, their rows one level deeper. A folder holding the selection (or a search hit) opens itself.
    const appendFolder = (name: string, group: VisibleRow[], isOpen: boolean, toggle: () => void, empty?: string) => {
        const folder = document.createElement('div');
        folder.className = 'scene-tree-folder';
        folder.setAttribute('role', 'treeitem');
        folder.setAttribute('aria-level', '1');
        folder.setAttribute('aria-expanded', String(isOpen));
        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'scene-tree-group' + (isOpen ? ' is-open' : '');
        head.innerHTML = `<span class="scene-tree-group__chevron" aria-hidden="true">${TWISTY_ICON}</span><span>${name}</span><small>${topLevel(group)}</small>`;
        head.addEventListener('click', toggle);
        folder.appendChild(head);
        listEl.appendChild(folder);
        if (!isOpen) return;
        if (!group.length && empty) {
            const note = document.createElement('p');
            note.className = 'scene-tree-invite';
            note.innerHTML = empty;
            listEl.appendChild(note);
        }
        for (const row of group) listEl.appendChild(createRow(row, selectedId, callbacks, tree, rerender, 1));
    };
    const holdsSelection = (group: VisibleRow[]) => group.some(row => row.entry.selected || row.entry.id === selectedId);

    if (base.length) {
        appendFolder('Основа полигона', base, filtering || tree.baseOpen || holdsSelection(base), () => {
            tree.baseOpen = !tree.baseOpen;
            rerender();
        });
    }
    if (mine.length || !filtering) {
        appendFolder('Ваши объекты', mine, filtering || tree.mineOpen || holdsSelection(mine), () => {
            tree.mineOpen = !tree.mineOpen;
            rerender();
        }, 'Пока пусто. Нажмите <strong>«Добавить»</strong> и расставьте ворота, пилон или флаг по полигону.');
    }
    const buttons = Array.from(elements.listEl.querySelectorAll<HTMLButtonElement>('.scene-tree-main'));
    if (!buttons.some(button => button.tabIndex === 0) && buttons[0]) buttons[0].tabIndex = 0;
    if (focusedId) buttons.find(button => button.dataset.id === focusedId)?.focus({ preventScroll: true });
    elements.listEl.scrollTop = scrollTop;
}
