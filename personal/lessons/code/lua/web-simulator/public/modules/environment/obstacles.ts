/**
 * Реэкспорт всех объектов окружения из подмодулей.
 */
export * from './obstacles/types.js';
export * from './obstacles/utils.js';
export * from './obstacles/markers.js';
export * from './obstacles/linear.js';
export * from './obstacles/buildings.js';
export * from './obstacles/nature.js';
export * from './obstacles/competition.js';
export * from './obstacles/pads.js';
export * from './obstacles/arena.js';
export * from './obstacles/presets.js';
export * from './obstacles/vehicles.js';

import { Group } from 'three';
export function createObstacles(_envGroup: Group) {
    // По умолчанию оставляем вокруг площадки больше свободного пространства.
}
