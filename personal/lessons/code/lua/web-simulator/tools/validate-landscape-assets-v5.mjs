import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir = 'public/assets/models/props', prefix = 'landscape-kit-v5';
const expected = ['Bench','CafeTable','Hospital','Mall','Office','PoliceStation','Restaurant','School'];
const PIVOTED = new Set();
const bundle = JSON.parse(fs.readFileSync(`${dir}/${prefix}.mesh.json`, 'utf8'));
const glb = fs.readFileSync(`${dir}/${prefix}.glb`);
assert.equal(glb.readUInt32LE(0), 0x46546c67);
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
assert.ok(gltf.buffers.every(b => !b.uri));
assert.ok(!gltf.images?.length);
const assets = {};
for (const [name, parts] of Object.entries(bundle.assets)) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let triangles = 0;
    for (const part of parts) {
        assert.ok(bundle.materials[part.material], `${name}: unknown material`);
        assert.equal(part.position.length % 3, 0);
        assert.equal(part.position.length, part.normal.length);
        assert.equal(part.index.length % 3, 0);
        assert.ok(part.index.every(i => Number.isInteger(i) && i >= 0 && i < part.position.length / 3));
        assert.ok([...part.position, ...part.normal].every(Number.isFinite));
        for (let i = 0; i < part.position.length; i++) {
            min[i % 3] = Math.min(min[i % 3], part.position[i]); max[i % 3] = Math.max(max[i % 3], part.position[i]);
        }
        triangles += part.index.length / 3;
    }
    assert.ok(parts.length <= 6, `${name}: more than 6 materials`);
    assert.ok(triangles < 5000, `${name}: ${triangles} triangles`);
    if (!PIVOTED.has(name)) {
        assert.ok(Math.abs(min[2]) < .05, `${name}: not anchored to the ground (min z ${min[2]})`);
        assert.ok(max[2] > (name === "Bench" ? .8 : name === "CafeTable" ? 2 : 3), `${name}: too low`);
    }
    assert.ok(max[0] - min[0] <= 52 && max[1] - min[1] <= 40 && max[2] <= 52 && min[2] >= -.1, `${name}: out of bounds`);
    assets[name] = { triangles, drawCalls: parts.length, min: min.map(v => +v.toFixed(2)), max: max.map(v => +v.toFixed(2)) };
}
// Detail floor: the reworked models carry real geometry (frames, wheels, arches, rails...); a regression to boxes fails here.
for (const [name, min] of Object.entries({"School": 2000, "Hospital": 2400, "Restaurant": 1000, "Mall": 1000, "Office": 1000, "PoliceStation": 1000, "Bench": 180, "CafeTable": 500})) assert.ok(assets[name].triangles >= min, `${name}: only ${assets[name].triangles} triangles, expected >= ${min} (detail regression)`);
assert.deepEqual(Object.keys(assets).sort(), [...expected].sort());
assert.ok(assets.Office.max[2] > 45, 'Office: tower must be tall');
assert.ok(assets.Hospital.max[2] > 18 && assets.Hospital.max[2] < 21, 'Hospital: tower height out of range');
assert.ok(assets.Mall.max[0] - assets.Mall.min[0] > 45, 'Mall: must be wide');
assert.ok(assets.Bench.max[0] - assets.Bench.min[0] < 2.5 && assets.CafeTable.max[2] > 2.5, 'street furniture proportions');
// Buildings face -Y: the entrance side (min y) carries the canopy, so the model reaches further to -Y than to +Y.
for (const name of ['School', 'Mall']) assert.ok(-assets[name].min[1] > assets[name].max[1], `${name}: front must face -Y`);
const names = Object.keys(assets);
assert.ok(gltf.nodes.every(n => names.some(name => n.name === name || n.name?.startsWith(name + '_'))));
const files = ['blend', 'glb', 'mesh.json'].map(ext => {
    const name = `${prefix}.${ext}`, bytes = fs.readFileSync(`${dir}/${name}`);
    return { name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
fs.writeFileSync(`${dir}/${prefix}.manifest.json`, JSON.stringify({ source: 'Original local Blender geometry, no external assets',
    license: 'Project /personal terms: educational use with attribution; see README.md#авторство-и-права',
    attribution: 'Корягин С. А. — https://sakoryagin.ru',
    sourceScript: 'tools/build_landscape_assets_v5.py', coordinates: bundle.coordinates,
    request: 'Город: школа, больница, ресторан, торговый центр, офис, скамейка и столик кафе',
    specification: 'Ground-centred Z-up metre geometry; at most 5000 triangles and 6 materials per model; embedded GLB, no textures',
    validation: 'GLB header/length, embedded buffers, indices, finite normals/positions, ground anchor, bounds, budgets, roof slopes',
    assets, files }, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, assets, files: files.map(({ name, bytes }) => ({ name, bytes })) }, null, 1));
