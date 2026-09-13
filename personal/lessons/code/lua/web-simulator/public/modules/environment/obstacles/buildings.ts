import * as THREE from 'three';
import { SceneObjectOptions } from './types.js';
import { setCommonMeta, applyShadows, clearGeneratedChildren } from './utils.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { addIncidentEffect } from './buildings/effects.js';
import { getWindowSlots, parseWindowIncidents, summarizeWindowIncidents } from './buildings/incidents.js';
import { clampBuildingFloors } from './buildings/shared.js';

function rebuildApartmentBuilding(group: THREE.Group) {
    clearGeneratedChildren(group);

    const floors = clampBuildingFloors(group.userData.floors);
    group.userData.floors = floors;
    const bodyColor = Number(group.userData.bodyColor) || 0xe5e7eb;
    const windowIncidents = parseWindowIncidents(group.userData.value, floors);
    group.userData.windowIncidentsSummaryLines = summarizeWindowIncidents(windowIncidents);

    const width = 4.8;
    const depth = 3.6;
    const floorHeight = 0.72;
    const height = floors * floorHeight + 0.8;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.96 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.92, metalness: 0.02 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78, metalness: 0.08 });
    const balconyGlassMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.45
    });

    // Цоколь и основная масса здания.
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, depth + 0.36, 0.42), baseMat);
    base.position.z = 0.21;
    group.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), bodyMat);
    body.position.z = height * 0.5 + 0.22;
    group.add(body);

    // Передняя и задняя фасадные плоскости чуть выступают, чтобы здание не читалось одной коробкой.
    const facadeThickness = 0.08;
    const facadeWidth = width - 0.55;
    const facadeHeight = height - 0.3;
    for (const outward of [-1, 1] as const) {
        const facade = new THREE.Mesh(
            new THREE.BoxGeometry(facadeWidth, facadeThickness, facadeHeight),
            concreteMat
        );
        facade.position.set(0, outward * (depth * 0.5 + facadeThickness * 0.5), 0.38 + facadeHeight * 0.5);
        group.add(facade);
    }

    // Угловые и вертикальные акценты визуально собирают силуэт.
    const cornerOffsetX = width * 0.5 - 0.18;
    const cornerOffsetY = depth * 0.5 + 0.01;
    for (const x of [-cornerOffsetX, cornerOffsetX]) {
        for (const y of [-cornerOffsetY, cornerOffsetY]) {
            const cornerColumn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, height), accentMat);
            cornerColumn.position.set(x, y, height * 0.5 + 0.22);
            group.add(cornerColumn);
        }
    }

    const sidePilasterDepth = depth + 0.06;
    for (const x of [-width / 2 + 0.42, width / 2 - 0.42]) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, sidePilasterDepth, height), accentMat);
        pilaster.position.set(x, 0, height * 0.5 + 0.22);
        group.add(pilaster);
    }

    // Межэтажные пояса добавляют ритм фасаду.
    for (let floor = 0; floor <= floors; floor++) {
        const z = 0.56 + floor * floorHeight;
        for (const outward of [-1, 1] as const) {
            const belt = new THREE.Mesh(
                new THREE.BoxGeometry(facadeWidth, 0.1, 0.05),
                accentMat
            );
            belt.position.set(0, outward * (depth * 0.5 + 0.07), z);
            group.add(belt);
        }
    }

    // Входная группа на главном фасаде.
    const entranceFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.05), darkTrimMat);
    entranceFrame.position.set(0, depth * 0.5 + 0.08, 0.78);
    group.add(entranceFrame);

    const entranceDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.08, 0.86),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.22, metalness: 0.25 })
    );
    entranceDoor.position.set(0, depth * 0.5 + 0.18, 0.7);
    group.add(entranceDoor);

    const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 0.08), roofMat);
    entranceCanopy.position.set(0, depth * 0.5 + 0.3, 1.24);
    group.add(entranceCanopy);

    const entranceStep = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.55, 0.08), concreteMat);
    entranceStep.position.set(0, depth * 0.5 + 0.24, 0.04);
    group.add(entranceStep);

    // Кровля с более аккуратным техэтажом и мелкими элементами.
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, depth + 0.2, 0.18), roofMat);
    roofSlab.position.z = height + 0.31;
    group.add(roofSlab);

    const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.12, 0.32), darkTrimMat);
    parapetFront.position.set(0, depth * 0.5 + 0.04, height + 0.48);
    group.add(parapetFront);

    const parapetBack = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.12, 0.32), darkTrimMat);
    parapetBack.position.set(0, -depth * 0.5 - 0.04, height + 0.48);
    group.add(parapetBack);

    const parapetLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, depth + 0.1, 0.32), darkTrimMat);
    parapetLeft.position.set(-width * 0.5 - 0.04, 0, height + 0.48);
    group.add(parapetLeft);

    const parapetRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, depth + 0.1, 0.32), darkTrimMat);
    parapetRight.position.set(width * 0.5 + 0.04, 0, height + 0.48);
    group.add(parapetRight);

    const roofBox = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.35, 0.72), accentMat);
    roofBox.position.set(0.1, -0.2, height + 0.67);
    group.add(roofBox);

    const roofDoor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.5), darkTrimMat);
    roofDoor.position.set(0.1, 0.5, height + 0.56);
    group.add(roofDoor);

    for (const x of [-0.65, 0.95]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.42), roofMat);
        vent.position.set(x, -0.95, height + 0.52);
        group.add(vent);

        const ventCap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.05), concreteMat);
        ventCap.position.set(x, -0.95, height + 0.73);
        group.add(ventCap);
    }

    const windowSlots = getWindowSlots(floors, depth, floorHeight);

    for (const slot of windowSlots) {
        const hasFire = windowIncidents.some((incident) =>
            incident.kind === 'fire'
            && incident.floor === slot.floor
            && incident.face === slot.face
            && incident.window === slot.window
        );
        const windowMat = new THREE.MeshStandardMaterial({
            color: hasFire ? 0x2b1208 : 0x0f172a,
            emissive: hasFire ? 0xff7a18 : 0x38bdf8,
            emissiveIntensity: hasFire ? 0.55 : 0.1,
            roughness: 0.3,
            metalness: 0.8
        });

        const facadeY = slot.position.y - 0.02 * slot.outward;
        const niche = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.52), darkTrimMat);
        niche.position.set(slot.position.x, facadeY, slot.position.z);
        group.add(niche);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.44), accentMat);
        frame.position.set(slot.position.x, slot.position.y + 0.04 * slot.outward, slot.position.z);
        group.add(frame);

        const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.3), windowMat);
        windowMesh.position.set(slot.position.x, slot.position.y + 0.075 * slot.outward, slot.position.z);
        group.add(windowMesh);

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.02, 0.06), concreteMat);
        topFrame.position.set(slot.position.x, slot.position.y + 0.055 * slot.outward, slot.position.z + 0.19);
        group.add(topFrame);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.04), concreteMat);
        sill.position.set(slot.position.x, slot.position.y + 0.13 * slot.outward, slot.position.z - 0.21);
        group.add(sill);

        const balconyGroup = new THREE.Group();
        balconyGroup.position.set(slot.position.x, slot.position.y + 0.24 * slot.outward, slot.position.z - 0.28);

        const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.42, 0.06), balconyMat);
        balconyGroup.add(balconyFloor);

        const balconyUnderside = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.28, 0.04), darkTrimMat);
        balconyUnderside.position.z = -0.05;
        balconyGroup.add(balconyUnderside);

        const balconyFront = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.03, 0.22), balconyGlassMat);
        balconyFront.position.set(0, 0.18 * slot.outward, 0.13);
        balconyGroup.add(balconyFront);

        for (const x of [-0.42, 0.42]) {
            const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.2), balconyGlassMat);
            sideRail.position.set(x, 0, 0.13);
            balconyGroup.add(sideRail);
        }

        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.03), accentMat);
        topRail.position.set(0, 0.18 * slot.outward, 0.245);
        balconyGroup.add(topRail);

        for (const x of [-0.42, 0, 0.42]) {
            const baluster = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.18), accentMat);
            baluster.position.set(x, 0.18 * slot.outward, 0.11);
            balconyGroup.add(baluster);
        }

        group.add(balconyGroup);
    }

    for (const incident of windowIncidents) {
        const slot = windowSlots.find((candidate) =>
            candidate.floor === incident.floor
            && candidate.face === incident.face
            && candidate.window === incident.window
        );
        if (slot) addIncidentEffect(group, slot, incident);
    }

    applyShadows(group);
}

export function createApartmentBuildingMesh(options: SceneObjectOptions = {}) {
    const colors = [0xe5e7eb, 0xef4444, 0x2563eb, 0x10b981, 0xf59e0b];
    const bodyColor = colors[Math.floor(Math.random() * colors.length)];
    
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.BUILDING, {
        floors: clampBuildingFloors(options.floors ?? 9),
        collidableRadius: 2.6,
        supportsValue: true,
        value: options.value || '',
        bodyColor,
        valueLabel: 'Сценарии в окнах'
    });
    rebuildApartmentBuilding(group);
    return group;
}

export function updateApartmentBuildingMetadata(
    object: THREE.Object3D,
    params: { value?: string; floors?: number }
) {
    const group = object as THREE.Group;
    if (group.userData?.type !== OBJECT_TYPE.BUILDING) return false;
    if (params.value !== undefined) group.userData.value = params.value || '';
    if (params.floors !== undefined) group.userData.floors = clampBuildingFloors(params.floors);
    rebuildApartmentBuilding(group);
    return true;
}
