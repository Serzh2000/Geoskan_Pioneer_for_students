import * as THREE from 'three';
import type { BuildingWindowIncident, BuildingWindowSlot } from './shared.js';
import { createMissionAsset, type MissionAsset } from '../mission-assets.js';

const INCIDENT_ASSET: Record<BuildingWindowIncident['kind'], MissionAsset> = {
    smoke: 'Smoke', fire: 'Fire', thief: 'Thief'
};

/** Authored at window centre, facing +Y. Both facades keep Z upright. */
export function addIncidentEffect(group: THREE.Group, slot: BuildingWindowSlot, incident: BuildingWindowIncident) {
    const effect = createMissionAsset(INCIDENT_ASSET[incident.kind]);
    effect.name = `incident-${incident.kind}-${incident.floor}-${incident.face}-${incident.window}`;
    effect.userData = { keepSeparate: true, isIncidentEffect: true, incident: { ...incident } };
    effect.position.copy(slot.position);
    effect.rotation.z = slot.outward < 0 ? Math.PI : 0;
    if (incident.kind === 'fire') {
        const smoke = createMissionAsset('Smoke');
        smoke.position.set(0, .05, .35);
        smoke.scale.setScalar(.65);
        effect.add(smoke);
        const glow = new THREE.PointLight(0xff7a18, 1.5, 2.5, 2);
        glow.position.set(0, .3, .15);
        effect.add(glow);
    }
    group.add(effect);
}