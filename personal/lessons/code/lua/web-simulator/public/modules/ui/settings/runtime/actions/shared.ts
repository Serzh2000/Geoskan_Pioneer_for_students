import type { DeviceProfile } from '../../types.js';
import { cloneProfile, getActiveProfile, replaceActiveProfile } from '../profile.js';
import { updateRcInputRuntime } from '../core.js';

export function commitProfile(profile: DeviceProfile): void {
    replaceActiveProfile(profile);
    updateRcInputRuntime();
}

export function mutateActiveProfile(mutator: (profile: DeviceProfile) => void): void {
    const profile = cloneProfile(getActiveProfile());
    mutator(profile);
    commitProfile(profile);
}

export { cloneProfile, getActiveProfile, replaceActiveProfile };
