import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/assets/models/props');
const bundle = JSON.parse(fs.readFileSync(path.join(dir, 'mission-assets-v1.mesh.json'), 'utf8'));
const glb = fs.readFileSync(path.join(dir, 'mission-assets-v1.glb'));
assert.equal(glb.toString('ascii', 0, 4), 'glTF');
assert.equal(glb.readUInt32LE(4), 2);
assert.equal(glb.readUInt32LE(8), glb.length);
assert.equal(glb.readUInt32LE(16), 0x4e4f534a);
const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)).trim());
assert.equal(gltf.asset.version, '2.0');
assert.ok(gltf.buffers.every(buffer => !buffer.uri), 'GLB must be self-contained');
assert.ok(!gltf.images?.length, 'These models require no textures');
const assets = {};
for (const [name, parts] of Object.entries(bundle.assets)) {
    let triangles = 0;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const part of parts) {
        assert.ok(bundle.materials[part.material], `${name}: missing material`);
        assert.equal(part.position.length % 3, 0);
        assert.equal(part.position.length, part.normal.length);
        assert.equal(part.index.length % 3, 0);
        assert.ok(part.index.every(i => Number.isInteger(i) && i >= 0 && i < part.position.length / 3));
        assert.ok([...part.position, ...part.normal].every(Number.isFinite));
        for (let i = 0; i < part.position.length; i++) {
            min[i % 3] = Math.min(min[i % 3], part.position[i]);
            max[i % 3] = Math.max(max[i % 3], part.position[i]);
        }
        triangles += part.index.length / 3;
    }
    assert.ok(triangles < 8000, `${name}: triangle budget exceeded`);
    assert.ok(parts.length <= 8, `${name}: draw-call budget exceeded`);
    assets[name] = { triangles, drawCalls: parts.length, bounds: { min, max } };
}
assert.deepEqual(Object.keys(assets).sort(), ['Car', 'Fire', 'Locomotive', 'Smoke', 'Thief', 'Wagon']);
const files = ['mission-assets-v1.blend', 'mission-assets-v1.glb', 'mission-assets-v1.mesh.json'];
const manifest = {
    source: 'Original geometry authored locally through Blender MCP; no third-party models or textures',
    license: 'ISC (project license)',
    request: 'используя blender mcp перерисовать поезд и автомобиль в селекторе объектов. а еще прорисовать в многоэтажке индиденты - вора пожар и дым',
    coordinates: bundle.coordinates,
    specification: 'Metres; existing vehicle dimensions and marker anchors; window-centre incident anchors; under 8000 triangles and 8 draw calls per asset; no textures',
    sourceScript: 'tools/build_mission_assets.py',
    runtime: 'mission-assets-v1.mesh.json contains the same Blender mesh data for synchronous catalog rendering; each instance owns its geometry and materials',
    validation: 'GLB header and embedded buffers; mesh indices, finite coordinates, material references, bounds and triangle budgets verified',
    assets,
    files: files.map(name => {
        const data = fs.readFileSync(path.join(dir, name));
        return { name, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
    })
};
fs.writeFileSync(path.join(dir, 'mission-assets-v1.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, assets, files: manifest.files.map(({name, bytes}) => ({name, bytes})) }, null, 2));
