import type { GuideTextLesson } from '../../types.js';
import { ACADEMY_LESSONS } from '../catalog.js';

export type VisionExercise = {
    number: number; task: string; hint: string; observation: string; experiment: string;
    question: string; right: string; wrong: string; feedback: string; code: string; answer: string;
};
export const VISION_WAIT = `def wait_for(test,limit=120):
    deadline=time.monotonic()+limit
    while time.monotonic()<deadline:
        if test(): return
        time.sleep(0.05)
    raise RuntimeError("тайм-аут ожидания")

def go(x,y,z,yaw=None):
    pioneer.go_to_local_point(x,y,z,yaw=yaw)
    wait_for(pioneer.point_reached)
`;
export const VISION_DETECTOR = `dictionary=cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
detector=cv2.aruco.ArucoDetector(dictionary)
`;
export const VISION_SELECT = `def read_target(target_id=12):
    frame=camera.get_cv_frame()
    if frame is None: return None,None
    corners,ids,_=detector.detectMarkers(frame)
    if ids is not None:
        for i,value in enumerate(ids):
            if int(value[0])==target_id: return frame,corners[i][0]
    return frame,None
`;
export const VISION_ERROR = `def observation(target_id=12):
    frame,points=read_target(target_id)
    if points is None: return frame,None
    h,w=frame.shape[:2]
    cx=sum(float(p[0]) for p in points)/4
    cy=sum(float(p[1]) for p in points)/4
    return frame,(cx-w/2,cy-h/2)
`;

export function visionBootstrap(detector = false, selection = false): string {
    return `from pioneer_sdk import Pioneer, Camera
import time, math, cv2

pioneer=Pioneer(simulator=True)
# view="bottom" is a simulator extension selecting its lower camera.
camera=Camera(view="bottom")
${VISION_WAIT}
${detector ? VISION_DETECTOR : ''}
${selection ? VISION_SELECT : ''}
pioneer.arm(); pioneer.takeoff()
wait_for(lambda:pioneer.get_autopilot_state()=="MISSION")
go(0,0,3)
`;
}

export function compileVisionExercise(exercise: VisionExercise): GuideTextLesson {
    const lesson = ACADEMY_LESSONS[exercise.number - 1];
    const correct = exercise.number % 2;
    const source = exercise.code + '\nprint("Опыт завершён")\n';
    return { id: `python-${lesson.id}`, topicId: lesson.id, chapterId: lesson.moduleId,
        badge: `Урок ${lesson.number}`, title: lesson.title, goal: exercise.task,
        summary: lesson.explanation, lessonIntro: `${lesson.explanation} ${exercise.hint}`, expectedOutcome: exercise.observation,
        builderHint: exercise.hint, starterCode: source, solutionCode: source.split('___').join(exercise.answer),
        apiFocus: [{ title: lesson.concept, summary: exercise.hint }], links: [{ label: 'Камера и ArUco', query: 'Camera get_cv_frame cv2 aruco' }],
        academy: { number: lesson.number, mode: 'code', waitMs: 420000, doneMessage: 'Опыт завершён', hints: [exercise.hint], experiment: exercise.experiment,
            teaching: { deviceTitle: lesson.title, device: `${lesson.explanation} ${exercise.hint} В этих уроках Camera(view="bottom") выбирает нижнюю камеру симулятора. Параметр view — расширение симулятора; при переносе на аппарат источник камеры настраивается под его оборудование. Распознавание здесь моделируется по видимости, перекрытиям и проекции меток, поэтому опыт учит обработке результатов API, а не качеству настоящего OpenCV на шумных фотографиях.`,
                question: exercise.question.includes('?') ? exercise.question : `${exercise.question.replace(/…$/, '')}?`, correct, choices: (correct ? [exercise.wrong, exercise.right] : [exercise.right, exercise.wrong]).map((text, index) => ({ text, feedback: `${index === correct ? 'Верно. ' : 'Попробуйте снова. '}${exercise.feedback}` })),
                takeaway: exercise.feedback } }
    };
}
