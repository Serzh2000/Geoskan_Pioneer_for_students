/**
 * Эвристики предварительной проверки учебных Python-сценариев.
 * Возвращает список содержательных замечаний без привязки к UI.
 */
export function collectPythonIssues(code: string): string[] {
    const normalized = (code || '').toLowerCase();
    const issues: string[] = [];
    const hasArm = /(?:pioneer\.)?arm\s*\(/.test(normalized);
    const hasTakeoff = /(?:pioneer\.)?takeoff\s*\(/.test(normalized);
    const hasGoTo = /go_to_local_point\s*\(/.test(normalized);
    const hasLand = /(?:pioneer\.)?land\s*\(/.test(normalized);
    const hasPointReached = /point_reached\s*\(/.test(normalized);
    const hasSleep = /\b(time|asyncio)\.sleep\s*\(/.test(normalized) || /\bawait\s+asyncio\.sleep\s*\(/.test(normalized);
    const ledCalls = (normalized.match(/led_control\s*\(/g) || []).length;

    if (ledCalls > 1 && !hasSleep) {
        issues.push('Цвета светодиодов меняются подряд без пауз, поэтому вы увидите только последний. Добавьте `time.sleep(...)` между вызовами `led_control(...)`.');
    }
    if (hasTakeoff && !hasArm) {
        issues.push('Взлёт запрошен без подготовки. Перед `takeoff()` вызовите `arm()`, чтобы запустить двигатели.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('Полёт к точке запрошен до взлёта. Сначала вызовите `takeoff()`, потом `go_to_local_point(...)`.');
    }
    if (hasLand && !hasTakeoff) {
        issues.push('Посадка запрошена до взлёта. Проверьте порядок: взлёт, полёт, посадка.');
    }
    if ((hasTakeoff || hasGoTo || hasLand) && !hasSleep && !hasPointReached) {
        issues.push('Команды идут подряд без ожидания, дрон не успеет выполнить этапы. Добавьте `time.sleep(...)` или проверку `point_reached()`.');
    }
    if (hasGoTo && !hasPointReached && !hasSleep) {
        issues.push('После `go_to_local_point(...)` программа не ждёт, пока дрон долетит. Добавьте цикл с `point_reached()` или паузу.');
    }

    return issues;
}
