import * as THREE from 'three';
import { setCommonMeta, applyShadows } from '../utils.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';

export function createVideoTowerMesh() {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.VIDEO_TOWER, {
        collidableRadius: 0.55,
        connectable: true,
        connectionRadius: 8,
        streamHeight: 3.15
    });
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.3 });
    const braceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.22 });
    const cameraMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.48, metalness: 0.38 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.18 });
    const upAxis = new THREE.Vector3(0, 1, 0);

    const addStrut = (start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) => {
        const delta = end.clone().sub(start);
        const length = delta.length();
        if (length < 0.0001) return;
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(upAxis, delta.normalize());
        group.add(mesh);
    };

    const baseFeet = [
        new THREE.Vector3(-0.34, -0.24, 0.02),
        new THREE.Vector3(0.34, -0.24, 0.02),
        new THREE.Vector3(0, 0.38, 0.02)
    ];
    const crownPoints = [
        new THREE.Vector3(-0.1, -0.06, 2.7),
        new THREE.Vector3(0.1, -0.06, 2.7),
        new THREE.Vector3(0, 0.12, 2.7)
    ];

    baseFeet.forEach((foot, index) => {
        const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.035, 12), braceMat);
        shoe.rotation.x = Math.PI / 2;
        shoe.position.copy(foot);
        group.add(shoe);
        addStrut(foot, crownPoints[index], 0.022, mastMat);
    });

    addStrut(new THREE.Vector3(-0.22, -0.15, 1.15), new THREE.Vector3(0.22, -0.15, 1.15), 0.012, braceMat);
    addStrut(new THREE.Vector3(-0.18, 0.18, 1.5), new THREE.Vector3(0.18, 0.18, 1.5), 0.012, braceMat);
    addStrut(new THREE.Vector3(-0.14, -0.08, 2.05), new THREE.Vector3(0.14, 0.16, 2.05), 0.01, braceMat);
    addStrut(new THREE.Vector3(0.14, -0.08, 2.05), new THREE.Vector3(-0.14, 0.16, 2.05), 0.01, braceMat);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 14), mastMat);
    mast.rotation.x = Math.PI / 2;
    mast.position.z = 1.45;
    group.add(mast);

    const serviceBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.18), cameraMat);
    serviceBox.position.set(0, -0.08, 1.05);
    group.add(serviceBox);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 20), braceMat);
    platform.rotation.x = Math.PI / 2;
    platform.position.z = 2.76;
    group.add(platform);

    const cameraHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.22), cameraMat);
    cameraHead.position.set(0, 0.02, 3.05);
    group.add(cameraHead);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.2, 20), lensMat);
    lens.position.set(0, 0.22, 3.05);
    lens.rotation.x = Math.PI / 2;
    group.add(lens);

    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.01, 12, 24), accentMat);
    lensRing.position.set(0, 0.32, 3.05);
    lensRing.rotation.x = Math.PI / 2;
    group.add(lensRing);

    const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x22d3ee, emissiveIntensity: 0.35 })
    );
    monitor.position.set(-0.14, -0.12, 3.08);
    group.add(monitor);

    group.userData.getContextMenuActions = () => ({
        infoTitle: 'О видеомачте',
        infoItems: [
            {
                title: 'Что это',
                text: 'Стационарный источник видеопотока для задач компьютерного зрения и отладки работы с камерой.'
            },
            {
                title: 'Как пользоваться',
                text: 'Разместите мачту рядом с нужной зоной, подведите к ней дрон на расстояние до 8 м и подключитесь из программы через pioneer_camera_connect(). После этого можно проверять связь через pioneer_camera_connected() и получать кадры через pioneer_camera_get_frame() или pioneer_camera_get_cv_frame().'
            }
        ]
    });

    applyShadows(group);
    return group;
}
