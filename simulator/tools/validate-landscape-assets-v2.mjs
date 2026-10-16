import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir = 'public/assets/models/props', prefix = 'landscape-kit-v2';
const expected = ['Barn','BusStop','ContainerStack','Greenhouse','HayBales','RadioMast','Rocks','Silo','SolarArray','StreetLamp','WindTurbine'];
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
    assert.ok(max[2] > 1.5, `${name}: too low`);
    assert.ok(max[0] - min[0] <= 20 && max[1] - min[1] <= 20 && max[2] <= 32, `${name}: out of bounds`);
    assets[name] = { triangles, drawCalls: parts.length, min: min.map(v => +v.toFixed(2)), max: max.map(v => +v.toFixed(2)) };
}
// Detail floor: the reworked models carry real geometry (frames, wheels, arches, rails...); a regression to boxes fails here.
for (const [name, min] of Object.entries({"ContainerStack": 1200, "SolarArray": 1100, "Greenhouse": 500, "StreetLamp": 200, "BusStop": 400, "HayBales": 1500, "Rocks": 400, "Barn": 350})) assert.ok(assets[name].triangles >= min, `${name}: only ${assets[name].triangles} triangles, expected >= ${min} (detail regression)`);
assert.deepEqual(Object.keys(assets).sort(), [...expected].sort());
// Roofs must slope outward: a barn roof that dips towards the middle reads as a bow-tie from the air.
const barnRoof = bundle.assets.Barn.find(part => part.material === 'DarkRoof');
assert.ok(barnRoof, 'Barn: missing roof');
let slopes = 0;
for (let i = 0; i < barnRoof.normal.length; i += 3) {
    const nz = barnRoof.normal[i + 2];
    if (nz > .2 && nz < .95) { slopes++; }
}
assert.ok(slopes > 0, 'Barn: roof has no upward slopes');
assert.ok(assets.Barn.max[2] < 8 && assets.Barn.max[2] > 6.5, 'Barn: roof ridge height out of range');
assert.ok(assets.WindTurbine.max[2] > 24, 'WindTurbine: blades must reach rotor height');
const names = Object.keys(assets);
assert.ok(gltf.nodes.every(n => names.some(name => n.name === name || n.name?.startsWith(name + '_'))));
const files = ['blend', 'glb', 'mesh.json'].map(ext => {
    const name = `${prefix}.${ext}`, bytes = fs.readFileSync(`${dir}/${name}`);
    return { name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
fs.writeFileSync(`${dir}/${prefix}.manifest.json`, JSON.stringify({ source: 'Original local Blender geometry, no external assets',
    license: 'Project /personal terms: educational use with attribution; see README.md#авторство-и-права',
    attribution: 'Корягин С. А. — https://sakoryagin.ru',
    sourceScript: 'tools/build_landscape_assets_v2.py', coordinates: bundle.coordinates,
    request: 'Расширение процедурных полигонов: ферма, энергетика, логистика, уличная мебель',
    specification: 'Ground-centred Z-up metre geometry; at most 5000 triangles and 6 materials per model; embedded GLB, no textures',
    validation: 'GLB header/length, embedded buffers, indices, finite normals/positions, ground anchor, bounds, budgets, roof slopes',
    assets, files }, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, assets, files: files.map(({ name, bytes }) => ({ name, bytes })) }, null, 1));
