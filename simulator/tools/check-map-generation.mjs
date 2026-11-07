import { registerHooks } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

/*
 * Аудит генерации карт без браузера и без jest: node tools/check-map-generation.mjs [--seeds=30] [--json=путь] [--baseline] [--root=путь]
 * Перебирает seed x профили, считает нарушения плана (G2), размещения (G3), разнообразие и детерминизм (G6), время генерации.
 * Код возврата 1, если нашлось хоть одно нарушение. Те же проверки гоняет tests/map-generation-audit.test.ts.
 */
registerHooks({
    resolve(specifier, context, next) {
        if (specifier.startsWith('.') && specifier.endsWith('.js') && (context.parentURL?.includes('/public/modules/') || context.parentURL?.includes('/tests/'))) {
            const source = new URL(specifier.replace(/\.js$/, '.ts'), context.parentURL);
            if (existsSync(source)) return next(source.href, context);
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
        return next(url, context);
    }
});
const arg = (name, fallback) => (process.argv.find(a => a.startsWith(`--${name}=`)) ?? '').split('=')[1] ?? fallback;
const SEEDS = Number(arg('seeds', 30)), jsonPath = arg('json', ''), onlyProfile = arg('profile', '');
const root = arg('root', '');
// --root=<дерево с public/modules>: сгенерировать планы кодом из другого дерева (для сравнения до/после), проверять текущими правилами.
const { generateTrainingLayout } = await import(root ? (await import('node:url')).pathToFileURL(root + '/public/modules/environment/training/layout.ts').href : '../public/modules/environment/training/layout.ts');
const audit = await import('../tests/helpers/map-audit.ts');
const PROFILES = onlyProfile ? [onlyProfile] : ['city', 'urban', 'mixed', 'forest', 'industrial', 'hills'];
const totals = {}, examples = {}, rows = [], prints = new Map();
let genMs = 0, maps = 0;
for (const profile of PROFILES) for (let seed = 1; seed <= SEEDS; seed++) {
    const t = performance.now(); const layout = generateTrainingLayout({ profile, seed }); genMs += performance.now() - t; maps++;
    const v = process.argv.includes('--baseline') ? { ...audit.roadViolations(layout), ...audit.decalViolations(layout, false), ...audit.placementViolations(layout) } : audit.all(layout);
    for (const [k, list] of Object.entries(v)) { totals[k] = (totals[k] ?? 0) + list.length; if (list.length && (examples[k] ??= []).length < 3) examples[k].push(`${profile}#${seed}: ${list.slice(0, 2).join('; ')}`); }
    const fp = audit.fingerprint(layout); prints.set(`${profile}`, [...(prints.get(profile) ?? []), fp]);
    rows.push({ profile, seed, ms: Math.round(performance.now() - t), objects: layout.objects.length, roads: fp.roads });
}
// Детерминизм: один seed -> одинаковый JSON
let nondeterministic = 0;
for (const profile of PROFILES) for (const seed of [1, 7, 19]) {
    if (JSON.stringify(generateTrainingLayout({ profile, seed })) !== JSON.stringify(generateTrainingLayout({ profile, seed }))) nondeterministic++;
}
// Разнообразие: доля уникальных топологий внутри профиля
const variety = {};
for (const [profile, list] of prints) {
    const sig = new Set(list.map(f => f.topology + '|' + f.roadLength + '|' + f.homes));
    const roads = list.map(f => f.roads), mean = roads.reduce((a, b) => a + b, 0) / roads.length;
    variety[profile] = { unique: sig.size, of: list.length, roadsMin: Math.min(...roads), roadsMax: Math.max(...roads), roadsStd: +Math.sqrt(roads.reduce((s, r) => s + (r - mean) ** 2, 0) / roads.length).toFixed(1), kinds: [...new Set(list.map(f => f.kinds))].length };
}
const bad = Object.values(totals).reduce((a, b) => a + b, 0) + nondeterministic;
const report = { maps, seeds: SEEDS, profiles: PROFILES, meanGenerationMs: Math.round(genMs / maps), totals, examples, nondeterministic, variety };
console.log(JSON.stringify(report, null, 2));
if (jsonPath) writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
process.exit(bad ? 1 : 0);
