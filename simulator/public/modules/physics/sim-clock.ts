/*
 * Общие часы симуляции: секунды физики с загрузки страницы, идут с каждым шагом updatePhysics независимо от того,
 * работает ли у дронов программа (drone.current_time у дрона без программы стоит). Нужны сети роя (Swarm Kit,
 * python/swarm): Heartbeat и таймауты соседей, у которых нет программ, не должны зависеть от времени чужого дрона.
 */
let simTime = 0;

export function advanceSimClock(dt: number): void {
    simTime += dt;
}

export function simClock(): number {
    return simTime;
}
