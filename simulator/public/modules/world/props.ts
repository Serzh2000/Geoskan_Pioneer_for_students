import * as THREE from 'three';

// ------------------------------------------------------------------ props: hose and ladder

/** A fire hose drawn as a tube along a few points; rebuilt when the points change. */
export function createHose(): THREE.Mesh {
    const hose = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ name: 'Hose', color: 0xd8b21c, roughness: .7 }));
    hose.castShadow = true; hose.visible = false; hose.userData.collidable = false;
    return hose;
}

export function updateHose(hose: THREE.Mesh, points: THREE.Vector3[]) {
    hose.geometry.dispose();
    if (points.length < 2) { hose.visible = false; return; }
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', .3);
    hose.geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), .085, 6, false);
    hose.visible = true;
}

export type Ladder = { group: THREE.Group; rungs: THREE.InstancedMesh; rails: THREE.Mesh };
const RUNG_SPACING = .42, MAX_RUNGS = 70;

/** A telescopic ladder lying along +X from its base; `setLadder` orients and lengthens it. */
export function createLadder(): Ladder {
    const group = new THREE.Group(); group.visible = false; group.userData.collidable = false;
    const metal = new THREE.MeshStandardMaterial({ name: 'LadderMetal', color: 0xd9dde2, roughness: .45, metalness: .6 });
    const rails = new THREE.Mesh(new THREE.BoxGeometry(1, .06, .06).translate(.5, 0, 0), metal);
    const railB = rails.clone(); rails.position.y = -.32; railB.position.y = .32; rails.add(railB);
    // `rails` clones share geometry; the second rail is a child so one scale along X lengthens both.
    railB.position.set(0, .64, 0);
    const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .62, .05), metal, MAX_RUNGS);
    group.add(rails, rungs);
    rails.castShadow = true; rungs.castShadow = true;
    return { group, rungs, rails };
}

const up = new THREE.Vector3(1, 0, 0), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
export function setLadder(ladder: Ladder, base: THREE.Vector3, direction: THREE.Vector3, length: number) {
    ladder.group.visible = length > .05;
    ladder.group.position.copy(base);
    ladder.group.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    ladder.rails.scale.x = Math.max(.01, length);
    const count = Math.min(MAX_RUNGS, Math.floor(length / RUNG_SPACING));
    ladder.rungs.count = count;
    for (let i = 0; i < count; i++) {
        tmpM.compose(new THREE.Vector3((i + .5) * RUNG_SPACING, 0, 0), tmpQ.identity(), new THREE.Vector3(1, 1, 1));
        ladder.rungs.setMatrixAt(i, tmpM);
    }
    ladder.rungs.instanceMatrix.needsUpdate = true;
}

