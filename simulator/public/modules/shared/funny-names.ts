/*
 * Names for the files the student downloads: "funny-rabbit.lua", "scene-grumpy-cat.json". A browser would otherwise
 * produce a pile of "pioneer-script (7).lua"; two words are easy to tell apart and to say aloud in a classroom.
 * The lists are curated (no names that could read as rude in either language) and the same name is not handed out
 * twice in one session.
 */

const ADJECTIVES = [
    'funny', 'grumpy', 'sleepy', 'brave', 'clever', 'happy', 'lazy', 'jolly', 'fluffy', 'speedy',
    'sneaky', 'cheerful', 'dizzy', 'mighty', 'tiny', 'curious', 'gentle', 'hungry', 'lucky', 'noisy',
    'quiet', 'shiny', 'silly', 'sunny', 'wild', 'witty', 'bouncy', 'calm', 'cozy', 'daring',
    'eager', 'fancy', 'goofy', 'humble', 'merry', 'nimble', 'proud', 'quirky', 'snappy', 'zesty'
] as const;

const ANIMALS = [
    'rabbit', 'cat', 'fox', 'panda', 'owl', 'otter', 'penguin', 'hedgehog', 'koala', 'turtle',
    'dolphin', 'giraffe', 'hamster', 'squirrel', 'badger', 'beaver', 'camel', 'duck', 'falcon', 'frog',
    'goat', 'lemur', 'llama', 'moose', 'narwhal', 'octopus', 'parrot', 'puffin', 'raccoon', 'seal',
    'sloth', 'tiger', 'walrus', 'yak', 'zebra', 'ferret', 'gecko', 'lynx', 'marmot', 'quokka'
] as const;

export const FUNNY_NAME_COUNT = ADJECTIVES.length * ANIMALS.length;

const handedOut = new Set<string>();

/** Picks a name like `funny-rabbit`; `random` is injectable so tests can be deterministic. */
export function randomFunnyName(random: () => number = Math.random): string {
    // Almost always the first draw is new (1600 names); the loop only matters after a long session.
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length) % ADJECTIVES.length];
        const animal = ANIMALS[Math.floor(random() * ANIMALS.length) % ANIMALS.length];
        const name = `${adjective}-${animal}`;
        if (!handedOut.has(name)) {
            handedOut.add(name);
            return name;
        }
    }
    // Every draw collided: add a number so the file still gets a distinct name.
    const numbered = `${ADJECTIVES[0]}-${ANIMALS[0]}-${handedOut.size + 1}`;
    handedOut.add(numbered);
    return numbered;
}

export function scriptFileName(extension: string, random?: () => number): string {
    return `${randomFunnyName(random)}.${extension}`;
}

export function sceneFileName(random?: () => number): string {
    return `scene-${randomFunnyName(random)}.json`;
}

/** Forgets the names already handed out (tests). */
export function resetFunnyNames(): void {
    handedOut.clear();
}
