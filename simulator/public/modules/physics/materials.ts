export type PhysicsMaterial = {
    staticFriction: number;
    dynamicFriction: number;
    restitution: number;
};

export const DEFAULT_CARGO_MASS_KG = 0.35;

export const DEFAULT_CARGO_PHYSICS_MATERIAL: PhysicsMaterial = Object.freeze({
    staticFriction: 1.35,
    dynamicFriction: 1.1,
    restitution: 0.04
});

export const GROUND_PHYSICS_MATERIAL: PhysicsMaterial = Object.freeze({
    staticFriction: 1.45,
    dynamicFriction: 1.2,
    restitution: 0.02
});

export function resolvePhysicsMaterial(
    material: Partial<PhysicsMaterial> | null | undefined,
    fallback: PhysicsMaterial
): PhysicsMaterial {
    return {
        staticFriction: typeof material?.staticFriction === 'number' ? material.staticFriction : fallback.staticFriction,
        dynamicFriction: typeof material?.dynamicFriction === 'number' ? material.dynamicFriction : fallback.dynamicFriction,
        restitution: typeof material?.restitution === 'number' ? material.restitution : fallback.restitution
    };
}
