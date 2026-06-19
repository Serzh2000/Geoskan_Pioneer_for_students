import type { ApiDoc } from '../../docs/api-docs-types.js';
import type { ApiPreviewScenario } from './preview/index.js';

export type ScriptLanguage = 'lua' | 'python';
export type ApiCategoryId =
    | 'autopilot'
    | 'timers'
    | 'sensors'
    | 'camera'
    | 'leds'
    | 'control'
    | 'peripherals'
    | 'globals'
    | 'events'
    | 'misc';

export type ApiEntryView = {
    name: string;
    doc: ApiDoc;
    categoryId: ApiCategoryId;
    scopeLabel: string;
    previewScenario: ApiPreviewScenario | null;
};

export type ApiSection = {
    id: ApiCategoryId;
    title: string;
    description: string;
    entries: ApiEntryView[];
};

const categoryMeta: Record<ApiCategoryId, { title: string; description: string }> = {
    autopilot: {
        title: 'Автопилот',
        description: 'Команды взлета, посадки, полета к точке и переходов состояний автопилота.'
    },
    timers: {
        title: 'Таймеры и планирование',
        description: 'Отложенный запуск действий и периодические колбэки для сценариев миссии.'
    },
    sensors: {
        title: 'Сенсоры и телеметрия',
        description: 'Позиция, скорость, дальномер, батарея и другие данные состояния дрона.'
    },
    camera: {
        title: 'Камера',
        description: 'Съемка, видеопоток и доступ к кадрам симулятора.'
    },
    leds: {
        title: 'LED и индикация',
        description: 'Управление светодиодами и цветовой индикацией дрона.'
    },
    control: {
        title: 'Управление и RC',
        description: 'Ручное управление и отправка команд по каналам пульта.'
    },
    peripherals: {
        title: 'Периферия и интерфейсы',
        description: 'GPIO, UART, SPI и обмен сообщениями с внешними устройствами.'
    },
    globals: {
        title: 'Глобальные функции',
        description: 'Вспомогательные глобальные вызовы времени и системного состояния.'
    },
    events: {
        title: 'События FSM',
        description: 'Константы событий автопилота, которые приходят в `callback(event)`.'
    },
    misc: {
        title: 'Прочее',
        description: 'Служебные методы, которые не попали в основные категории.'
    }
};

const previewScenarios: Record<string, ApiPreviewScenario> = {
    'ap.push': 'fsm',
    'ap.goToLocalPoint': 'goto',
    'ap.goToPoint': 'goto',
    'ap.updateYaw': 'yaw',
    'Pioneer.arm': 'arm',
    'Pioneer.disarm': 'disarm',
    'Pioneer.takeoff': 'takeoff',
    'Pioneer.land': 'land',
    'Pioneer.go_to_local_point': 'goto',
    'Pioneer.go_to_local_point_body_fixed': 'goto-body',
    'Pioneer.point_reached': 'point-reached',
    'Pioneer.set_manual_speed': 'manual',
    'Pioneer.get_autopilot_state': 'state'
};

function getScopeLabel(name: string, language: ScriptLanguage): string {
    if (name.includes(':')) return name.split(':')[0];
    if (name.includes('.')) return name.split('.')[0];
    if (name.startsWith('Ev.')) return 'Ev';
    return language === 'python' ? 'Global' : 'Lua';
}

function classifyEntry(name: string, language: ScriptLanguage): ApiCategoryId {
    const lowerName = name.toLowerCase();

    if (name.startsWith('Ev.')) return 'events';
    if (name.startsWith('ap.')) return 'autopilot';
    if (name.startsWith('Timer.')) return 'timers';
    if (name.startsWith('Sensors.')) return 'sensors';
    if (name.startsWith('camera.') || name.startsWith('Camera.')) return 'camera';
    if (name.startsWith('Ledbar') || lowerName.includes('led_control')) return 'leds';
    if (name.startsWith('Gpio.') || name.startsWith('Uart.') || name.startsWith('Spi.') || name.startsWith('mailbox.')) {
        return 'peripherals';
    }
    if (['time', 'launchtime', 'deltatime', 'sleep', 'boardnumber'].includes(lowerName)) return 'globals';

    if (language === 'python' && name.startsWith('Pioneer.')) {
        if (/(arm|disarm|takeoff|land|go_to_|point_reached|set_manual_speed|get_autopilot_state)/.test(lowerName)) {
            return 'autopilot';
        }
        if (/(get_local_position_lps|get_dist_sensor_data|get_battery_status)/.test(lowerName)) return 'sensors';
        if (/send_rc_channels/.test(lowerName)) return 'control';
    }

    return 'misc';
}

function buildSearchText(name: string, doc: ApiDoc, scopeLabel: string): string {
    const directionSearchTerms = doc.direction === 'to-autopilot'
        ? ['в автопилот', 'автопилоту', 'отправить', 'команда']
        : doc.direction === 'from-autopilot'
            ? ['от автопилота', 'из автопилота', 'приходит', 'событие']
            : [];

    return [
        name,
        scopeLabel,
        doc.desc,
        doc.syntax,
        doc.params,
        doc.returns,
        doc.example,
        doc.kind,
        ...(doc.aliases || []),
        ...directionSearchTerms
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

export function getPreviewScenario(name: string): ApiPreviewScenario | null {
    return previewScenarios[name] || null;
}

export function buildSections(docs: Record<string, ApiDoc>, language: ScriptLanguage, query: string): ApiSection[] {
    const normalizedQuery = query.trim().toLowerCase();
    const entries = Object.entries(docs)
        .map(([name, doc]) => {
            const scopeLabel = getScopeLabel(name, language);
            const entry: ApiEntryView = {
                name,
                doc,
                categoryId: classifyEntry(name, language),
                scopeLabel,
                previewScenario: getPreviewScenario(name)
            };
            return { entry, searchText: buildSearchText(name, doc, scopeLabel) };
        })
        .filter(({ searchText }) => !normalizedQuery || searchText.includes(normalizedQuery))
        .map(({ entry }) => entry);

    const grouped = new Map<ApiCategoryId, ApiEntryView[]>();
    for (const entry of entries) {
        if (!grouped.has(entry.categoryId)) grouped.set(entry.categoryId, []);
        grouped.get(entry.categoryId)?.push(entry);
    }

    const order: ApiCategoryId[] = [
        'autopilot',
        'timers',
        'sensors',
        'camera',
        'leds',
        'control',
        'peripherals',
        'globals',
        'events',
        'misc'
    ];

    return order
        .map((id) => ({
            id,
            title: categoryMeta[id].title,
            description: categoryMeta[id].description,
            entries: (grouped.get(id) || []).sort((left, right) => left.name.localeCompare(right.name))
        }))
        .filter((section) => section.entries.length > 0);
}
