import * as THREE from 'three';

const explodedDrones = new Set<string>();

export function explodeDrone(id: string, mesh: THREE.Object3D) {
    if (explodedDrones.has(id)) return;
    explodedDrones.add(id);

    const partsToExplode: THREE.Object3D[] = [];
    try {
        const mainComponents = [
            mesh.getObjectByName('frame'),
            mesh.getObjectByName('leds'),
            mesh.getObjectByName('camera_antenna'),
            mesh.getObjectByName('motors_group')
        ].filter(Boolean) as THREE.Object3D[];

        if (mainComponents.length > 0) {
            mainComponents.forEach((comp) => {
                if (comp.name === 'motors_group') {
                    const subParts = [...comp.children];
                    subParts.forEach((part) => partsToExplode.push(part));
                } else {
                    partsToExplode.push(comp);
                }
            });
        } else {
            partsToExplode.push(...mesh.children);
        }

        partsToExplode.forEach((part) => {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();

            part.getWorldPosition(worldPos);
            part.getWorldQuaternion(worldQuat);
            part.getWorldScale(worldScale);

            part.userData.originalParent = part.parent;
            part.userData.originalPos = part.position.clone();
            part.userData.originalRot = part.rotation.clone();
            part.userData.originalScale = part.scale.clone();

            mesh.add(part);

            mesh.worldToLocal(worldPos);
            part.position.copy(worldPos);
            part.quaternion.copy(worldQuat);

            part.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                Math.random() * 5 + 3
            );

            part.userData.rotVel = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );
        });
    } catch (e) {
        console.error(`[Visuals Error] Error in explodeDrone for ${id}:`, e);
    }
}

export function resetDroneVisuals(id: string, mesh: THREE.Object3D) {
    if (!explodedDrones.has(id)) return;
    explodedDrones.delete(id);

    const parts = [...mesh.children];
    parts.forEach((part) => {
        if (!part.userData.originalParent) return;
        part.userData.originalParent.add(part);
        part.position.copy(part.userData.originalPos);
        part.rotation.copy(part.userData.originalRot);
        part.scale.copy(part.userData.originalScale);

        delete part.userData.originalParent;
        delete part.userData.originalPos;
        delete part.userData.originalRot;
        delete part.userData.originalScale;
        delete part.userData.vel;
        delete part.userData.rotVel;
    });
}

export function updateDebrisVisuals(mesh: THREE.Object3D, dt: number) {
    try {
        mesh.children.forEach((part) => {
            if (!part.userData.vel) return;
            const vel = part.userData.vel as THREE.Vector3;
            const rotVel = part.userData.rotVel as THREE.Vector3;

            // Если объект уже "лежит" на земле, ничего не делаем
            if (vel.lengthSq() < 0.0001 && rotVel.lengthSq() < 0.0001) return;

            part.position.addScaledVector(vel, dt);
            part.rotation.x += rotVel.x * dt;
            part.rotation.y += rotVel.y * dt;
            part.rotation.z += rotVel.z * dt;

            vel.z -= 15.0 * dt; // Gravity

            const friction = 1.0 - 1.2 * dt;
            vel.x *= friction;
            vel.y *= friction;
            rotVel.multiplyScalar(1.0 - 2.5 * dt);

            const worldZ = mesh.position.z + part.position.z;
            if (worldZ > 0.01) return;

            // Отскок или остановка
            part.position.z = -mesh.position.z + 0.01;
            if (Math.abs(vel.z) > 1.5) {
                vel.z *= -0.3; // bounce
                vel.x *= 0.6;
                vel.y *= 0.6;
                return;
            }

            // Полная остановка и укладывание плашмя
            vel.set(0, 0, 0);
            rotVel.set(0, 0, 0);
            
            // Укладываем плашмя (обычно по X или Y наклоняем на 90 градусов)
            part.rotation.x = Math.round(part.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
            part.rotation.z = Math.round(part.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
        });
    } catch (e) {
        console.error(`[Visuals Error] Error in updateDebrisVisuals:`, e);
    }
}
