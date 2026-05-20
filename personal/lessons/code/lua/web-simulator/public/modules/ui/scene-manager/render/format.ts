export function escapeHtml(value: string) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatSceneLabel(value: string, objectName = ''): string {
    const normalized = String(value || '').trim();
    const name = String(objectName || '').trim();

    if (normalized.toLowerCase() === 'ground' || name.toLowerCase() === 'ground') return 'Земля';
    if (normalized.toLowerCase() === 'group' || name.toLowerCase() === 'group') return 'Группа';

    return normalized || name || 'Объект';
}
