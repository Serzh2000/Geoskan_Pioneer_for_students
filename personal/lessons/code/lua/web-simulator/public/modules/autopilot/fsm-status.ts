export type FsmStatus =
    | 'IDLE'
    | 'PREFLIGHT'
    | 'TAKEOFF_PROCESS'
    | 'FLYING_HOVER'
    | 'FLYING_MOVING'
    | 'LANDING_PROCESS';

export function isPointReachedFromFsmStatus(fsmState: FsmStatus | string | null, pointReachedFlag?: boolean): boolean {
    if (!fsmState) {
        return false;
    }

    if (fsmState === 'FLYING_HOVER' && pointReachedFlag) {
        return true;
    }

    if (fsmState === 'FLYING_MOVING') {
        return true;
    }

    return false;
}
