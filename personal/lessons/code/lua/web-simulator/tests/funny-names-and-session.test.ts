import {
    FUNNY_NAME_COUNT,
    randomFunnyName,
    resetFunnyNames,
    sceneFileName,
    scriptFileName
} from '../public/modules/shared/funny-names.js';
import {
    dronePoseForRestore,
    GROUND_TOLERANCE,
    parseSceneSession,
    SESSION_VERSION,
    type DronePose
} from '../public/modules/app/scene-session-data.js';

describe('names of downloaded files', () => {
    beforeEach(() => resetFunnyNames());

    it('are two lowercase words joined by a dash', () => {
        for (let i = 0; i < 50; i += 1) expect(randomFunnyName()).toMatch(/^[a-z]+-[a-z]+$/);
    });

    it('give a script its extension and a scene a "scene-" prefix', () => {
        expect(scriptFileName('lua')).toMatch(/^[a-z]+-[a-z]+\.lua$/);
        expect(scriptFileName('py')).toMatch(/^[a-z]+-[a-z]+\.py$/);
        expect(sceneFileName()).toMatch(/^scene-[a-z]+-[a-z]+\.json$/);
    });

    it('do not repeat within a session, even when the random source keeps repeating itself', () => {
        const names = new Set<string>();
        for (let i = 0; i < 200; i += 1) names.add(randomFunnyName());
        expect(names.size).toBe(200);
        resetFunnyNames();
        const stuck = new Set<string>();
        for (let i = 0; i < 5; i += 1) stuck.add(randomFunnyName(() => 0.5));
        expect(stuck.size).toBe(5);
    });

    it('are deterministic with an injected random source', () => {
        expect(randomFunnyName(() => 0)).toBe('funny-rabbit');
    });

    it('come from a pool large enough that a class does not meet the same name twice', () => {
        expect(FUNNY_NAME_COUNT).toBeGreaterThanOrEqual(1000);
    });
});

describe('the saved scene session', () => {
    const session = (extra: Record<string, unknown> = {}) =>
        JSON.stringify({
            version: SESSION_VERSION,
            savedAt: 5,
            objects: [{ sceneType: 'gate', position: { x: 1, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }],
            drones: { drone_1: { x: 1, y: -2, z: 0, pitch: 0, roll: 0, yaw: 1.5 } },
            ...extra
        });

    it('reads back what was saved', () => {
        const parsed = parseSceneSession(session());
        expect(parsed?.objects).toHaveLength(1);
        expect(parsed?.drones.drone_1.yaw).toBe(1.5);
    });

    it('ignores nothing saved, damaged data and other versions', () => {
        expect(parseSceneSession(null)).toBeNull();
        expect(parseSceneSession('')).toBeNull();
        expect(parseSceneSession('{not json')).toBeNull();
        expect(parseSceneSession(session({ version: 99 }))).toBeNull();
        expect(parseSceneSession(session({ objects: 'no' }))).toBeNull();
    });

    it('drops a damaged drone pose but keeps the rest', () => {
        const parsed = parseSceneSession(session({ drones: { a: { x: 1 }, b: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: Number.NaN } } }));
        expect(parsed?.drones).toEqual({});
        expect(parsed?.objects).toHaveLength(1);
    });

    describe('puts the drone back', () => {
        const pose = (patch: Partial<DronePose>): DronePose => ({ x: 3, y: 4, z: 0, pitch: 0, roll: 0, yaw: 1, ...patch });

        it('where it stood on the ground, facing the same way', () => {
            expect(dronePoseForRestore(pose({}))).toEqual(pose({}));
        });

        it('on the ground, level, at the same spot when the page closed in flight', () => {
            expect(dronePoseForRestore(pose({ z: 1.4, pitch: 0.2, roll: -0.1 }))).toEqual(pose({ z: 0, pitch: 0, roll: 0 }));
        });

        it('on a hair above the ground still counts as standing', () => {
            expect(dronePoseForRestore(pose({ z: GROUND_TOLERANCE })).z).toBe(GROUND_TOLERANCE);
        });
    });
});
