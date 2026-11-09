import type { Sdk2Check } from './sdk2-grade.js';

/** Миссия трека «Мини 2 · SDK2»: текст карточки, шаблон, эталон и проверка полёта. */
export type Sdk2Mission = {
    id: string;
    group: string;
    groupTitle: string;
    title: string;
    /** Зачем эта миссия (вводная карточка). */
    goal: string;
    /** Шаги по порядку, по одному на карточку. */
    steps: string[];
    hint: string;
    /** Что должно получиться (экран успеха). */
    outcome: string;
    /** Шаблон: места для вписывания помечены ___ . */
    starter: string;
    /** Что вписать вместо каждого ___ по порядку; если пропусков нет — пусто, а решение задано в `solution`. */
    answers?: string[];
    solution?: string;
    /** Сколько миллисекунд ждать конца программы (потолок; проверка кончается раньше, когда напечатано «Опыт завершён»). */
    waitMs: number;
    /** Сцена: ArUco-метки на полу (нижняя камера). */
    scene?: 'markers';
    check: Sdk2Check;
};

export const DONE_LINE = 'print("Опыт завершён")\n';

export const HEAD = 'from pioneer_sdk2 import Pioneer\nimport time\n\npioneer = Pioneer()\n';

export const FLY_TO = `

def fly_to(x, y, z, yaw=0):
    """Лететь в точку (метры, курс в градусах) и дождаться прилёта."""
    pioneer.go_to_local_point(x=x, y=y, z=z, yaw=yaw)
    while not pioneer.point_reached():
        time.sleep(0.1)

`;

const indent = (text: string) => text.split('\n').map((line) => (line ? `    ${line}` : line)).join('\n');

/**
 * Каркас полётной программы: arm → takeoff → тело → land, а в finally — аварийная посадка и закрытие соединения.
 * `takeoff`/`land` можно заменить своим текстом (для миссий, где эти команды вписывает ученик).
 */
export function flightProgram(options: { before?: string; body: string; head?: string; takeoff?: string; land?: string }): string {
    const takeoff = options.takeoff ?? 'pioneer.takeoff()';
    const land = options.land ?? 'pioneer.land()';
    return `${options.head ?? HEAD}${options.before ?? '\n'}in_air = False

try:
${indent(`if not pioneer.arm():
    raise SystemExit("Моторы не запустились")
in_air = True
${takeoff}
${options.body.trimEnd()}
${land}
in_air = False`)}
finally:
    if in_air:
        pioneer.land()
    pioneer.disarm()
    pioneer.close_connection()
${DONE_LINE}`;
}

/** Каркас программы на земле: соединение закрывается в finally. */
export function groundProgram(options: { head?: string; before?: string; body: string }): string {
    return `${options.head ?? HEAD}${options.before ?? ''}
try:
${indent(options.body.trimEnd())}
finally:
    pioneer.close_connection()
${DONE_LINE}`;
}

export function fillAnswers(starter: string, answers: string[] = []): string {
    let index = 0;
    return starter.replace(/___/g, () => answers[index++] ?? '___');
}

export const solutionOf = (mission: Sdk2Mission): string => mission.solution ?? fillAnswers(mission.starter, mission.answers);
