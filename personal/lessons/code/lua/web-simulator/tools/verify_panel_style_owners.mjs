import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const root = path.resolve('public');
const entry = path.join(root, 'style.css');
const reachable = new Set();
const imports = [];
function visit(file) {
    if (reachable.has(file)) return;
    reachable.add(file);
    const sheet = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
    sheet.walkAtRules('import', rule => {
        const match = rule.params.match(/(?:url\(\s*)?['"]([^'"]+)['"]/);
        if (!match || /^https?:/.test(match[1])) return;
        const target = match[1].startsWith('/') ? path.join(root, match[1].slice(1)) : path.resolve(path.dirname(file), match[1]);
        if (!fs.existsSync(target)) throw new Error(`Missing stylesheet: ${target}, imported by ${file}`);
        imports.push({ source: path.relative(root, file), target: path.relative(root, target) });
        visit(target);
    });
}
visit(entry);
const guideSheet = path.join(root, 'styles/panels/guide-panel.css');
postcss.parse(fs.readFileSync(guideSheet, 'utf8'), { from: guideSheet }).walkRules(rule => {
    if (/(?:#gamepad-panel\b|\.(?:gamepad|gp|cm)-|#channel-monitor-panel\b)/.test(rule.selector)) {
        throw new Error(`Controller selector belongs in styles/gamepad, not guide-panel.css: ${rule.selector}`);
    }
});
// Retired textbook layer stack and theme overrides must never be imported again.
const forbiddenLayers = [
    'styles/core/theme/dark-foundation/scene-manager.css',
    'styles/panels/journal-academy.css',
    'styles/panels/guide-panel/course-shell.css',
    'styles/panels/guide-panel/flight-workbook.css',
    'styles/panels/guide-panel/lesson-polish.css',
    'styles/core/theme/dark-panels.css'
];
for (const layer of forbiddenLayers) {
    if (reachable.has(path.join(root, layer))) throw new Error(`Retired theme override is loaded: ${layer}`);
}

const owners = new Set([
    'editor/layout.css', 'editor/toolbar.css', 'editor/drawers.css', 'editor/reference.css', 'editor/blockly-shell.css',
    'manager-panel/controls.css', 'manager-panel/panel.css', 'manager-panel/catalog.css'
]);
const stale = [];
function list(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
        const file = path.join(directory, item.name);
        return item.isDirectory() ? list(file) : [file];
    });
}
const scene = path.join(root, 'styles/scene');
for (const file of [...list(path.join(scene, 'editor')), ...list(path.join(scene, 'manager-panel'))]) {
    if (!file.endsWith('.css')) continue;
    postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
    const name = path.relative(scene, file).replaceAll(path.sep, '/');
    if (owners.has(name)) {
        if (!reachable.has(file)) throw new Error(`Canonical owner is not loaded: ${name}`);
    } else {
        if (reachable.has(file)) throw new Error(`Legacy override is still loaded: ${name}`);
        stale.push(path.relative(process.cwd(), file).replaceAll(path.sep, '/'));
    }
}

const sourceReferences = [];
for (const file of list(root)) {
    if (!/\.(?:ts|js|html|mjs)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8').replaceAll('\\', '/');
    for (const target of stale) {
        const publicPath = target.replace(/^public\//, '/');
        if (text.includes(publicPath) || text.includes(target)) sourceReferences.push({ source: path.relative(process.cwd(), file), target });
    }
}
if (sourceReferences.length) throw new Error(`Runtime references remain: ${JSON.stringify(sourceReferences)}`);
const report = { reachableStylesheets: reachable.size, canonicalOwners: [...owners], forbiddenLayers, unusedLegacyFiles: stale, runtimeReferencesToLegacy: sourceReferences, imports };
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/panel-style-ownership-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ reachableStylesheets: reachable.size, canonicalOwners: owners.size, unusedLegacyFiles: stale.length, runtimeReferencesToLegacy: sourceReferences.length }));
