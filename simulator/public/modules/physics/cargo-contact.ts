import {
    DEFAULT_CARGO_MASS_KG,
    DEFAULT_CARGO_PHYSICS_MATERIAL,
    GROUND_PHYSICS_MATERIAL,
    resolvePhysicsMaterial,
    type PhysicsMaterial
} from './materials.js';

export type CargoVelocity = {
    x: number;
    y: number;
    z: number;
};

export type CargoStepState = {
    position: CargoVelocity;
    velocity: CargoVelocity;
    touchedGround: boolean;
    stoppedByStaticFriction: boolean;
    effectiveStaticFriction: number;
    effectiveDynamicFriction: number;
};

type SimulateDetachedCargoStepArgs = {
    position: CargoVelocity;
    velocity: CargoVelocity;
    dt: number;
    airDrag?: number;
    cargoMassKg?: number;
    cargoMaterial?: Partial<PhysicsMaterial> | null;
    groundMaterial?: Partial<PhysicsMaterial> | null;
};

const CARGO_GRAVITY = 9.81;
const GROUND_Z = 0;
const GROUND_EPSILON = 1e-4;
const MIN_BOUNCE_SPEED = 0.35;
const REST_VERTICAL_SPEED = 0.08;
const REST_TANGENTIAL_SPEED = 0.12;
const LANDING_GRIP_FACTOR = 1.35;

function combineContactMaterials(
    cargoMaterial: Partial<PhysicsMaterial> | null | undefined,
    groundMaterial: Partial<PhysicsMaterial> | null | undefined
) {
    const cargo = resolvePhysicsMaterial(cargoMaterial, DEFAULT_CARGO_PHYSICS_MATERIAL);
    const ground = resolvePhysicsMaterial(groundMaterial, GROUND_PHYSICS_MATERIAL);
    return {
        staticFriction: Math.sqrt(cargo.staticFriction * ground.staticFriction),
        dynamicFriction: Math.sqrt(cargo.dynamicFriction * ground.dynamicFriction),
        restitution: (cargo.restitution + ground.restitution) * 0.5
    };
}

function applyGroundFriction(
    velocity: CargoVelocity,
    cargoMassKg: number,
    dt: number,
    impactSpeed: number,
    staticFriction: number,
    dynamicFriction: number
) {
    const tangentialSpeed = Math.hypot(velocity.x, velocity.y);
    if (tangentialSpeed <= REST_TANGENTIAL_SPEED) {
        velocity.x = 0;
        velocity.y = 0;
        return true;
    }

    const supportImpulse = cargoMassKg * CARGO_GRAVITY * dt;
    const impactImpulse = cargoMassKg * impactSpeed * LANDING_GRIP_FACTOR;
    const tangentialMomentum = cargoMassKg * tangentialSpeed;
    const staticImpulseLimit = staticFriction * (supportImpulse + impactImpulse);

    if (tangentialMomentum <= staticImpulseLimit) {
        velocity.x = 0;
        velocity.y = 0;
        return true;
    }

    const dynamicImpulse = dynamicFriction * (supportImpulse + impactImpulse);
    const nextTangentialMomentum = Math.max(0, tangentialMomentum - dynamicImpulse);
    const nextTangentialSpeed = nextTangentialMomentum / cargoMassKg;
    const scale = nextTangentialSpeed / tangentialSpeed;

    velocity.x *= scale;
    velocity.y *= scale;

    if (nextTangentialSpeed <= REST_TANGENTIAL_SPEED) {
        velocity.x = 0;
        velocity.y = 0;
    }

    return false;
}

export function simulateDetachedCargoStep({
    position,
    velocity,
    dt,
    airDrag = 0,
    cargoMassKg = DEFAULT_CARGO_MASS_KG,
    cargoMaterial,
    groundMaterial
}: SimulateDetachedCargoStepArgs): CargoStepState {
    const nextVelocity: CargoVelocity = { ...velocity };
    const nextPosition: CargoVelocity = { ...position };
    const contactMaterial = combineContactMaterials(cargoMaterial, groundMaterial);
    const grounded = position.z <= GROUND_EPSILON && Math.abs(velocity.z) <= REST_VERTICAL_SPEED;

    nextVelocity.x -= nextVelocity.x * airDrag * dt;
    nextVelocity.y -= nextVelocity.y * airDrag * dt;

    if (!grounded) {
        nextVelocity.z -= CARGO_GRAVITY * dt;
    } else {
        nextVelocity.z = 0;
    }

    const predictedZ = grounded ? GROUND_Z : position.z + nextVelocity.z * dt;
    if (predictedZ > GROUND_Z) {
        nextPosition.x += nextVelocity.x * dt;
        nextPosition.y += nextVelocity.y * dt;
        nextPosition.z = predictedZ;
        return {
            position: nextPosition,
            velocity: nextVelocity,
            touchedGround: false,
            stoppedByStaticFriction: false,
            effectiveStaticFriction: contactMaterial.staticFriction,
            effectiveDynamicFriction: contactMaterial.dynamicFriction
        };
    }

    const impactSpeed = grounded ? 0 : Math.max(0, -nextVelocity.z);
    const stoppedByStaticFriction = applyGroundFriction(
        nextVelocity,
        cargoMassKg,
        dt,
        impactSpeed,
        contactMaterial.staticFriction,
        contactMaterial.dynamicFriction
    );

    nextVelocity.z = impactSpeed > MIN_BOUNCE_SPEED ? -impactSpeed * contactMaterial.restitution : 0;
    if (Math.abs(nextVelocity.z) <= REST_VERTICAL_SPEED) {
        nextVelocity.z = 0;
    }

    nextPosition.x += nextVelocity.x * dt;
    nextPosition.y += nextVelocity.y * dt;
    nextPosition.z = GROUND_Z;

    return {
        position: nextPosition,
        velocity: nextVelocity,
        touchedGround: true,
        stoppedByStaticFriction,
        effectiveStaticFriction: contactMaterial.staticFriction,
        effectiveDynamicFriction: contactMaterial.dynamicFriction
    };
}
