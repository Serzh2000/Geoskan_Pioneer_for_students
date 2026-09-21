/**
 * Small additive glow billboard attached to each addressable LED.
 *
 * A lit LED's own mesh is only a few millimetres across, and this project has
 * no bloom/post-processing pass (ACES tone mapping alone doesn't make a
 * bright emissive surface visibly "glow" beyond its own tiny silhouette). At
 * normal camera distance that makes it hard to tell which of the 29 pixels
 * are actually on. A soft radial-gradient sprite, always facing the camera,
 * fakes that glow cheaply — no renderer/composer changes needed.
 */
import * as THREE from 'three';

let sharedGlowTexture: THREE.Texture | null = null;

// Built lazily and guarded against a missing DOM: the Blender-asset attach
// path this feeds into (`attachBlenderModel`) also runs directly under the
// test suite's plain-Node environment (no `document`), so this must degrade
// to a harmless blank texture there instead of throwing.
function getGlowTexture(): THREE.Texture {
    if (sharedGlowTexture) return sharedGlowTexture;
    if (typeof document === 'undefined') {
        sharedGlowTexture = new THREE.Texture();
        return sharedGlowTexture;
    }
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    sharedGlowTexture = texture;
    return texture;
}

const LED_GLOW_NAME = 'led_glow_sprite';

/**
 * `maxDiameter` is in scene units (caller converts from millimetres via
 * `CAD_MM_TO_SCENE_SCALE`) and is the sprite's size when the LED is at full
 * brightness; it shrinks a little at lower brightness. The sprite is created
 * at local origin — position it explicitly (same as the LED's point light,
 * usually a small offset off the LED's own surface to avoid z-fighting with
 * the lens/package mesh underneath it).
 */
export function createLedGlowSprite(maxDiameter: number): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // Additive + not tone-mapped: this glow should punch through the
        // scene's ACES curve at full saturation instead of being compressed
        // like the studio-lit geometry around it (same reasoning as the LED
        // mesh material itself in drone-model/index.ts).
        toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = LED_GLOW_NAME;
    sprite.scale.setScalar(maxDiameter);
    sprite.visible = false;
    sprite.userData.maxDiameter = maxDiameter;
    sprite.renderOrder = 6;
    return sprite;
}

export function findLedGlowSprite(ledObject: THREE.Object3D): THREE.Sprite | undefined {
    return ledObject.children.find(
        (child): child is THREE.Sprite => child instanceof THREE.Sprite && child.name === LED_GLOW_NAME
    );
}

/** Drives a glow sprite from the same color/strength used to tint the LED's own material. */
export function updateLedGlowSprite(sprite: THREE.Sprite | undefined, color: THREE.Color, strength: number): void {
    if (!sprite) return;
    if (strength <= 0) {
        sprite.visible = false;
        return;
    }
    sprite.visible = true;
    const material = sprite.material as THREE.SpriteMaterial;
    material.color.copy(color);
    material.opacity = Math.min(1, 0.35 + strength * 0.65);
    const maxDiameter = (sprite.userData.maxDiameter as number) ?? 1;
    sprite.scale.setScalar(maxDiameter * (0.55 + strength * 0.45));
}
