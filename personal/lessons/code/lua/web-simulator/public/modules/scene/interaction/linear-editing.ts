import * as THREE from 'three';
import { updateSceneObjectPoints } from '../../environment/index.js';
import type { ScenePathPoint } from '../../environment/obstacles.js';
import { log } from '../../shared/logging/logger.js';
import { normalizePoints } from '../objects/object-catalog.js';
import { camera, raycaster, renderer, scene, selectedObject } from '../core/scene-init.js';
import { exitTransformMode } from './selection.js';
import { tablerIcon, type TablerIconName } from '../../ui/icons/tabler.js';

/*
 * Route laying for roads and railways, in two modes.
 *
 * Draw: click by click, like a polyline tool in a map editor. The segment
 * from the last point follows the cursor, snapped to 15° directions and
 * 0.5 m lengths (Shift - free), with the length / direction / turn next to
 * the cursor. Clicking the first point closes a ring. Picking a road or
 * railway in the hotbar starts here, with the first click as the start.
 *
 * Edit: an existing route shows a handle per point - drag it, drag a "+"
 * between two points to insert one, right-click a point to remove it;
 * "Продолжить" switches to drawing from the route's end.
 *
 * A train cannot take a hairpin, so rails limit the turn at each point and
 * the shortest segment; roads are more forgiving.
 *
 * Points are kept in world space while a session runs; an existing route
 * gets them back in its own local space.
 */

export type RouteKind = 'road' | 'rail';
type Mode = 'draw' | 'edit';

type Cursor = {
    point: THREE.Vector3;
    closing: boolean;
    length: number;
    heading: number;
    turn: number | null;
    problem: string | null;
    clientX: number;
    clientY: number;
};

type Handle = { kind: 'vertex' | 'mid'; index: number };

type Session = {
    mode: Mode;
    kind: RouteKind;
    /** null while a brand new route is being drawn - it is created on "Готово". */
    target: THREE.Object3D | null;
    create: ((points: THREE.Vector3[], closed: boolean) => void) | null;
    points: THREE.Vector3[];
    closed: boolean;
    original: { points: ScenePathPoint[]; closed: boolean } | null;
    cursor: Cursor | null;
    hover: Handle | null;
    drag: { index: number; moved: boolean } | null;
    free: boolean;
    preview: THREE.Group | null;
    hud: HTMLElement | null;
    label: HTMLElement | null;
    notice: string | null;
};

const RULES: Record<RouteKind, { title: string; minSegment: number; maxTurn: number; width: number; color: number }> = {
    road: { title: 'Дорога', minSegment: 1, maxTurn: 120, width: 3.6, color: 0x38bdf8 },
    rail: { title: 'Железнодорожные пути', minSegment: 3, maxTurn: 45, width: 2.3, color: 0xf59e0b }
};
const ANGLE_STEP = THREE.MathUtils.degToRad(15);
const LENGTH_STEP = 0.5;
const GRID_STEP = 0.5;
const HANDLE_PX = 13;
const CLOSE_PX = 18;
const HANDLE_SCREEN_SIZE = 0.012;

let session: Session | null = null;
let listenersReady = false;
let dragEndedAt = 0;

// ------------------------------------------------------------------ geometry

function isCanvasEvent(event: Event) {
    if (!renderer?.domElement) return false;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    return path.includes(renderer.domElement) || event.target === renderer.domElement;
}

function groundZ() {
    return session?.target ? session.target.getWorldPosition(new THREE.Vector3()).z : 0;
}

function groundAt(clientX: number, clientY: number): THREE.Vector3 | null {
    if (!renderer || !camera || !raycaster) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
    ), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -groundZ());
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
}

function toScreen(point: THREE.Vector3) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = point.clone().project(camera);
    return {
        x: rect.left + (ndc.x + 1) / 2 * rect.width,
        y: rect.top + (1 - ndc.y) / 2 * rect.height,
        visible: ndc.z > -1 && ndc.z < 1
    };
}

function snapToGrid(point: THREE.Vector3) {
    return new THREE.Vector3(
        Math.round(point.x / GRID_STEP) * GRID_STEP,
        Math.round(point.y / GRID_STEP) * GRID_STEP,
        point.z
    );
}

/** From `from` towards `raw`, on 15° directions and 0.5 m lengths. */
function snapFrom(from: THREE.Vector3, raw: THREE.Vector3) {
    const dx = raw.x - from.x;
    const dy = raw.y - from.y;
    const angle = Math.round(Math.atan2(dy, dx) / ANGLE_STEP) * ANGLE_STEP;
    const length = Math.round(Math.hypot(dx, dy) / LENGTH_STEP) * LENGTH_STEP;
    return new THREE.Vector3(from.x + Math.cos(angle) * length, from.y + Math.sin(angle) * length, raw.z);
}

function headingOf(from: THREE.Vector3, to: THREE.Vector3) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Signed turn in degrees at `b` when going a -> b -> c. */
function turnAt(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    let delta = headingOf(b, c) - headingOf(a, b);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return THREE.MathUtils.radToDeg(delta);
}

function problemFor(kind: RouteKind, length: number, turn: number | null) {
    const rules = RULES[kind];
    if (length < rules.minSegment) return `Слишком короткий участок: нужно от ${formatMetres(rules.minSegment)}`;
    if (turn !== null && Math.abs(turn) > rules.maxTurn + 0.01) {
        return kind === 'rail'
            ? `Поезд так не повернёт: не круче ${rules.maxTurn}° на точку`
            : `Слишком крутой поворот: не круче ${rules.maxTurn}°`;
    }
    return null;
}

function vertexProblem(s: Session, index: number) {
    const n = s.points.length;
    const prev = index > 0 ? index - 1 : (s.closed ? n - 1 : -1);
    const next = index < n - 1 ? index + 1 : (s.closed ? 0 : -1);
    if (prev < 0 || next < 0 || n < 3) return null;
    const turn = turnAt(s.points[prev], s.points[index], s.points[next]);
    return Math.abs(turn) > RULES[s.kind].maxTurn + 0.01;
}

function routeLength(points: THREE.Vector3[], closed: boolean) {
    const curve = curveOf(points, closed);
    return curve ? curve.getLength() : 0;
}

function curveOf(points: THREE.Vector3[], closed: boolean): THREE.Curve<THREE.Vector3> | null {
    if (points.length < 2) return null;
    if (points.length === 2) return new THREE.LineCurve3(points[0], points[1]);
    // Same curve the road/rail itself is built along (obstacles/linear.ts).
    return new THREE.CatmullRomCurve3(points, closed && points.length >= 3, 'catmullrom', 0.5);
}

function formatMetres(value: number) {
    return `${value.toFixed(value < 10 ? 1 : 0).replace('.', ',')} м`;
}

function formatPoints(count: number) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const word = mod10 === 1 && mod100 !== 11 ? 'точка'
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'точки' : 'точек';
    return `${count} ${word}`;
}

// ------------------------------------------------------------------ cursor

function computeCursor(clientX: number, clientY: number, free: boolean): Cursor | null {
    const s = session;
    if (!s || s.mode !== 'draw') return null;
    const raw = groundAt(clientX, clientY);
    if (!raw) return null;

    const last = s.points[s.points.length - 1];
    if (!last) {
        const point = free ? raw : snapToGrid(raw);
        return { point, closing: false, length: 0, heading: 0, turn: null, problem: null, clientX, clientY };
    }

    // Closing the ring: the first point wins whenever the cursor is on it.
    if (s.points.length >= 3 && !s.closed) {
        const first = toScreen(s.points[0]);
        if (first.visible && Math.hypot(first.x - clientX, first.y - clientY) <= CLOSE_PX) {
            const point = s.points[0].clone();
            const length = last.distanceTo(point);
            const prev = s.points[s.points.length - 2];
            const turn = turnAt(prev, last, point);
            return { point, closing: true, length, heading: headingOf(last, point), turn, problem: problemFor(s.kind, length, turn), clientX, clientY };
        }
    }

    const point = free ? raw : snapFrom(last, raw);
    const length = last.distanceTo(point);
    const prev = s.points[s.points.length - 2];
    const turn = prev ? turnAt(prev, last, point) : null;
    return { point, closing: false, length, heading: headingOf(last, point), turn, problem: problemFor(s.kind, length, turn), clientX, clientY };
}

function pickHandle(clientX: number, clientY: number): Handle | null {
    const s = session;
    if (!s) return null;
    let best: Handle | null = null;
    let bestDistance = HANDLE_PX;
    s.points.forEach((point, index) => {
        const screen = toScreen(point);
        const distance = Math.hypot(screen.x - clientX, screen.y - clientY);
        if (screen.visible && distance <= bestDistance) {
            best = { kind: 'vertex', index };
            bestDistance = distance;
        }
    });
    if (best || s.mode !== 'edit') return best;
    midpoints(s).forEach((point, index) => {
        const screen = toScreen(point);
        const distance = Math.hypot(screen.x - clientX, screen.y - clientY);
        if (screen.visible && distance <= bestDistance) {
            best = { kind: 'mid', index };
            bestDistance = distance;
        }
    });
    return best;
}

/** A point on the curve half-way between point i and the next one. */
function midpoints(s: Session) {
    const curve = curveOf(s.points, s.closed);
    if (!curve) return [];
    const spans = s.closed && s.points.length >= 3 ? s.points.length : s.points.length - 1;
    return Array.from({ length: spans }, (_, i) => curve.getPoint((i + 0.5) / spans));
}

// ------------------------------------------------------------------ preview

function disposeGroup(group: THREE.Group | null) {
    if (!group) return;
    group.removeFromParent();
    group.traverse((node: any) => {
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        materials.forEach((material: THREE.Material) => material.dispose());
    });
}

function overlayMaterial(color: number, opacity: number) {
    return new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide
    });
}

function buildRibbon(curve: THREE.Curve<THREE.Vector3>, width: number, closed: boolean, material: THREE.Material) {
    const count = Math.max(16, Math.ceil(curve.getLength() * 3));
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= count; i++) {
        const t = closed && i === count ? 0 : i / count;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        for (const side of [-1, 1]) {
            const v = p.clone().addScaledVector(normal, side * width / 2);
            vertices.push(v.x, v.y, v.z + 0.08);
        }
        if (i < count) {
            const n = i * 2;
            indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    return new THREE.Mesh(geometry, material);
}

/** A flat disc that keeps the same size on screen at any zoom. */
function buildDisc(position: THREE.Vector3, fill: number, ring: number, scale: number) {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CircleGeometry(1, 28), overlayMaterial(ring, 1));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), overlayMaterial(fill, 1));
    inner.position.z = 0.001;
    group.add(outer, inner);
    group.position.copy(position).setZ(position.z + 0.1);
    const keepScreenSize = (_r: unknown, _s: unknown, cam: THREE.Camera) => {
        const size = cam.position.distanceTo(group.position) * HANDLE_SCREEN_SIZE * scale;
        group.scale.setScalar(Math.max(0.05, size));
        group.updateMatrixWorld(true);
    };
    outer.onBeforeRender = keepScreenSize as any;
    return group;
}

function refreshPreview() {
    const s = session;
    if (!s) return;
    disposeGroup(s.preview);
    s.preview = null;
    if (!scene) return;

    const group = new THREE.Group();
    group.name = '__route_drawing_preview__';
    const rules = RULES[s.kind];
    const invalid = !!s.cursor?.problem;

    const shown = s.points.map((p) => p.clone());
    const withCursor = s.mode === 'draw' && s.cursor && !s.cursor.closing ? [...shown, s.cursor.point.clone()] : shown;
    const closed = s.closed || !!s.cursor?.closing;
    const curve = curveOf(withCursor, closed);
    // An existing route is already drawn by the scene itself - only show the
    // ribbon for what is not built yet (a new route, a drag, the rubber band).
    const showRibbon = !s.target || s.drag || s.mode === 'draw';
    if (curve && showRibbon) {
        group.add(buildRibbon(curve, rules.width, closed, overlayMaterial(invalid ? 0xef4444 : rules.color, 0.3)));
    }
    if (curve) {
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(Math.max(32, Math.ceil(curve.getLength() * 2))).map((p) => p.setZ(p.z + 0.12))),
            new THREE.LineBasicMaterial({ color: invalid ? 0xef4444 : rules.color, transparent: true, opacity: 0.95, depthTest: false })
        );
        group.add(line);
    }

    if (s.mode === 'edit') {
        midpoints(s).forEach((point, index) => {
            const hovered = s.hover?.kind === 'mid' && s.hover.index === index;
            group.add(buildDisc(point, rules.color, 0xffffff, hovered ? 0.95 : 0.6));
        });
    }
    s.points.forEach((point, index) => {
        const hovered = s.hover?.kind === 'vertex' && s.hover.index === index;
        const dragged = s.drag?.index === index;
        const bad = vertexProblem(s, index);
        const first = index === 0 && s.mode === 'draw' && s.points.length >= 3 && !s.closed;
        const fill = bad ? 0xef4444 : first ? 0x22c55e : 0xffffff;
        const ring = bad ? 0x7f1d1d : first || index === 0 ? 0x15803d : 0x1f2937;
        group.add(buildDisc(point, fill, ring, hovered || dragged ? 1.35 : first && s.cursor?.closing ? 1.6 : 1));
    });
    if (s.mode === 'draw' && s.cursor && !s.cursor.closing) {
        group.add(buildDisc(s.cursor.point, invalid ? 0xef4444 : 0xff6b00, 0xffffff, 0.8));
    }

    group.traverse((node) => { node.renderOrder = 9800; });
    scene.add(group);
    s.preview = group;
}

// ------------------------------------------------------------------ HUD

function escapeHtml(text: string) {
    return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function icon(name: TablerIconName) {
    return tablerIcon(name).replace('width="24" height="24"', 'width="16" height="16"');
}

function hudHost() {
    return document.getElementById('scene-hotbar')?.parentElement ?? renderer?.domElement?.parentElement ?? document.body;
}

function hintText(s: Session) {
    if (s.notice) return s.notice;
    if (s.mode === 'edit') {
        return 'Тяните точки, чтобы изменить маршрут. «+» между точками добавляет новую, ПКМ по точке — удаляет.';
    }
    if (s.points.length === 0) return 'Кликните в сцене — здесь начнётся маршрут.';
    const base = 'Кликайте, чтобы добавить точки: направление шагом 15°, длина — 0,5 м.';
    return s.points.length >= 3 ? `${base} Клик по первой точке замкнёт кольцо.` : base;
}

function renderHud() {
    const s = session;
    if (!s) return;
    if (!s.hud) {
        s.hud = document.createElement('div');
        s.hud.className = 'route-hud';
        s.hud.setAttribute('role', 'toolbar');
        s.hud.addEventListener('click', onHudClick);
        s.hud.addEventListener('pointerdown', (event) => event.stopPropagation());
        hudHost().appendChild(s.hud);
    }
    const rules = RULES[s.kind];
    const minPoints = s.target ? 2 : 1;
    const canUndo = s.mode === 'draw' && s.points.length > minPoints;
    const canLoop = s.points.length >= 3;
    const canFinish = s.points.length >= 2;
    const railNote = s.kind === 'rail'
        ? `<p class="route-hud__rule">Поезду нужны плавные повороты: не круче ${rules.maxTurn}° на точку, участки от ${formatMetres(rules.minSegment)}.</p>`
        : '';
    s.hud.innerHTML = `
        <div class="route-hud__head">
            <span class="route-hud__icon route-hud__icon--${s.kind}" aria-hidden="true">${icon(s.kind === 'rail' ? 'track' : 'road')}</span>
            <div class="route-hud__titles">
                <strong>${escapeHtml(rules.title)}</strong>
                <span class="route-hud__stats" data-route-stats></span>
            </div>
            <span class="route-hud__mode">${s.mode === 'draw' ? 'Прокладка' : 'Правка'}</span>
        </div>
        <p class="route-hud__hint${s.notice ? ' is-warning' : ''}" aria-live="polite">${escapeHtml(hintText(s))}</p>
        ${railNote}
        <div class="route-hud__actions">
            ${s.mode === 'draw'
                ? `<button type="button" class="route-hud__btn" data-route-action="undo" ${canUndo ? '' : 'disabled'}>${icon('arrow-back-up')}<span>Убрать точку</span></button>`
                : `<button type="button" class="route-hud__btn" data-route-action="continue" ${s.closed ? 'disabled title="Кольцо уже замкнуто"' : ''}>${icon('player-track-next')}<span>Продолжить</span></button>`}
            <button type="button" class="route-hud__btn" data-route-action="loop" aria-pressed="${s.closed}" ${canLoop ? '' : 'disabled title="Нужно минимум 3 точки"'}>${icon('repeat')}<span>${s.closed ? 'Разомкнуть' : 'Замкнуть'}</span></button>
            <span class="route-hud__spacer"></span>
            <button type="button" class="route-hud__btn route-hud__btn--ghost" data-route-action="cancel">${icon('x')}<span>Отмена</span></button>
            <button type="button" class="route-hud__btn route-hud__btn--primary" data-route-action="done" ${canFinish ? '' : 'disabled'}>${icon('check')}<span>Готово</span></button>
        </div>
        <p class="route-hud__keys"><kbd>Shift</kbd> без привязки · <kbd>Backspace</kbd> убрать точку · <kbd>Enter</kbd> или двойной клик — готово · <kbd>Esc</kbd> — отмена</p>
    `;
    renderStats();
}

function renderStats() {
    const s = session;
    const el = s?.hud?.querySelector('[data-route-stats]');
    if (!s || !el) return;
    const drawing = s.mode === 'draw' && s.cursor && !s.cursor.problem && !s.cursor.closing
        ? [...s.points, s.cursor.point] : s.points;
    const parts = [formatPoints(s.points.length), formatMetres(routeLength(drawing, s.closed || !!s.cursor?.closing))];
    if (s.closed) parts.push('кольцо');
    el.textContent = parts.join(' · ');
}

function renderLabel() {
    const s = session;
    if (!s) return;
    const c = s.cursor;
    const drag = s.drag;
    if (!c && !drag) {
        s.label?.remove();
        s.label = null;
        return;
    }
    if (!s.label) {
        s.label = document.createElement('div');
        s.label.className = 'route-label';
        document.body.appendChild(s.label);
    }

    let x = 0;
    let y = 0;
    let html = '';
    if (drag) {
        const point = s.points[drag.index];
        const screen = toScreen(point);
        x = screen.x;
        y = screen.y;
        const prev = s.points[drag.index - 1] ?? (s.closed ? s.points[s.points.length - 1] : null);
        const next = s.points[drag.index + 1] ?? (s.closed ? s.points[0] : null);
        const lengths = [prev, next].filter(Boolean).map((p) => formatMetres(p!.distanceTo(point)));
        html = `<b>${lengths.join(' / ')}</b>`;
        if (vertexProblem(s, drag.index)) html += `<span class="route-label__problem">Поворот круче ${RULES[s.kind].maxTurn}°</span>`;
    } else if (c) {
        x = c.clientX;
        y = c.clientY;
        if (s.points.length === 0) {
            html = '<b>Начало маршрута</b>';
        } else {
            const deg = Math.round((THREE.MathUtils.radToDeg(c.heading) + 360) % 360);
            html = `<b>${formatMetres(c.length)}</b> · ${deg}°`;
            if (c.turn !== null) html += `<span>поворот ${Math.round(Math.abs(c.turn))}°${Math.abs(c.turn) >= 1 ? (c.turn > 0 ? ' влево' : ' вправо') : ''}</span>`;
            if (c.closing) html += '<span class="route-label__ok">Клик — замкнуть кольцо</span>';
            if (c.problem && c.length > 0.05) html += `<span class="route-label__problem">${escapeHtml(c.problem)}</span>`;
        }
    }
    s.label.classList.toggle('is-invalid', !!(c?.problem && c.length > 0.05 && !drag));
    s.label.innerHTML = html;
    s.label.style.transform = `translate(${Math.round(x + 16)}px, ${Math.round(y + 16)}px)`;
}

function setNotice(text: string | null) {
    const s = session;
    if (!s) return;
    s.notice = text;
    const hint = s.hud?.querySelector('.route-hud__hint');
    if (hint) {
        hint.textContent = hintText(s);
        hint.classList.toggle('is-warning', !!text);
    }
}

function updateCanvasCursor() {
    const s = session;
    if (!renderer?.domElement) return;
    renderer.domElement.style.cursor = !s ? ''
        : s.drag ? 'grabbing'
            : s.hover ? 'grab'
                : s.mode === 'draw' ? 'crosshair' : '';
}

// ------------------------------------------------------------------ actions

function syncTarget() {
    const s = session;
    if (!s?.target) return;
    s.target.updateMatrixWorld(true);
    const local = s.points.map((p) => {
        const v = s.target!.worldToLocal(p.clone());
        return { x: v.x, y: v.y, z: v.z };
    });
    s.target.userData.closed = s.closed && s.points.length >= 3;
    updateSceneObjectPoints(s.target, local);
    (window as any).updateSceneManager?.();
}

function addPointFromCursor(clientX: number, clientY: number, free: boolean) {
    const s = session;
    if (!s || s.mode !== 'draw') return;
    const c = computeCursor(clientX, clientY, free);
    if (!c) return;
    if (c.problem) {
        // A second click on the same spot (a double-click) is not a mistake.
        if (c.length > 0.05) setNotice(c.problem);
        return;
    }
    if (c.closing) {
        s.closed = true;
        finishLinearFeatureEditing(true);
        return;
    }
    s.points.push(c.point);
    s.notice = null;
    if (s.target) syncTarget();
    s.cursor = computeCursor(clientX, clientY, free);
    renderHud();
    renderLabel();
    refreshPreview();
}

function undoPoint() {
    const s = session;
    if (!s || s.mode !== 'draw') return;
    if (s.points.length <= (s.target ? 2 : 1)) {
        if (!s.target) finishLinearFeatureEditing(false);
        return;
    }
    s.points.pop();
    s.closed = false;
    if (s.target) syncTarget();
    s.notice = null;
    if (s.cursor) s.cursor = computeCursor(s.cursor.clientX, s.cursor.clientY, s.free);
    renderHud();
    renderLabel();
    refreshPreview();
}

function removeVertex(index: number) {
    const s = session;
    if (!s) return;
    if (s.points.length <= 2) {
        setNotice('У маршрута должно остаться минимум 2 точки');
        return;
    }
    s.points.splice(index, 1);
    if (s.points.length < 3) s.closed = false;
    s.hover = null;
    s.notice = null;
    syncTarget();
    renderHud();
    refreshPreview();
    updateCanvasCursor();
}

function toggleLoop() {
    const s = session;
    if (!s || s.points.length < 3) return;
    if (s.mode === 'draw' && !s.closed) {
        s.closed = true;
        finishLinearFeatureEditing(true);
        return;
    }
    s.closed = !s.closed;
    syncTarget();
    renderHud();
    refreshPreview();
}

function continueFromEnd() {
    const s = session;
    if (!s || s.mode !== 'edit' || s.closed) return;
    s.mode = 'draw';
    s.hover = null;
    s.notice = null;
    renderHud();
    refreshPreview();
    updateCanvasCursor();
}

function onHudClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-route-action]');
    if (!button || button.disabled) return;
    switch (button.dataset.routeAction) {
        case 'undo': undoPoint(); break;
        case 'loop': toggleLoop(); break;
        case 'continue': continueFromEnd(); break;
        case 'cancel': finishLinearFeatureEditing(false); break;
        case 'done': finishLinearFeatureEditing(true); break;
    }
}

// ------------------------------------------------------------------ pointer

/** While drawing, the first point is where a click closes the ring - not a drag handle. */
function closesRing(s: Session, handle: Handle) {
    return s.mode === 'draw' && handle.kind === 'vertex' && handle.index === 0 && s.points.length >= 3 && !s.closed;
}

function onPointerDown(event: PointerEvent) {
    const s = session;
    if (!s || event.button !== 0 || !isCanvasEvent(event)) return;
    const handle = pickHandle(event.clientX, event.clientY);
    if (!handle || closesRing(s, handle)) return;
    // Keep the camera from starting an orbit drag under the handle.
    event.stopPropagation();
    event.preventDefault();
    let index = handle.index;
    if (handle.kind === 'mid') {
        index = handle.index + 1;
        s.points.splice(index, 0, midpoints(s)[handle.index]);
    }
    s.drag = { index, moved: handle.kind === 'mid' };
    s.hover = { kind: 'vertex', index };
    s.cursor = null;
    if (s.target) s.target.visible = false;
    updateCanvasCursor();
    refreshPreview();
    renderLabel();
}

function onPointerMove(event: PointerEvent) {
    const s = session;
    if (!s) return;
    s.free = event.shiftKey;

    if (s.drag) {
        const raw = groundAt(event.clientX, event.clientY);
        if (!raw) return;
        s.points[s.drag.index] = event.shiftKey ? raw : snapToGrid(raw);
        s.drag.moved = true;
        refreshPreview();
        renderLabel();
        renderStats();
        return;
    }

    if (!isCanvasEvent(event)) {
        if (s.cursor || s.hover) {
            s.cursor = null;
            s.hover = null;
            renderLabel();
            refreshPreview();
            updateCanvasCursor();
        }
        return;
    }

    const handle = pickHandle(event.clientX, event.clientY);
    s.hover = handle && !closesRing(s, handle) ? handle : null;
    s.cursor = s.hover ? null : computeCursor(event.clientX, event.clientY, event.shiftKey);
    updateCanvasCursor();
    renderLabel();
    renderStats();
    refreshPreview();
}

function onPointerUp(event: PointerEvent) {
    const s = session;
    if (!s?.drag) return;
    event.stopPropagation();
    const moved = s.drag.moved;
    s.drag = null;
    dragEndedAt = performance.now();
    if (s.target) s.target.visible = true;
    if (moved) syncTarget();
    renderHud();
    renderLabel();
    refreshPreview();
    updateCanvasCursor();
}

function onDoubleClick(event: MouseEvent) {
    if (!session || session.mode !== 'draw' || !isCanvasEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    finishLinearFeatureEditing(true);
}

function ensureListeners() {
    if (listenersReady) return;
    listenersReady = true;
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('dblclick', onDoubleClick, true);
}

// ------------------------------------------------------------------ session

function begin(next: Session) {
    if (session) finishLinearFeatureEditing(true);
    exitTransformMode();
    ensureListeners();
    session = next;
    document.body.classList.add('is-route-drawing');
    renderHud();
    refreshPreview();
    updateCanvasCursor();
    (window as any).updateSceneManager?.();
}

function teardown() {
    const s = session;
    if (!s) return;
    disposeGroup(s.preview);
    s.hud?.remove();
    s.label?.remove();
    if (s.target) s.target.visible = true;
    session = null;
    document.body.classList.remove('is-route-drawing');
    updateCanvasCursor();
    (window as any).updateSceneManager?.();
}

/**
 * Draw a brand new road or railway. `create` receives the finished points
 * (world space) and whether it is a ring; nothing is added on "Отмена".
 */
export function startRouteDrawing(kind: RouteKind, options: {
    start?: THREE.Vector3 | null;
    create: (points: THREE.Vector3[], closed: boolean) => void;
}) {
    begin({
        mode: 'draw', kind, target: null, create: options.create,
        points: options.start ? [snapToGrid(options.start)] : [],
        closed: false, original: null, cursor: null, hover: null, drag: null, free: false,
        preview: null, hud: null, label: null, notice: null
    });
    return true;
}

export function isLinearFeatureEditingActive(objectId?: string) {
    if (!session) return false;
    return !objectId || session.target?.uuid === objectId;
}

export function getLinearFeatureEditingTargetId() {
    return session?.target?.uuid || null;
}

/** Edit an existing road/railway: drag, insert and remove its points. */
export function startLinearFeatureEditing(target = selectedObject) {
    if (!target?.userData?.supportsPoints) {
        log('Визуальная прокладка доступна только для дороги или рельс', 'warn');
        return false;
    }
    const points = normalizePoints(target.userData?.points);
    if (points.length < 2) {
        log('Для визуальной прокладки нужно минимум 2 точки у объекта', 'warn');
        return false;
    }
    if (session?.target?.uuid === target.uuid) return true;

    target.updateMatrixWorld(true);
    begin({
        mode: 'edit',
        kind: target.userData.featureKind === 'rail' ? 'rail' : 'road',
        target,
        create: null,
        points: points.map((p) => target.localToWorld(new THREE.Vector3(p.x, p.y, p.z ?? 0))),
        closed: !!target.userData.closed,
        original: { points: points.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })), closed: !!target.userData.closed },
        cursor: null, hover: null, drag: null, free: false,
        preview: null, hud: null, label: null, notice: null
    });
    return true;
}

export function finishLinearFeatureEditing(commit = true) {
    const s = session;
    if (!s) return false;

    if (s.target) {
        if (commit) {
            syncTarget();
            log('Маршрут обновлён', 'success');
        } else if (s.original) {
            s.target.userData.closed = s.original.closed;
            updateSceneObjectPoints(s.target, s.original.points);
            log('Изменения маршрута отменены', 'info');
        }
        teardown();
        return true;
    }

    const points = s.points.map((p) => p.clone());
    const closed = s.closed && points.length >= 3;
    const create = s.create;
    teardown();
    if (commit && points.length >= 2) {
        create?.(points, closed);
    } else if (commit) {
        log('Маршрут не создан: нужно минимум 2 точки', 'warn');
    }
    return true;
}

/** Hover is handled by this module's own listeners; kept for scene-events. */
export function handleLinearEditingPointerMove(_event: PointerEvent) {
    return !!session;
}

/** A click (not a drag) in the scene, routed here by interaction/input.ts. */
export function handleLinearEditingPointerUp(event: PointerEvent) {
    const s = session;
    if (!s) return false;
    if (s.drag || performance.now() - dragEndedAt < 120) return true;

    if (event.button === 2) {
        const handle = pickHandle(event.clientX, event.clientY);
        if (handle?.kind === 'vertex' && s.mode === 'edit') removeVertex(handle.index);
        else if (s.mode === 'draw') finishLinearFeatureEditing(true);
        return true;
    }
    if (event.button === 0 && s.mode === 'draw') addPointFromCursor(event.clientX, event.clientY, event.shiftKey);
    return true;
}

export function handleLinearEditingKeyDown(event: KeyboardEvent) {
    const s = session;
    if (!s) return false;

    if (event.key === 'Enter') {
        event.preventDefault();
        finishLinearFeatureEditing(true);
        return true;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        finishLinearFeatureEditing(false);
        return true;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        if (s.mode === 'draw') undoPoint();
        else if (s.hover?.kind === 'vertex') removeVertex(s.hover.index);
        return true;
    }
    return false;
}
