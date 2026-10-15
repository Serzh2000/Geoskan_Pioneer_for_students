import * as THREE from 'three';
import kitV1 from '../../../assets/models/props/landscape-kit-v1.mesh.json';
import kitV2 from '../../../assets/models/props/landscape-kit-v2.mesh.json';
import kitV3 from '../../../assets/models/props/landscape-kit-v3.mesh.json';
import kitV4 from '../../../assets/models/props/landscape-kit-v4.mesh.json';
import kitV5 from '../../../assets/models/props/landscape-kit-v5.mesh.json';
import { setCommonMeta } from '../obstacles/utils.js';

const kits = [kitV1, kitV2, kitV3, kitV4, kitV5] as const;
type Kit = typeof kitV1 | typeof kitV2 | typeof kitV3 | typeof kitV4 | typeof kitV5;
export type LandscapeAsset = keyof typeof kitV1.assets | keyof typeof kitV2.assets | keyof typeof kitV3.assets | keyof typeof kitV4.assets | keyof typeof kitV5.assets;
const labels: Record<LandscapeAsset, string> = {
    Cottage: 'Частный дом', Station: 'Железнодорожная станция', Warehouse: 'Склад', WaterTower: 'Водонапорная башня',
    Barn: 'Амбар', Silo: 'Силосная башня', WindTurbine: 'Ветрогенератор', RadioMast: 'Радиомачта',
    ContainerStack: 'Контейнеры', SolarArray: 'Солнечные панели', Greenhouse: 'Теплица', StreetLamp: 'Фонарь',
    BusStop: 'Автобусная остановка', HayBales: 'Тюки сена', Rocks: 'Камни',
    PowerPylon: 'Опора ЛЭП', Hangar: 'Ангар', Windsock: 'Ветроуказатель', Church: 'Церковь', GasStation: 'АЗС', GantryCrane: 'Портальный кран',
    FireStation: 'Пожарная часть', FireTruck: 'Пожарная машина', RepairTruck: 'Ремонтная бригада', RepairBoom: 'Стрела ремонтной машины',
    Airplane: 'Самолёт', WindTurbineTower: 'Ветрогенератор', TurbineRotor: 'Ротор ветрогенератора',
    School: 'Школа', PoliceStation: 'Отделение полиции', Hospital: 'Больница', Restaurant: 'Ресторан', Mall: 'Торговый центр', Office: 'Офисная башня', Bench: 'Скамейка', CafeTable: 'Столик кафе'
};

function kitOf(name: LandscapeAsset): Kit {
    const kit = kits.find(candidate => name in candidate.assets);
    if (!kit) throw new Error(`Unknown landscape asset: ${name}`);
    return kit;
}

// Geometry is immutable and identical for every copy of an asset: build it once and share the buffers.
// Materials stay per copy, because selection highlighting tints a material's emissive.
const geometryCache = new Map<string, THREE.BufferGeometry>();

/** Same Blender geometry as the GLB, available immediately for collision and framing. */
export function createLandscapeAsset(name: LandscapeAsset): THREE.Group {
    const kit = kitOf(name);
    const group = setCommonMeta(new THREE.Group(), labels[name]);
    const parts = (kit.assets as Record<string, Array<{ material: string; position: number[]; normal: number[]; index: number[] }>>)[name];
    for (const [partIndex, part] of parts.entries()) {
        const config = (kit.materials as Record<string, { color: number[]; roughness: number; metalness: number }>)[part.material];
        const cacheKey = `${name}:${partIndex}`;
        let geometry = geometryCache.get(cacheKey);
        if (!geometry) {
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
            geometry.setIndex(part.index);
            geometry.computeBoundingBox(); geometry.computeBoundingSphere();
            geometryCache.set(cacheKey, geometry);
        }
        const color = new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2], THREE.LinearSRGBColorSpace);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ name: part.material, color, roughness: config.roughness, metalness: config.metalness }));
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
    }
    return group;
}
