/*
 * machine_id юнитов роя (Swarm Kit) в симуляторе. У настоящего дрона идентификатор определяется с борта;
 * у дрона симулятора - по его имени и месту в списке панели «Рой»: «Пионер Мини 2 · 3» -> pioneer3.
 * Идентификатор детерминирован: зависит только от имён и порядка дронов, не от времени и не от того, что в них запущено.
 */
export interface SwarmDroneName {
    id: string;
    name: string;
}

/** Номер из конца имени: «Пионер Базовый 1» -> 1, «Пионер Мини 2 · 3» -> 3. */
function trailingNumber(name: string): number | null {
    const match = /(\d+)\s*$/.exec(name);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Раздаёт machine_id вида pioneer<N>. Номер берётся из имени, если он свободен; остальным достаётся
 * наименьший свободный. Результат: id дрона -> machine_id.
 */
export function assignMachineIds(drones: readonly SwarmDroneName[]): Map<string, string> {
    const used = new Set<number>();
    const result = new Map<string, number>();
    for (const drone of drones) {
        const wanted = trailingNumber(drone.name);
        if (wanted !== null && !used.has(wanted)) {
            used.add(wanted);
            result.set(drone.id, wanted);
        }
    }
    let next = 1;
    for (const drone of drones) {
        if (result.has(drone.id)) continue;
        while (used.has(next)) next += 1;
        used.add(next);
        result.set(drone.id, next);
    }
    // В порядке дронов в списке, а не в порядке раздачи.
    return new Map(drones.map((drone) => [drone.id, `pioneer${result.get(drone.id)}`]));
}
