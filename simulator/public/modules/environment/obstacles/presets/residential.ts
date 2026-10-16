import * as THREE from 'three';
import { createApartmentBuildingMesh } from '../buildings.js';
import { createArenaControlStationMesh, createArenaHeliportMesh, createCargoMesh, createChargeStationMesh, createForestPatchMesh } from '../arena.js';
import { createAprilTagMarkerMesh, createArucoMarkerMesh } from '../markers.js';
import { createRoadMesh, createRailwayMesh } from '../linear.js';
import { createParkPatch, createTreeMesh } from '../nature.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createResidentialPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: спальный район', {
        collidableRadius: 23, presetName: 'residential'
    });
    const place = (object: THREE.Object3D, x: number, y: number, z = 0) => {
        object.position.set(x, y, z); group.add(object); return object;
    };
    const avenue = createRoadMesh({ points: [{x:-19,y:0,z:0},{x:19,y:0,z:0}] });
    avenue.userData.label = 'Главная улица';
    group.add(avenue);
    const accessRoad = createRoadMesh({ points: [{x:0,y:-16,z:0},{x:0,y:0,z:0}] });
    accessRoad.userData.label = 'Служебный проезд';
    group.add(accessRoad);
    const railway = createRailwayMesh({ points: [{x:-19,y:15,z:0},{x:19,y:15,z:0}] });
    railway.userData.label = 'Северные пути';
    group.add(railway);
    const buildings = [
        { x: -9, y: -7, floors: 6, color: 0xd8c29b, id: '101', incident: '3:front:2=smoke' },
        { x: 9, y: -7, floors: 8, color: 0xb4664b, id: '102', incident: '5:back:1=fire' },
        { x: -9, y: 7, floors: 7, color: 0xa8c2d4, id: '103', incident: '2:front:3=thief' },
        { x: 9, y: 7, floors: 5, color: 0xece8e1, id: '104', incident: '' }
    ];
    for (const [index, { x, y, floors, color, id, incident }] of buildings.entries()) {
        const block = place(createApartmentBuildingMesh({
            floors,
            value: incident,
            building: {
                bodyColor: color,
                roofMarker: { enabled: true, kind: 'ArUco', id, size: 1.5 }
            }
        }), x, y);
        block.rotation.z = y > 0 ? Math.PI : 0;
        block.userData.label = `Дом ${index + 1}`;
    }
    const park = place(createParkPatch(7, 6), 0, 7);
    park.userData.label = 'Центральный парк';
    for (const [x,y,scale] of [[-2,4,1],[2,4,0.9],[-2,8,1.1],[2,8,1]]) {
        place(createTreeMesh(scale), x, y + 1, 0.07);
    }
    place(createForestPatchMesh(), -14, 7);
    place(createForestPatchMesh(), 14, 7);
    const loadingPad = place(createArenaHeliportMesh(), -5, -13, 0.025);
    loadingPad.userData.label = 'Площадка погрузки';
    const deliveryPad = place(createArenaHeliportMesh(), 5, -13, 0.025);
    deliveryPad.userData.label = 'Площадка доставки';
    const cargo = place(createCargoMesh(), -5, -11, 0);
    cargo.userData.label = 'Груз для доставки';
    place(createChargeStationMesh(), 11, -13, 0.025);
    place(createArenaControlStationMesh(), 15, -12);
    const aruco = place(createArucoMarkerMesh('7'), -9, 2.5, 0.02);
    aruco.userData.label = 'Метка двора 7';
    const aprilTag = place(createAprilTagMarkerMesh('18'), 9, -2.5, 0.02);
    aprilTag.userData.label = 'Метка двора 18';
    applyShadows(group);
    return group;
}
