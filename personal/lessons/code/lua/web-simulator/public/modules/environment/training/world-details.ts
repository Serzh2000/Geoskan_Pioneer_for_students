import * as THREE from 'three';
import { createMissionAsset } from '../obstacles/mission-assets.js';
import { batchStaticMeshes, flatPolygon } from './world-surfaces.js';
import { distanceToWater } from './world-plan.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { distanceToPath } from './geography.js';
import { createLandscapeAsset } from './landscape-assets.js';
import type { TrainingLayout } from './layout.js';
import { addOverpasses } from './overpass.js';
import { planLineBreak, powerPylons, powerWirePoint, WIRE_ARMS } from '../../world/incidents.js';

export function addWorldDetails(group: THREE.Group, layout: TrainingLayout): void {
    if (!layout.paths.length) return;
    const detail = new THREE.Group(); detail.name = 'Дворы и инфраструктура'; detail.userData.collidable = false;
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b5a5, roughness: .95 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x535e62, roughness: .85 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x817456, roughness: .95 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe0ddc8, roughness: .9 });
    const foliage = new THREE.MeshStandardMaterial({ color: 0x657b48, roughness: 1 });
    const clear = (x:number,y:number,w:number,d:number) => {
        const radius=Math.hypot(w,d)/2;
        return distanceToWater(layout,{x,y})>radius+1
            && !layout.objects.some(p=>p.radius>0&&Math.hypot(p.x-x,p.y-y)<p.radius+radius+.2)
            && !layout.paths.some(p=>distanceToPath({x,y},p.points)<p.width/2+radius+.3);
    };
    const findPlace = (district:TrainingLayout['districts'][number],w:number,d:number) => {
        for (let y=district.y-district.depth/2+d/2+1;y<district.y+district.depth/2-d/2;y+=2)
            for(let x=district.x-district.width/2+w/2+1;x<district.x+district.width/2-w/2;x+=2)
                if(clear(x,y,w,d)) return {x,y};
        return undefined;
    };
    const box = (x: number, y: number, z: number, w: number, d: number, h: number, material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
        mesh.position.set(x, y, z + h / 2); detail.add(mesh); return mesh;
    };
    const rect = (x: number, y: number, width: number, depth: number, color: number, z = .02) => {
        const mesh = flatPolygon([{x:x-width/2,y:y-depth/2},{x:x+width/2,y:y-depth/2},{x:x+width/2,y:y+depth/2},{x:x-width/2,y:y+depth/2}],color,z);
        detail.add(mesh);
    };
    for (const district of layout.districts) {
        const { x, y, width, depth, kind } = district;
        if (kind === 'farmland') {
            for (let i = 0; i < 4; i++) {
                const px = x - width * .36 + i * width * .24, py = y - depth * .22;
                if (distanceToWater(layout, { x:px, y:py }) < width * .13 + 2) continue;
                rect(px,py,width*.20,depth*.48,[0x9c9456,0x7e8c4f,0xaaa27c,0x777b46][i]);
                for (let row = 0; row < 8; row++) rect(px-width*.09+row*width*.025,py,.10,depth*.47,0x62633d,.026);
            }
        } else if (kind === 'neighborhood') {
            rect(x,y,width,depth,0x92988a,.013);
            // Sidewalks, a shared playground and courtyard parking.
            rect(x,y+3.2,width,1.1,0xbfbcae,.021); rect(x,y-3.2,width,1.1,0xbfbcae,.021);
            const court=findPlace(district,7,4);
            if(court) {
                const courtX=court.x,courtY=court.y;
                rect(courtX,courtY,7,4,0x917861,.027);
                box(courtX,courtY,.03,.9,.9,1.5,wood);
                for (const dx of [-1.8,1.8]) box(courtX+dx,courtY,.03,.15,.15,1.7,dark);
                box(courtX,courtY,1.65,3.7,.14,.14,dark);
            }
            for (let slot=0;slot<6;slot++) {
                const px=x-width*.40+slot*2.3, py=y-depth*.43;
                if(!clear(px,py,2,3.2)) continue;
                rect(px,py,2,3.2,0x737b7c,.022);
                box(px+1,py,.028,.035,3.2,.003,white);
                if (slot % 3 === 0) {
                    const car = createMissionAsset('Car');
                    car.position.set(px,py,.04); car.rotation.z = Math.PI/2; detail.add(car);
                }
            }
        } else if (kind === 'industry') {
            rect(x,y,width,depth,0x939489,.016);
            for (let i=0;i<4;i++) {
                const cx=x+width*.28, cy=y-depth*.35+i*2;
                if(!clear(cx,cy,5,1.5)) continue;
                box(cx,cy,.025,5,1.5,1.7,i%2?dark:wood);
            }
        } else if (kind === 'park') {
            for (let i=0;i<4;i++) {
                const bx=x-width*.32+i*width*.21, by=y-4;
                if (!clear(bx,by,1.6,.5)) continue;
                box(bx,by,.3,1.6,.45,.08,wood);
                for (const dx of [-.6,.6]) box(bx+dx,by,0,.08,.3,.3,dark);
                box(bx,by+.2,.38,1.6,.06,.4,wood);
            }
        }
    }
    for (const prop of layout.objects.filter(p => p.type==='house')) {
        // A plot in the house's own frame (front = local -Y toward the street, any heading): paved yard, side and rear
        // fences and a hedge; the front stays open.
        const { x, y } = prop, r = prop.rotation ?? 0, c = Math.cos(r), s = Math.sin(r);
        const world = (lx: number, ly: number) => ({ x: x + lx * c - ly * s, y: y + lx * s + ly * c });
        detail.add(flatPolygon([world(-4.5,-4.5), world(4.5,-4.5), world(4.5,4.5), world(-4.5,4.5)], 0x8b966c, .016));
        const part = (lx: number, ly: number, z: number, w: number, d: number, h: number, material: THREE.Material) => {
            const p = world(lx, ly), mesh = box(p.x, p.y, z, w, d, h, material); mesh.rotation.z = r;
        };
        part(-4.4, 0, .03, .08, 8.8, .6, wood); part(4.4, 0, .03, .08, 8.8, .6, wood);
        part(0, 4.4, .03, 8.8, .08, .6, wood);
        part(3.4, 2.2, .02, .7, 2.8, .5, foliage);
    }
    addOverpasses(detail, layout);
    for (const bridge of layout.bridges.filter(b => b.kind !== 'overpass')) {
        const deck = new THREE.Group(); deck.position.set(bridge.x,bridge.y,0); deck.rotation.z=bridge.rotation;
        const place = (y:number,z:number,w:number,d:number,h:number) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,d,h),concrete);
            mesh.position.set(0,y,z+h/2); deck.add(mesh);
        };
        place(0,.42,bridge.length,bridge.width,.20);
        for (const side of [-1,1]) {
            place(side*bridge.width/2,.62,bridge.length,.12,.64);
            for (const x of [-bridge.length/2+.6,bridge.length/2-.6]) {
                const pier = new THREE.Mesh(new THREE.BoxGeometry(.6,bridge.width,.45),dark);
                pier.position.set(x,0,.23); deck.add(pier);
            }
        }
        detail.add(deck);
    }
    const station = layout.objects.find(p=>p.type==='station');
    if (station) {
        const y=layout.size*.365, x=station.x;
        box(x,y,0,28,2.6,.09,concrete);
        for (const dx of [-7,-2,3,8]) box(x+dx,y,.09,.12,.12,2.3,dark);
        box(x+.5,y,2.35,18,2.9,.13,dark);
        box(x,y-1.1,.10,27,.07,.003,white);
        // A stationary consist makes the siding's role readable; no invisible route AI.
        for (let i=0;i<3;i++) {
            const train = createMissionAsset(i===0?'Locomotive':'Wagon');
            train.position.set((layout.mirror ?? 1)*(layout.size*.18+i*5.8),layout.size*.43,.19);
            detail.add(train);
        }
    }
    addStreetLamps(detail, layout, clear);
    addPowerWires(detail, layout);
    batchStaticMeshes(detail); group.add(detail);
}

/** Lamps line the avenue and the town streets; they are decor, so they never block the lesson corridor. */
function addStreetLamps(detail: THREE.Group, layout: TrainingLayout, clear: (x: number, y: number, w: number, d: number) => boolean): void {
    const lamp = createLandscapeAsset('StreetLamp');
    let count = 0;
    for (const route of layout.paths.filter(p => p.kind === 'road' && p.id !== 'station-road')) {
        for (let i = 1; i < route.points.length && count < 48; i++) {
            const a = route.points[i - 1], b = route.points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
            if (length < 20) continue;
            const angle = Math.atan2(b.y - a.y, b.x - a.x), spacing = route.id === 'avenue' ? 24 : 18;
            for (let along = spacing / 2; along < length - 4 && count < 48; along += spacing) {
                const side = (Math.floor(along / spacing) % 2 ? 1 : -1);
                const x = a.x + Math.cos(angle) * along - Math.sin(angle) * side * (route.width / 2 + 1.1);
                const y = a.y + Math.sin(angle) * along + Math.cos(angle) * side * (route.width / 2 + 1.1);
                if (Math.abs(x) < 9 || !clear(x, y, .5, .5) || Math.abs(x) > layout.size / 2 - 5 || Math.abs(y) > layout.size / 2 - 5) continue;
                const post = lamp.clone(true);
                post.position.set(x, y, 0);
                // The lamp head points to -Y in the model; turn it over the carriageway.
                post.rotation.z = side > 0 ? angle : angle + Math.PI;
                detail.add(post); count++;
            }
        }
    }
}

/**
 * Wire cylinders of one span, six wires with a gentle sag. A broken span keeps both halves attached to their
 * pylons and lets the loose ends fall toward the ground.
 */
function wireSpanGeometries(layout: TrainingLayout, from: TrainingLayout['objects'][number], to: TrainingLayout['objects'][number], broken: boolean): THREE.BufferGeometry[] {
    const geometries: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0), quaternion = new THREE.Quaternion(), matrix = new THREE.Matrix4();
    const addPolyline = (points: THREE.Vector3[]) => {
        for (let i = 1; i < points.length; i++) {
            const direction = points[i].clone().sub(points[i - 1]), length = direction.length();
            if (length < 1e-4) continue;
            quaternion.setFromUnitVectors(up, direction.clone().normalize());
            matrix.compose(points[i - 1].clone().add(points[i]).multiplyScalar(.5), quaternion, new THREE.Vector3(1, length, 1));
            geometries.push(new THREE.CylinderGeometry(.035, .035, 1, 4).applyMatrix4(matrix));
        }
    };
    for (const [z, span] of WIRE_ARMS) for (const side of [-1, 1]) {
        const at = (t: number) => { const p = powerWirePoint(layout, from, to, z, span, side, t, broken); return new THREE.Vector3(p.x, p.y, p.z); };
        if (!broken) { addPolyline(Array.from({ length: 11 }, (_, k) => at(k / 10))); continue; }
        // Left half hangs from `from` to a point at 0.46, right half from `to` back to 0.54; both free ends droop.
        addPolyline(Array.from({ length: 6 }, (_, k) => at(k / 5 * .46)));
        addPolyline(Array.from({ length: 6 }, (_, k) => at(1 - k / 5 * .46)));
    }
    return geometries;
}

/** Mesh for one span of wire; the world runtime swaps the intact and torn-down variants. */
export function createWireSpan(layout: TrainingLayout, from: TrainingLayout['objects'][number], to: TrainingLayout['objects'][number], broken: boolean): THREE.Mesh | null {
    const geometries = wireSpanGeometries(layout, from, to, broken);
    const merged = mergeGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) return null;
    const wires = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: .6, metalness: .4 }));
    wires.name = broken ? 'Оборванные провода ЛЭП' : 'Провода ЛЭП'; wires.castShadow = true;
    wires.userData.collidable = false; wires.userData.label = wires.name;
    return wires;
}

/** Six wires per span with a gentle sag; one merged, non-colliding mesh for the whole line except the span that may tear. */
function addPowerWires(detail: THREE.Group, layout: TrainingLayout): void {
    const pylons = powerPylons(layout);
    if (pylons.length < 2) return;
    const torn = planLineBreak(layout)?.span ?? -1;
    const geometries: THREE.BufferGeometry[] = [];
    for (let i = 1; i < pylons.length; i++) if (i - 1 !== torn) geometries.push(...wireSpanGeometries(layout, pylons[i - 1], pylons[i], false));
    const merged = mergeGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) return;
    const wires = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: .6, metalness: .4 }));
    wires.name = 'Провода ЛЭП'; wires.castShadow = true;
    wires.userData.collidable = false; wires.userData.label = 'Провода ЛЭП';
    detail.add(wires);
}
