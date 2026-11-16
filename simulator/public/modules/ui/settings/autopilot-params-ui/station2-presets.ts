/*
 * «Мастер настройки» Pioneer Station 2.0: четыре шага (тип связи, система навигации, скорость, режим газа), каждый вариант задаёт
 * несколько параметров автопилота. Значения прочитаны из классов Станции (logic: PioneerControlTypePreset, PioneerNavigationPreset,
 * PioneerSpeedPreset, PioneerThrottlePreset; набор для Pioneer Base), названия и пояснения из её интерфейса. Права на тексты принадлежат
 * правообладателю (группа компаний «Геоскан»).
 *
 * В Станции для Базового есть ещё вариант «ИК»: значения у него те же, что у «УЗ», поэтому здесь он не повторяется.
 */

export type WizardGroupId = 'link' | 'nav' | 'speed' | 'throttle';
export type WizardOption = { id: string; title: string; text: string; values: Record<string, number> };
export type WizardGroup = { id: WizardGroupId; title: string; options: WizardOption[] };

export const WIZARD_GROUPS: WizardGroup[] = [
    {
        id: 'link',
        title: 'Тип связи',
        options: [
            {
                id: 'flysky',
                title: 'Fly-Sky',
                text: 'Удобный и доступный стандарт связи для управления на малых и средних расстояниях. Хорошо подходит для любительских и учебных задач.',
                values: { BoardPioneer_rc: 1, BoardPioneer_auxUMux: 0, Copter_flyWithoutRc: 0, Copter_man_rcMode2: 4 }
            },
            {
                id: 'wifi',
                title: 'Wi-Fi',
                text: 'Использует беспроводную сеть для передачи данных и управления. Идеален для работы на коротких расстояниях, а также для передачи видео и телеметрии в режиме реального времени.',
                values: { BoardPioneer_auxUMux: 3, Copter_flyWithoutRc: 1, Copter_man_rcMode2: 3 }
            }
        ]
    },
    {
        id: 'nav',
        title: 'Система навигации',
        options: [
            {
                id: 'opt',
                title: 'ОПТ (Оптическая навигация)',
                text: 'Использует данные с камер для анализа окружающего пространства и построения маршрута. Подходит для работы в условиях, где важна точная ориентация относительно видимых объектов.',
                values: { Flight_com_navSystem: 2, BoardPioneer_modules_gnss: 0, Imu_magEnabled: 0 }
            },
            {
                id: 'lps',
                title: 'УЗ (Ультразвуковая навигация)',
                text: 'Основана на анализе отраженных ультразвуковых сигналов. Используется для предотвращения столкновений с объектами на малых дистанциях и в условиях ограниченной видимости.',
                values: { Flight_com_navSystem: 1, BoardPioneer_modules_gnss: 0, Imu_magEnabled: 0 }
            },
            {
                id: 'gnss',
                title: 'ГНСС (Глобальная навигационная спутниковая система)',
                text: 'Полагается на сигналы спутников для определения координат. Эффективна на открытых пространствах, где доступен стабильный спутниковый сигнал.',
                values: { Flight_com_navSystem: 0, BoardPioneer_modules_gnss: 1, Imu_magEnabled: 1 }
            }
        ]
    },
    {
        id: 'speed',
        title: 'Скорость',
        options: [
            {
                id: 'low',
                title: 'Медленная',
                text: 'Обеспечивает плавное и точное управление. Подходит для выполнения сложных маневров, полетов в ограниченном пространстве или при необходимости аккуратного исследования местности.',
                values: { Copter_man_attScale: 0.25, Copter_man_velScale: 0.5, Copter_man_vzScale: 0.5, Copter_man_yawScale: 3 }
            },
            {
                id: 'middle',
                title: 'Средняя',
                text: 'Универсальный режим, сочетающий хорошую маневренность и стабильную скорость. Оптимален для выполнения стандартных задач в большинстве условий.',
                values: { Copter_man_attScale: 0.3, Copter_man_velScale: 1, Copter_man_vzScale: 1, Copter_man_yawScale: 3 }
            },
            {
                id: 'high',
                title: 'Быстрая',
                text: 'Максимальная скорость для быстрого перемещения и выполнения задач в кратчайшие сроки. Рекомендуется для работы на открытых пространствах или при необходимости быстрого реагирования.',
                values: { Copter_man_attScale: 0.35, Copter_man_velScale: 2, Copter_man_vzScale: 2, Copter_man_yawScale: 3 }
            }
        ]
    },
    {
        id: 'throttle',
        title: 'Режим газа',
        options: [
            {
                id: 'centered',
                title: 'Центрированное',
                text: 'Ручка газа автоматически возвращается в центральное положение, когда вы ее отпускаете. Этот режим рекомендуется для пилотов, которым требуется точный контроль над дроном в режиме зависания. Если ваш дрон оснащен функцией удержания высоты или автоматической стабилизации, этот режим поможет более точно управлять полетом.',
                values: { Copter_throttleMode: 1 }
            },
            {
                id: 'non-centered',
                title: 'Нецентрированное',
                text: 'Ручка газа остается на месте после отпускания, сохраняя установленный уровень тяги. Этот режим удобен для опытных пилотов, которые предпочитают полный контроль над дроном, особенно в сложных или динамичных условиях полета.',
                values: { Copter_throttleMode: 0 }
            }
        ]
    }
];

export type WizardSelection = Partial<Record<WizardGroupId, string>>;

/** Профиль .properties только из параметров выбранных вариантов (остальное не трогается) и название выбора для предпросмотра. */
export function buildWizardProfile(selection: WizardSelection): { title: string; text: string } | null {
    const values: Record<string, number> = {};
    const names: string[] = [];
    for (const group of WIZARD_GROUPS) {
        const option = group.options.find((item) => item.id === selection[group.id]);
        if (!option) continue;
        Object.assign(values, option.values);
        names.push(option.title.replace(/\s*\(.*\)$/, ''));
    }
    if (!names.length) return null;
    const text = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
    return { title: `Мастер настройки: ${names.join(' · ')}`, text };
}
