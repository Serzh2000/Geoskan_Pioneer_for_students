import * as THREE from 'three';
import { loadTrainingTemplate } from '../training-props.js';
import { setCommonMeta } from '../utils.js';

const LIGHT_TOWER_BRIGHTNESS_LEVELS = [1, 0.5, 0] as const;
const LAMP_X_OFFSETS = [-0.45, -0.15, 0.15, 0.45];

let templatePromise: Promise<THREE.Group> | undefined;

function loadTemplate(): Promise<THREE.Group> {
    templatePromise ??= loadTrainingTemplate().then(scene => {
        const root = scene.getObjectByName('V2_LightTower');
        if (!root) throw new Error('Missing V2_LightTower');
        return root as THREE.Group;
    });
    return templatePromise;
}

export function createLightTowerMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Световая мачта', { collidableRadius: 0.7 });

    // Beam rigs sit at fixed offsets matching the Blender lamp housings, so they don't need
    // to wait on the async GLB load; only the glass emissive material lookup does.
    const lampGlassMaterials: THREE.MeshStandardMaterial[] = [];
    const lampBeams: THREE.SpotLight[] = [];
    LAMP_X_OFFSETS.forEach((x, index) => {
        const beam = new THREE.SpotLight(0xfff1c1, 0, 15, Math.PI / 5.5, 0.45, 2);
        beam.position.set(x, -0.1, 4.15);
        beam.castShadow = index === 1;
        if (beam.castShadow) {
            beam.shadow.mapSize.set(512, 512);
            beam.shadow.bias = -0.00015;
            beam.shadow.radius = 4;
            beam.shadow.camera.near = 0.5;
            beam.shadow.camera.far = 15;
            beam.shadow.focus = 0.9;
        }
        const target = new THREE.Object3D();
        target.position.set(x, -4.0, 0);
        group.add(target);
        beam.target = target;
        group.add(beam);
        lampBeams.push(beam);
    });

    group.userData.brightness = 1;
    group.userData.setBrightness = (val: number) => {
        const brightness = THREE.MathUtils.clamp(val, 0, 1);
        group.userData.brightness = brightness;

        const beamIntensity = 24 * brightness;
        lampGlassMaterials.forEach((material) => {
            material.emissiveIntensity = brightness;
            material.opacity = 0.18 + brightness * 0.78;
        });

        lampBeams.forEach((beam) => {
            beam.intensity = beamIntensity;
            beam.visible = brightness > 0.001;
        });
    };
    group.userData.getContextMenuActions = () => ({
        title: 'Освещение мачты',
        actions: LIGHT_TOWER_BRIGHTNESS_LEVELS.map((level) => ({
            label: level === 1 ? 'Свет: 100%' : level === 0.5 ? 'Свет: 50%' : 'Свет: выкл',
            icon: level === 1 ? '💡' : level === 0.5 ? '◐' : '○',
            active: group.userData.brightness === level,
            action: () => group.userData.setBrightness(level)
        }))
    });
    group.userData.setBrightness(1);

    void loadTemplate().then((template) => {
        const instance = template.clone(true);
        instance.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            const cloned = materials.map((material) => material.clone());
            object.material = cloned.length === 1 ? cloned[0] : cloned;
            object.castShadow = true;
            object.receiveShadow = true;
            object.frustumCulled = false;
            cloned.forEach((material) => {
                if (material.name.startsWith('V2_LampGlass') && material instanceof THREE.MeshStandardMaterial) {
                    lampGlassMaterials.push(material);
                }
            });
        });
        group.add(instance);
        group.userData.setBrightness(group.userData.brightness);
    }).catch((error) => {
        console.error('[LightTower] Failed to load model', error);
    });

    return group;
}
