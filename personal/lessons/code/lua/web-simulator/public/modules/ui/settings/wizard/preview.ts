import * as THREE from 'three';
import type { GamepadInputRef } from '../../../core/state.js';
import { createDroneModel } from '../../../drone-model/index.js';
import { getPrimaryChannelStickSlot, readRefNormalizedValue } from '../input/values.js';
import type { ChannelKey, PrimaryChannelKey } from '../types.js';
import type { WizardStep } from './types.js';

type PreviewResolvers = {
    getCurrentStep: () => WizardStep;
    getDetectedRef: (channel: ChannelKey) => GamepadInputRef | null;
    getPreviewRef: (channel: ChannelKey) => GamepadInputRef | null;
    getChannelInversion: (channel: ChannelKey) => boolean;
};

export class WizardPreviewController {
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private drone: THREE.Group | null = null;
    private rotors: THREE.Object3D[] = [];

    constructor(private readonly resolvers: PreviewResolvers) {}

    ensureScene(): void {
        const viewport = document.getElementById('gp-wizard-drone-viewport');
        if (!viewport || this.renderer) {
            this.syncSize();
            return;
        }

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.className = 'gp-wizard-drone-canvas';
        viewport.replaceChildren(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 10);
        this.camera.position.set(0, -1.95, 0.7);
        this.camera.lookAt(0, 0.02, 0.16);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
        const keyLight = new THREE.DirectionalLight(0xc4f1ff, 2.6);
        keyLight.position.set(1.4, -1.8, 2.4);
        const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
        rimLight.position.set(-1.3, 1.4, 1.1);
        this.scene.add(ambientLight, keyLight, rimLight);

        this.drone = createDroneModel();
        this.drone.scale.setScalar(1.95);
        this.drone.position.z = 0.02;
        this.scene.add(this.drone);
        this.rotors = [0, 1, 2, 3]
            .map((index) => this.drone?.getObjectByName(`rotor_${index}`))
            .filter((rotor): rotor is THREE.Object3D => !!rotor);

        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(0.58, 48),
            new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.32 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = -0.02;
        this.scene.add(floor);

        this.syncSize();
        this.renderer.render(this.scene, this.camera);
    }

    syncSize(): void {
        const viewport = document.getElementById('gp-wizard-drone-viewport');
        if (!viewport || !this.renderer || !this.camera) return;
        const width = Math.max(180, viewport.clientWidth);
        const height = Math.max(180, viewport.clientHeight);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    update(gp: Gamepad): void {
        this.ensureScene();
        if (!this.renderer || !this.scene || !this.camera || !this.drone) return;

        const step = this.resolvers.getCurrentStep();
        const activeRefForCurrentStep = this.resolvers.getPreviewRef(step.channel);
        const roll = this.getCenteredPreviewValue(
            gp,
            'roll',
            step.type === 'primary' && step.channel === 'roll' ? activeRefForCurrentStep : null
        );
        const pitch = this.getCenteredPreviewValue(
            gp,
            'pitch',
            step.type === 'primary' && step.channel === 'pitch' ? activeRefForCurrentStep : null
        );
        const yaw = this.getCenteredPreviewValue(
            gp,
            'yaw',
            step.type === 'primary' && step.channel === 'yaw' ? activeRefForCurrentStep : null
        );
        const throttle = this.getThrottlePreviewValue(
            gp,
            step.type === 'primary' && step.channel === 'throttle' ? activeRefForCurrentStep : null
        );

        this.drone.position.set(roll * 0.06, -pitch * 0.04, throttle * 0.32);
        this.drone.rotation.order = 'ZYX';
        this.drone.rotation.x = pitch * 0.4;
        this.drone.rotation.y = roll * 0.42;
        this.drone.rotation.z = -yaw * 0.55;

        const rotorSpeed = 0.28 + throttle * 0.85;
        for (const [index, rotor] of this.rotors.entries()) {
            rotor.rotation.z += rotorSpeed * (index < 2 ? 1 : -1);
        }

        this.renderer.render(this.scene, this.camera);
        this.updateStickVisuals({ roll, pitch, yaw, throttle });
    }

    private getCenteredPreviewValue(gp: Gamepad, channel: PrimaryChannelKey, liveOverride: GamepadInputRef | null): number {
        const ref = liveOverride ?? this.resolvers.getPreviewRef(channel);
        if (!ref) return 0;
        return readRefNormalizedValue(gp, ref, channel, this.resolvers.getChannelInversion(channel));
    }

    private getThrottlePreviewValue(gp: Gamepad, liveOverride: GamepadInputRef | null): number {
        const ref = liveOverride ?? this.resolvers.getPreviewRef('throttle');
        if (!ref) return 0;
        return readRefNormalizedValue(gp, ref, 'throttle', this.resolvers.getChannelInversion('throttle'));
    }

    private updateStickVisuals(values: { roll: number; pitch: number; yaw: number; throttle: number }): void {
        const leftStick = document.getElementById('gp-wizard-stick-left');
        const rightStick = document.getElementById('gp-wizard-stick-right');
        if (!leftStick || !rightStick) return;

        const slots = {
            yaw: getPrimaryChannelStickSlot('yaw', this.resolvers.getPreviewRef('yaw')),
            throttle: getPrimaryChannelStickSlot('throttle', this.resolvers.getPreviewRef('throttle')),
            roll: getPrimaryChannelStickSlot('roll', this.resolvers.getPreviewRef('roll')),
            pitch: getPrimaryChannelStickSlot('pitch', this.resolvers.getPreviewRef('pitch'))
        } satisfies Record<PrimaryChannelKey, ReturnType<typeof getPrimaryChannelStickSlot>>;
        let leftX = 0;
        let leftY = 0;
        let rightX = 0;
        let rightY = 0;

        if (slots.yaw === 'left-x') leftX = values.yaw * 35;
        else if (slots.yaw === 'right-x') rightX = values.yaw * 35;
        else if (slots.yaw === 'left-y') leftY = values.yaw * 35;
        else if (slots.yaw === 'right-y') rightY = values.yaw * 35;

        if (slots.roll === 'left-x') leftX = values.roll * 35;
        else if (slots.roll === 'right-x') rightX = values.roll * 35;
        else if (slots.roll === 'left-y') leftY = values.roll * 35;
        else if (slots.roll === 'right-y') rightY = values.roll * 35;

        if (slots.pitch === 'left-x') leftX = values.pitch * 35;
        else if (slots.pitch === 'right-x') rightX = values.pitch * 35;
        else if (slots.pitch === 'left-y') leftY = values.pitch * 35;
        else if (slots.pitch === 'right-y') rightY = values.pitch * 35;

        if (slots.throttle === 'left-x') leftX = (values.throttle - 0.5) * 70;
        else if (slots.throttle === 'right-x') rightX = (values.throttle - 0.5) * 70;
        else if (slots.throttle === 'left-y') leftY = (0.5 - values.throttle) * 70;
        else if (slots.throttle === 'right-y') rightY = (0.5 - values.throttle) * 70;

        leftStick.style.transform = `translate(${leftX}px, ${leftY}px)`;
        rightStick.style.transform = `translate(${rightX}px, ${rightY}px)`;
    }
}
