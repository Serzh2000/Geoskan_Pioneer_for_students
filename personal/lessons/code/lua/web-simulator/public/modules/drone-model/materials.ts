/**
 * Материалы модели дрона. Каждый материал — это отдельный вызов отрисовки,
 * поэтому их намеренно мало: тёмный композит рамы, оранжевые акценты,
 * металл втулок, прозрачный поликарбонат защиты, светодиоды и указатель.
 */
import * as THREE from 'three';

export type DroneMaterials = {
    frame: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    guard: THREE.MeshStandardMaterial;
    led: THREE.MeshBasicMaterial;
    arrow: THREE.MeshBasicMaterial;
};

/**
 * Создаёт комплект материалов для одного экземпляра модели.
 * Материалы не шарятся между дронами: у каждого дрона свой набор, чтобы
 * подсветка/разрушение одного борта не влияли на остальных.
 */
export function createDroneMaterials(): DroneMaterials {
    return {
        // Стеклопластиковая рама и пластиковые детали — почти чёрные, матовые.
        frame: new THREE.MeshStandardMaterial({
            color: 0x1b1b1f,
            roughness: 0.62,
            metalness: 0.18
        }),
        // Фирменный оранжевый: колокола моторов и лопасти винтов.
        accent: new THREE.MeshStandardMaterial({
            color: 0xf2661a,
            roughness: 0.45,
            metalness: 0.12
        }),
        // Металлические втулки и оправа объектива.
        metal: new THREE.MeshStandardMaterial({
            color: 0xb9bec6,
            roughness: 0.28,
            metalness: 0.9
        }),
        // Прозрачная поликарбонатная защита винтов.
        guard: new THREE.MeshStandardMaterial({
            color: 0xeef3f9,
            transparent: true,
            opacity: 0.34,
            roughness: 0.12,
            metalness: 0.05,
            side: THREE.DoubleSide,
            depthWrite: false
        }),
        // Светодиоды: без освещения, цвет приходит из instanceColor.
        // vertexColors обязателен — иначе фрагментный шейдер не читает vColor.
        led: new THREE.MeshBasicMaterial({
            vertexColors: true,
            toneMapped: false
        }),
        // Указатель «вперёд».
        arrow: new THREE.MeshBasicMaterial({
            color: 0xffe14d,
            transparent: true,
            opacity: 0.8,
            toneMapped: false
        })
    };
}

/** Освобождает GPU-ресурсы комплекта материалов. */
export function disposeDroneMaterials(materials: DroneMaterials) {
    Object.values(materials).forEach((material) => material.dispose());
}
