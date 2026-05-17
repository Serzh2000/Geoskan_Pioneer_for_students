import type { ScriptLanguage } from '../../core/state.js';
import { apiDocs, pythonApiDocs, type ApiDoc } from '../../docs/api-docs.js';
import type { ApiCatalogEntry } from './types.js';

function sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function inferSyntax(key: string, language: ScriptLanguage): string {
    if (language === 'lua') {
        if (key.startsWith('Ev.')) return key;
        return `${key}()`;
    }

    const suffix = key.split('.').slice(-1)[0] || key;
    if (key.startsWith('Pioneer.')) return `pioneer.${suffix}()`;
    if (key.startsWith('Camera.')) return `camera.${suffix}()`;
    return `${suffix}()`;
}

function parseCallParts(key: string, doc: ApiDoc, language: ScriptLanguage) {
    const syntax = (doc.syntax || inferSyntax(key, language)).split('->')[0].trim();
    const openIndex = syntax.indexOf('(');
    if (openIndex < 0) {
        return { callHead: syntax, hasArgs: false, defaultArgs: '' };
    }

    const closeIndex = syntax.lastIndexOf(')');
    const rawArgs = syntax.slice(openIndex + 1, closeIndex > openIndex ? closeIndex : syntax.length).trim();
    const normalizedArgs = rawArgs
        .replace(/\[([^\]]+)\]/g, '$1')
        .replace(/\s+/g, ' ')
        .replace(/^none$/i, '')
        .trim();

    return {
        callHead: syntax.slice(0, openIndex).trim(),
        hasArgs: normalizedArgs.length > 0,
        defaultArgs: normalizedArgs
    };
}

function getLuaCategory(key: string): { category: string; colour: string } {
    if (key.startsWith('ap.')) return { category: 'Автопилот Lua', colour: '#a855f7' };
    if (key.startsWith('Timer.')) return { category: 'Таймеры Lua', colour: '#f59e0b' };
    if (key.startsWith('Ledbar')) return { category: 'Индикация Lua', colour: '#22c55e' };
    if (key.startsWith('Sensors.')) return { category: 'Сенсоры Lua', colour: '#14b8a6' };
    if (key.startsWith('camera.')) return { category: 'Камера Lua', colour: '#06b6d4' };
    if (key.startsWith('Gpio.') || key.startsWith('Uart.') || key.startsWith('Spi.') || key.startsWith('mailbox.')) {
        return { category: 'Периферия Lua', colour: '#64748b' };
    }
    return { category: 'Служебные Lua', colour: '#0ea5e9' };
}

function getPythonCategory(key: string): { category: string; colour: string } {
    if (key.startsWith('Pioneer.')) {
        if (/(arm|disarm|takeoff|land|go_to_|point_reached|set_manual_speed|get_autopilot_state)/.test(key)) {
            return { category: 'Автопилот Python', colour: '#a855f7' };
        }
        if (/(get_local_position_lps|get_dist_sensor_data|get_battery_status)/.test(key)) {
            return { category: 'Сенсоры Python', colour: '#14b8a6' };
        }
        if (/led_control/.test(key)) return { category: 'Индикация Python', colour: '#22c55e' };
        if (/send_rc_channels/.test(key)) return { category: 'Управление Python', colour: '#f59e0b' };
        return { category: 'Pioneer Python', colour: '#0ea5e9' };
    }

    if (key.startsWith('Camera.')) return { category: 'Камера Python', colour: '#06b6d4' };
    return { category: 'Служебные Python', colour: '#64748b' };
}

export function buildCatalog(language: ScriptLanguage): ApiCatalogEntry[] {
    const docs = language === 'lua' ? Object.entries(apiDocs) : Object.entries(pythonApiDocs);
    return docs.map(([key, doc]) => {
        const categoryMeta = language === 'lua' ? getLuaCategory(key) : getPythonCategory(key);
        const parts = parseCallParts(key, doc, language);
        return {
            key,
            doc,
            type: `${language}_api_stmt_${sanitizeKey(key)}`,
            category: categoryMeta.category,
            colour: categoryMeta.colour,
            callHead: parts.callHead,
            defaultArgs: parts.defaultArgs,
            hasArgs: parts.hasArgs
        };
    });
}

export function groupCatalogByCategory(entries: ApiCatalogEntry[]): Map<string, ApiCatalogEntry[]> {
    const grouped = new Map<string, ApiCatalogEntry[]>();
    entries.forEach((entry) => {
        const items = grouped.get(entry.category) || [];
        items.push(entry);
        grouped.set(entry.category, items);
    });
    return grouped;
}
