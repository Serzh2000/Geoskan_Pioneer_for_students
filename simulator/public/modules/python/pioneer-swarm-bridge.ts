import { droneSdk } from '../core/drone-models.js';
import { drones } from '../core/state.js';
import { simClock } from '../physics/sim-clock.js';
import { log } from '../shared/logging/logger.js';
import { assignMachineIds } from './swarm/machine-id.js';

/*
 * JS-сторона эмуляции Swarm Kit (swarm/prelude.ts, модуль pioneer_swarm). Сеть роя живёт в Python, а здесь -
 * то, что знает только симулятор: какие дроны на связи (у кого pioneer_sdk2, то есть Pioneer OS со swarm-server),
 * их machine_id, время и состояние для потоков телеметрии. Обмен с Python идёт строками JSON.
 */

/** machine_id дрона по имени и порядку в списке «Рой» (для панели). Для дрона, которого нет, - null. */
export function swarmMachineIdOf(droneId: string): string | null {
    const ids = assignMachineIds(Object.keys(drones).map((id) => ({ id, name: drones[id].name })));
    return ids.get(droneId) ?? null;
}

/** Дроны, на которых есть swarm-server: Мини 2 и Базовый с Radxa (pioneer_sdk2). Остальные в рое не появляются. */
export function swarmUnitRows(): Array<{ drone: string; machine_id: string; name: string; model: string }> {
    const ids = assignMachineIds(Object.keys(drones).map((id) => ({ id, name: drones[id].name })));
    return Object.keys(drones)
        .filter((id) => droneSdk(drones[id]) === 'pioneer_sdk2')
        .map((id) => ({ drone: id, machine_id: ids.get(id) ?? id, name: drones[id].name, model: String(drones[id].model) }));
}

/** Состояние дрона для потоков телеметрии (поля те же, что у ros2_state, без дорогих датчиков). */
export function swarmStateOf(id: string) {
    const d = drones[id];
    if (!d) return null;
    return {
        fsm: String(d.fsmState),
        status: String(d.status),
        time: d.current_time,
        pos: [d.pos.x, d.pos.y, d.pos.z],
        vel: [d.vel.x, d.vel.y, d.vel.z],
        accel: [d.accel.x, d.accel.y, d.accel.z],
        gyro: [d.gyro.x, d.gyro.y, d.gyro.z],
        rpy: [d.orientation.roll, d.orientation.pitch, d.orientation.yaw],
        battery: d.batteryVoltage,
        low1: Boolean(d.batteryLowVoltage1Notified),
        low2: Boolean(d.batteryLowVoltage2Notified)
    };
}

export function installSwarmRuntimeAPI(w: Record<string, unknown>) {
    w.swarm_units = () => JSON.stringify(swarmUnitRows());
    w.swarm_state = (id: string) => {
        const state = swarmStateOf(String(id));
        return state ? JSON.stringify(state) : '';
    };
    // Общие часы симуляции: идут и тогда, когда ни у одного дрона нет программы (drone.current_time в этом случае стоит).
    w.swarm_clock = () => simClock();
    w.swarm_exists = (id: string) => drones[String(id)] !== undefined;
    w.swarm_log = (text: string) => {
        log(`[Рой] ${String(text ?? '')}`, 'info');
        return null;
    };
}
