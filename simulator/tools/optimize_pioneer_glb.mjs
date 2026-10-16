/*
 * Web diet for the Blender export of the drone (public/assets/models/pioneer/pioneer-basic.glb).
 *
 * Blender exports the frame with every screw, solder joint and motor winding: ~513 000 triangles, a 16 MB file, and
 * KHR_materials_transmission on five materials. In three.js each of those costs the simulator dearly:
 *   - the triangles are drawn three times a frame (main pass, sun shadow, the extra transmission pass), by every drone;
 *   - transmission renders the whole opaque scene a second time into a texture whenever such a mesh is visible;
 *   - the 16 MB has to be downloaded and parsed before the first drone appears (and again in the controller wizard).
 * This pass welds and simplifies the heavy primitives (the 248 000-triangle copper windings hide inside the motor
 * bells and become ~6 000), swaps transmission for plain alpha on the two LED covers, and leaves everything that is
 * visible at flying distance as it was: ~140 000 triangles, 4.7 MB, no visible difference (compare the two side by side
 * in a three.js scene before replacing the asset).
 *
 * Run after tools/export_pioneer_blend.py, from any folder that has the packages installed:
 *   npm install --no-save @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer
 *   node tools/optimize_pioneer_glb.mjs exported.glb public/assets/models/pioneer/pioneer-basic.glb
 */
// Web diet for pioneer-basic.glb: simplify heavy primitives, drop KHR_materials_transmission (it forces an extra full-scene pass in three.js).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, reorder, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const [, , input, output] = process.argv;
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
await doc.transform(weld({ tolerance: 1e-5, toleranceNormal: 0.6 }));   // STL-derived parts come unwelded: no neighbours, nothing to simplify
const root = doc.getRoot();

const budget = (tris, material) => {
    if (/Copper motor windings/.test(material)) return { keep: 0.025, error: 0.08 };   // hidden inside the motor bells
    if (tris >= 100000) return { keep: 0.05, error: 0.05 };
    if (tris >= 20000) return { keep: 0.18, error: 0.02 };
    if (tris >= 8000) return { keep: 0.32, error: 0.015 };
    if (tris >= 3000) return { keep: 0.5, error: 0.01 };
    return { keep: 1, error: 0 };
};

let before = 0, after = 0;
const rows = [];
for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
        const indices = prim.getIndices(), position = prim.getAttribute('POSITION');
        if (!indices || !position) continue;
        const tris = indices.getCount() / 3;
        before += tris;
        const { keep, error } = budget(tris, prim.getMaterial()?.getName() ?? '');
        if (keep >= 1) { after += tris; continue; }
        const src = new Uint32Array(indices.getArray());
        const target = Math.max(3 * 60, Math.floor(src.length * keep / 3) * 3);
        let [out, err] = MeshoptSimplifier.simplify(src, position.getArray(), 3, target, error, ['LockBorder']);
        // Flat-shaded STL parts have split vertices (no neighbours): the topology-aware pass cannot touch them, the grid-based one can.
        if (out.length > src.length * .8) [out, err] = MeshoptSimplifier.simplifySloppy(src, position.getArray(), 3, null, Math.max(3 * 60, Math.floor(src.length * Math.max(keep, .3) / 3) * 3), .008);
        indices.setArray(indices.getComponentType() === 5123 && position.getCount() < 65536 ? new Uint16Array(out) : new Uint32Array(out));
        after += out.length / 3;
        rows.push(`${mesh.getName()} / ${prim.getMaterial()?.getName()}: ${tris} -> ${out.length / 3} (err ${err.toFixed(4)})`);
    }
}

// Transmission: a full extra render of the opaque scene whenever any such mesh is visible. Opaque glossy parts look the
// same at this size; the two LED covers get a plain alpha instead.
for (const material of root.listMaterials()) {
    const ext = material.getExtension('KHR_materials_transmission');
    if (!ext) continue;
    const t = ext.getTransmissionFactor();
    material.setExtension('KHR_materials_transmission', null);
    if (/LED/.test(material.getName()) && /clear/i.test(material.getName())) {
        material.setAlphaMode('BLEND');
        const c = material.getBaseColorFactor(); c[3] = Math.max(.35, 1 - t * .6); material.setBaseColorFactor(c);
    }
}

await doc.transform(prune(), dedup(), reorder({ encoder: MeshoptEncoder }));
console.log(rows.join('\n'));
console.log(`triangles ${before} -> ${Math.round(after)}`);
await io.write(output, doc);
