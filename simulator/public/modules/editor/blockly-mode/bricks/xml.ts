import * as Blockly from 'blockly';
import { BRICKS_TYPE_PREFIX, bricksType, nativeBricksType } from './constants.js';
import { applyBricksDroneOnly } from './drone-only.js';
import { allBricksNativeTypes } from './block-specs.js';

/*
 * Проекты Pioneer Bricks - Blockly XML с одним добавочным элементом <project name="..."/> в корне
 * (см. make_projects.py сборника). Blockly этот элемент не знает, поэтому при открытии он
 * вынимается, а при сохранении добавляется обратно первым.
 */

export type BricksProject = { name: string | null; dom: Element };

/** Заменяет типы блоков Bricks в XML: родные имена файла <-> внутренние имена редактора (с префиксом). */
function renameBlockTypes(root: Element, rename: (type: string) => string): void {
    for (const tag of ['block', 'shadow']) {
        for (const element of Array.from(root.getElementsByTagName(tag))) {
            const type = element.getAttribute('type');
            if (type) element.setAttribute('type', rename(type));
        }
    }
}

const nativeTypes = new Set(allBricksNativeTypes());

const toEditorType = (type: string): string => (nativeTypes.has(type) ? bricksType(type) : type);
const toFileType = (type: string): string => (type.startsWith(BRICKS_TYPE_PREFIX) && nativeTypes.has(nativeBricksType(type)) ? nativeBricksType(type) : type);

export function parseBricksProject(xml: string): BricksProject {
    const root = Blockly.utils.xml.textToDom(xml);
    let name: string | null = null;
    for (const child of Array.from(root.childNodes)) {
        if (child.nodeName.toLowerCase() === 'project') {
            name = (child as Element).getAttribute('name');
            root.removeChild(child);
        }
    }
    renameBlockTypes(root, toEditorType);
    return { name, dom: root };
}

/** Загружает проект Bricks в workspace (прежние блоки удаляются). Возвращает имя проекта. */
export function loadBricksProject(xml: string, workspace: Blockly.Workspace): string | null {
    const { name, dom } = parseBricksProject(xml);
    workspace.clear();
    Blockly.Xml.domToWorkspace(dom, workspace);
    applyBricksDroneOnly(workspace);
    return name;
}

/** Сохраняет workspace в формате проекта Bricks: <xml><project name="…"/>…</xml>. */
export function serializeBricksProject(workspace: Blockly.Workspace, name: string): string {
    const dom = Blockly.Xml.workspaceToDom(workspace);
    renameBlockTypes(dom, toFileType);
    const project = Blockly.utils.xml.createElement('project');
    project.setAttribute('name', name);
    dom.insertBefore(project, dom.firstChild);
    return Blockly.Xml.domToText(dom);
}

/** Имя файла проекта: латиница, цифры и подчёркивание, как у проектов на дроне. */
export function bricksProjectFileName(name: string | null | undefined): string {
    const clean = String(name ?? '').trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
    return clean || 'bricks_project';
}
