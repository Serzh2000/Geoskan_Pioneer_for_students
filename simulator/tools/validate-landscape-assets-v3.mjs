import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir = 'public/assets/models/props', prefix = 'landscape-kit-v3';
const expected = ['Church','GantryCrane','GasStation','Hangar','PowerPylon','Windsock'];
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
    assert.ok(Math.abs(min[2]) < .05, `${name}: not anchored to the ground (min z ${min[2]})`);
    assert.ok(max[2] > 5, `${name}: too low`);
    assert.ok(max[0] - min[0] <= 24 && max[1] - min[1] <= 20 && max[2] <= 32, `${name}: out of bounds`);
    assets[name] = { triangles, drawCalls: parts.length, min: min.map(v => +v.toFixed(2)), max: max.map(v => +v.toFixed(2)) };
}
// Detail floor: the reworked models carry real geometry (frames, wheels, arches, rails...); a regression to boxes fails here.
for (const [name, min] of Object.entries({"PowerPylon": 1500, "Hangar": 1200, "Windsock": 300, "Church": 900, "GasStation": 1000, "GantryCrane": 1200})) assert.ok(assets[name].triangles >= min, `${name}: only ${assets[name].triangles} triangles, expected >= ${min} (detail regression)`);
assert.deepEqual(Object.keys(assets).sort(), [...expected].sort());
assert.ok(assets.PowerPylon.max[2] > 14 && assets.PowerPylon.max[2] < 16, 'PowerPylon: height out of range');
assert.ok(assets.Church.max[2] > 17, 'Church: spire missing');
// An arched hangar roof must reach its crown, otherwise it reads as a flat box from the air.
assert.ok(assets.Hangar.max[2] > 8 && assets.Hangar.max[2] < 13, 'Hangar: arch height out of range');
const names = Object.keys(assets);
assert.ok(gltf.nodes.every(n => names.some(name => n.name === name || n.name?.startsWith(name + '_'))));
const files = ['blend', 'glb', 'mesh.json'].map(ext => {
    const name = `${prefix}.${ext}`, bytes = fs.readFileSync(`${dir}/${name}`);
    return { name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
fs.writeFileSync(`${dir}/${prefix}.manifest.json`, JSON.stringify({ source: 'Original local Blender geometry, no external assets',
    license: 'Project /personal terms: educational use with attribution; see README.md#авторство-и-права',
    attribution: 'Корягин С. А. — https://sakoryagin.ru',
    sourceScript: 'tools/build_landscape_assets_v3.py', coordinates: bundle.coordinates,
    request: 'Расширение процедурных полигонов: ЛЭП, аэродром, церковь, АЗС, портальный кран',
    specification: 'Ground-centred Z-up metre geometry; at most 5000 triangles and 6 materials per model; embedded GLB, no textures',
    validation: 'GLB header/length, embedded buffers, indices, finite normals/positions, ground anchor, bounds, budgets, roof slopes',
    assets, files }, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, assets, files: files.map(({ name, bytes }) => ({ name, bytes })) }, null, 1));
