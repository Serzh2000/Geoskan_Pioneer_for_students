import type { ChapterExamples, LessonExample } from '../example.js';
import { ARUCO_EXAMPLES } from './aruco.js';
import { CAMERA_EXAMPLES } from './camera.js';
import { CODE_EXAMPLES } from './code.js';
import { COORDINATES_EXAMPLES } from './coordinates.js';
import { DRONE_EXAMPLES } from './drone.js';
import { LIGHTS_EXAMPLES } from './lights.js';
import { MISSIONS_EXAMPLES } from './missions.js';
import { ROUTES_EXAMPLES } from './routes.js';
import { TELEMETRY_EXAMPLES } from './telemetry.js';
import { TERRAIN_EXAMPLES } from './terrain.js';
import { TIME_EXAMPLES } from './time.js';
import { TOPIC_EXAMPLES } from './topics.js';
import { VISUAL_NAVIGATION_EXAMPLES } from './visual-navigation.js';

const COURSE: ChapterExamples = {
    ...DRONE_EXAMPLES, ...LIGHTS_EXAMPLES, ...CODE_EXAMPLES, ...TIME_EXAMPLES, ...COORDINATES_EXAMPLES, ...ROUTES_EXAMPLES,
    ...TERRAIN_EXAMPLES, ...TELEMETRY_EXAMPLES, ...CAMERA_EXAMPLES, ...ARUCO_EXAMPLES, ...VISUAL_NAVIGATION_EXAMPLES, ...MISSIONS_EXAMPLES
};

export function courseExample(number: number): LessonExample | undefined {
    return COURSE[number];
}

export function topicExample(topic: string): LessonExample | undefined {
    return TOPIC_EXAMPLES[topic];
}

export const COURSE_EXAMPLE_NUMBERS: number[] = Object.keys(COURSE).map(Number);
export const TOPIC_EXAMPLE_IDS: string[] = Object.keys(TOPIC_EXAMPLES);
