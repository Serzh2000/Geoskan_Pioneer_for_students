export function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatNumber(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
    return Number.isInteger(value) ? String(value) : String(value);
}

export function formatDateTime(value: string | null) {
    if (!value) return 'не указано';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU');
}

export function isParameterChanged(currentValue: number | undefined, defaultValue: number) {
    return typeof currentValue === 'number' && currentValue !== defaultValue;
}

export function getStatusLabel(isLoadingSource: boolean, isSavingSource: boolean, isSourceDirty: boolean) {
    if (isLoadingSource) return 'Загрузка файла';
    if (isSavingSource) return 'Сохранение файла';
    if (isSourceDirty) return 'Есть несохраненные изменения';
    return 'Синхронизировано с файлом';
}

export function downloadTextFile(name: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
}
