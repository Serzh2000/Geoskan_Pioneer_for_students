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
        issues.push('Несколько вызовов `led_control(...)` идут без `time.sleep(...)`. Цвет может меняться слишком быстро.');
    }
    if (hasTakeoff && !hasArm) {
        issues.push('`takeoff()` вызывается без `arm()`. Сначала взведите дрон.');
    }
    if (hasGoTo && !hasTakeoff) {
        issues.push('`go_to_local_point(...)` вызывается до `takeoff()`. Сначала выполните взлет.');
    }
    if (hasLand && !hasTakeoff) {
        issues.push('`land()` вызывается до взлета. Проверьте порядок команд.');
    }
    if ((hasTakeoff || hasGoTo || hasLand) && !hasSleep && !hasPointReached) {
        issues.push('Команды миссии выполняются без ожидания. Добавьте `time.sleep(...)` и/или проверки `point_reached()`.');
    }
    if (hasGoTo && !hasPointReached && !hasSleep) {
        issues.push('После `go_to_local_point(...)` нет ожидания. Добавьте цикл с `point_reached()` или паузу.');
    }

    return issues;
}
