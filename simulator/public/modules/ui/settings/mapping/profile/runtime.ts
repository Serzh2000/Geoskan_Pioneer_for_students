import type { DeviceProfile } from '../../types.js';

export function getDuplicateSourceConflicts(profile: Pick<DeviceProfile, 'channelMappings'>): Array<{ sourceId: string; channels: number[] }> {
    const bySource = new Map<string, number[]>();
    for (const mapping of profile.channelMappings) {
        if (!mapping.sourceId) continue;
        const existing = bySource.get(mapping.sourceId) ?? [];
        existing.push(mapping.channel);
        bySource.set(mapping.sourceId, existing);
    }
    return Array.from(bySource.entries())
        .filter(([, channels]) => channels.length > 1)
        .map(([sourceId, channels]) => ({ sourceId, channels }));
}

export function detectMappingConflicts(profile: Pick<DeviceProfile, 'channelMappings' | 'controlBindings'>): string[] {
    const conflicts: string[] = [];
    for (const duplicate of getDuplicateSourceConflicts(profile)) {
        conflicts.push(`Источник ${duplicate.sourceId} назначен одновременно на ${duplicate.channels.map((channel) => `CH${channel}`).join(', ')}.`);
    }
    for (const binding of profile.controlBindings) {
        if (binding.channel === null) continue;
        const mapping = profile.channelMappings.find((item) => item.channel === binding.channel) ?? null;
        if (!mapping?.sourceId) {
            conflicts.push(`Команда ${binding.action} назначена на CH${binding.channel}, но источник для канала не выбран.`);
        }
    }
    return conflicts;
}

