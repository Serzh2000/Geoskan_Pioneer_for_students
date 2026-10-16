import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir = 'public/assets/models/props', prefix = 'landscape-kit-v1';
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
    const min = [Infinity, Infinity, Infinity], max = [-Infinity,-Infinity,-Infinity];
    let triangles = 0;
    for (const part of parts) {
        assert.ok(bundle.materials[part.material]);
        assert.equal(part.position.length % 3, 0);
        assert.equal(part.position.length, part.normal.length);
        assert.equal(part.index.length % 3, 0);
        assert.ok(part.index.every(i => Number.isInteger(i) && i >= 0 && i < part.position.length / 3));
        assert.ok([...part.position, ...part.normal].every(Number.isFinite));
        for (let i = 0; i < part.position.length; i++) {
            min[i%3] = Math.min(min[i%3],part.position[i]); max[i%3] = Math.max(max[i%3],part.position[i]);
        }
        triangles += part.index.length/3;
    }
    assert.ok(parts.length <= 6 && triangles < 5000);
    assert.ok(Math.abs(min[2]) < .02 && max[2] > 2, `${name}: invalid ground anchor`);
    assert.ok(max[0] - min[0] <= 16 && max[1] - min[1] <= 10);
    if (['Cottage','Station','Warehouse'].includes(name)) {
        const roof = parts.find(part => part.material === 'Roof');
        let slopes = 0;
        for (let i=2;i<roof.normal.length;i+=3) {
            const nz=roof.normal[i];
            if (Math.abs(nz)>.05 && Math.abs(nz)<.99) {
                assert.ok(nz>0, `${name}: roof slope points inward`); slopes++;
            }
        }
        assert.ok(slopes>0, `${name}: no outward roof slopes`);
        if(name==='Station') {
            const towerX=[];
            for(let i=0;i<roof.position.length;i+=3) if(roof.position[i+2]>=7.39) towerX.push(roof.position[i]);
            assert.ok(Math.abs((Math.min(...towerX)+Math.max(...towerX))/2-4.1)<.02,'Tower roof must sit over the tower');
        }
    }
    assets[name] = { triangles, drawCalls:parts.length, min, max };
}
// Detail floor: the reworked models carry real geometry (frames, wheels, arches, rails...); a regression to boxes fails here.
for (const [name, min] of Object.entries({"Cottage": 400, "Station": 700, "Warehouse": 800, "WaterTower": 1000})) assert.ok(assets[name].triangles >= min, `${name}: only ${assets[name].triangles} triangles, expected >= ${min} (detail regression)`);
assert.deepEqual(Object.keys(assets).sort(), ['Cottage','Station','Warehouse','WaterTower']);
const names = Object.keys(assets);
assert.ok(gltf.nodes.every(n => names.some(name => n.name === name || n.name?.startsWith(name+'_'))));
const files = ['blend','glb','mesh.json'].map(ext => {
    const name = `${prefix}.${ext}`, bytes = fs.readFileSync(`${dir}/${name}`);
    return {name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
fs.writeFileSync(`${dir}/${prefix}.manifest.json`,JSON.stringify({source:'Original local Blender MCP geometry, no external assets',
    license:'Project /personal terms: educational use with attribution; see README.md#авторство-и-права',
    attribution:'Корягин С. А. — https://sakoryagin.ru',
    sourceScript:'tools/build_landscape_assets.py',coordinates:bundle.coordinates,
    request:'Связная местность со станцией, поселками и микрорайонами; Blender MCP для недостающих объектов',
    specification:'Ground-centred Z-up metre geometry; at most 5000 triangles and 6 materials per model; embedded GLB, no textures',
    validation:'GLB header/length, embedded buffers, scene nodes, indices, finite normals/positions, anchors, bounds and budgets',assets,files},null,2)+'\n');
console.log(JSON.stringify({verified:true,assets,files:files.map(({name,bytes})=>({name,bytes}))},null,2));
