/*
 * board_config.json настоящего pioneer_sdk2 0.16.0 на борту Razero (Пионер Базовый с Radxa Zero 3W, PioneerOS 1.0.0),
 * снят с диска борта (reference/razero-disk). Файл решает, какие модули SDK2 доступны программе: ranger, grab, servo,
 * flashlight, cargo, версию команды go_to_local_point (gtlp_version) и разрешение reboot_board.
 * Копия лежит рядом в board-config-razero.json; тест следит, чтобы они не расходились.
 */
export interface BoardConfig {
    board_name: string;
    board_reboot: boolean;
    gtlp_version: 1 | 2;
    cameras: null | {
        driver: 'gstreamer' | 'rtsp';
        main?: {
            name: string;
            resolutions: { width: number; height: number; fps: number; program: boolean; recordable: boolean }[];
            record_device: number;
        };
        opt?: {
            name: string;
            resolutions: { width: number; height: number; fps: number; program: boolean; recordable: boolean }[];
            record_device: number;
        };
        recorder: boolean;
    };
    servo: null | Record<string, unknown>;
    flashlight: boolean;
    ranger: boolean;
    grab: boolean;
    cargo: boolean;
}

export const RAZERO_BOARD_CONFIG: BoardConfig = {
    board_name: 'Razero',
    board_reboot: true,
    gtlp_version: 1,
    cameras: {
        driver: 'gstreamer',
        main: {
            name: 'maincamera',
            resolutions: [{ width: 1080, height: 720, fps: 30, program: true, recordable: true }],
            record_device: 1
        },
        recorder: false
    },
    servo: null,
    flashlight: false,
    ranger: false,
    grab: false,
    cargo: true
};

/**
 * board_config.json Пионера Мини 2 (pioneer_sdk2 0.16.0, снят 2026-11-12). Профиль симулятора для Мини 2 уже ведёт себя
 * так (ranger, захват, серво, две камеры, gtlp_version 2, перезагрузка платы запрещена); константа нужна как эталон
 * и для сверки теста с файлом борта.
 */
export const MINI2_BOARD_CONFIG: BoardConfig = {
    board_name: 'Pioneer Mini 2',
    board_reboot: false,
    gtlp_version: 2,
    cameras: {
        driver: 'gstreamer',
        main: {
            name: 'maincamera',
            resolutions: [
                { width: 1080, height: 720, fps: 30, program: true, recordable: false },
                { width: 3840, height: 2160, fps: 30, program: false, recordable: true },
                { width: 2560, height: 1440, fps: 30, program: false, recordable: true },
                { width: 1920, height: 1080, fps: 30, program: false, recordable: true },
                { width: 1280, height: 720, fps: 30, program: false, recordable: true }
            ],
            record_device: 41
        },
        opt: {
            name: 'optcamera',
            resolutions: [{ width: 1280, height: 800, fps: 60, program: true, recordable: true }],
            record_device: 46
        },
        recorder: true
    },
    servo: { min: -80, max: 30 },
    flashlight: false,
    ranger: true,
    grab: true,
    cargo: false
};
