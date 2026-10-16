import * as THREE from 'three';
import { createFirTreeMesh, createHillMesh } from '../obstacles/nature.js';
import { createApartmentBuildingMesh } from '../obstacles/buildings.js';
import { createPylonMesh } from '../obstacles/competition.js';
import { createArucoMarkerMesh } from '../obstacles/markers.js';
import { createStyledLandingPad } from '../obstacles/pads.js';
import { setCommonMeta } from '../obstacles/utils.js';
import { generateTrainingLayout, TRAINING_PROFILE_LABELS, type TrainingProfile } from './layout.js';
import { createLandscapeAsset, type LandscapeAsset } from './landscape-assets.js';
import { addWorldSurfaces } from './world-surfaces.js';
import { addWorldVegetation } from './world-vegetation.js';
import { addWorldDetails } from './world-details.js';
import { trainingHeightAt } from './world-plan.js';

const KIT_V2: Record<string, LandscapeAsset> = {
    barn: 'Barn', silo: 'Silo', 'radio-mast': 'RadioMast', containers: 'ContainerStack',
    solar: 'SolarArray', greenhouse: 'Greenhouse', 'bus-stop': 'BusStop', hay: 'HayBales', rocks: 'Rocks',
    church: 'Church', 'gas-station': 'GasStation', 'gantry-crane': 'GantryCrane', hangar: 'Hangar', windsock: 'Windsock', 'power-pylon': 'PowerPylon', 'fire-station': 'FireStation',
    'police-station': 'PoliceStation', school: 'School', hospital: 'Hospital', restaurant: 'Restaurant', mall: 'Mall', office: 'Office', bench: 'Bench', 'cafe-table': 'CafeTable'
};

/** Fixed tower plus a rotor the world runtime spins (userData.spin: rad/s around the hub axis). */
function createTurbine(): THREE.Group {
    const tower = createLandscapeAsset('WindTurbineTower');
    const rotor = createLandscapeAsset('TurbineRotor');
    rotor.position.set(0, -1.65, 19.4);
    rotor.userData = { ...rotor.userData, collidable: false, spin: 1.4 };
    tower.add(rotor);
    tower.userData.type = 'Ветрогенератор';
    return tower;
}

export function createTrainingTerrain(profile: TrainingProfile = 'field', seed = 20261009): THREE.Group {
    const layout = generateTrainingLayout({ profile, seed });
    const group = setCommonMeta(new THREE.Group(), `Учебный полигон: ${TRAINING_PROFILE_LABELS[profile]}`, {
        presetName: `training-${profile}`, trainingLayout: layout, collidableRadius: layout.size / 2
    });
    addWorldSurfaces(group, layout);
    for (const [slot, prop] of layout.objects.entries()) {
        if (prop.type === 'tree' && layout.version === 2) continue;
        const mesh = prop.type === 'wind-turbine' ? createTurbine()
            : prop.type in KIT_V2 ? createLandscapeAsset(KIT_V2[prop.type])
            : prop.type === 'tree' ? createFirTreeMesh()
            : prop.type === 'hill' ? createHillMesh()
                : prop.type === 'building' ? createApartmentBuildingMesh({ floors: prop.floors ?? 5, building: { bodyColor: prop.color } })
                    : prop.type === 'house' ? createLandscapeAsset('Cottage')
                        : prop.type === 'station' ? createLandscapeAsset('Station')
                            : prop.type === 'warehouse' ? createLandscapeAsset('Warehouse')
                                : prop.type === 'water-tower' ? createLandscapeAsset('WaterTower')
                    : prop.type === 'aruco' ? createArucoMarkerMesh(String(prop.value), 'DICT_6X6_250')
                        : prop.type === 'pad' ? createStyledLandingPad('S', '#2563eb') : createPylonMesh();
        // Плоские предметы (площадка, лист маркера) лежат на 2.5 см выше рельефа:
        // поверхность карты сама приподнята на 6 мм над trainingHeightAt
        // (world-surfaces.ts), и на высоте рельефа площадка уходила под него.
        const ground = trainingHeightAt(layout, prop.x, prop.y);
        const flat = prop.type === 'aruco' || prop.type === 'pad';
        mesh.position.set(prop.x, prop.y, flat ? ground + .025 : ground);
        mesh.scale.setScalar(prop.scale);
        mesh.rotation.z = prop.rotation ?? 0;
        mesh.userData.presetSlot = slot;
        mesh.userData.label = prop.type === 'aruco' ? `ArUco ${prop.value}` : prop.type === 'pad' ? 'Старт S' : `${mesh.userData.type} ${slot}`;
        group.add(mesh);
    }
    addWorldVegetation(group, layout);
    addWorldDetails(group, layout);
    return group;
}
