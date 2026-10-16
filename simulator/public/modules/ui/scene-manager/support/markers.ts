import {
    DEFAULT_APRILTAG_DICTIONARY,
    DEFAULT_ARUCO_DICTIONARY,
    MARKER_DICTIONARY_OPTIONS
} from '../../../environment/obstacles/marker-dictionaries.js';

export function getMarkerMode(type: string | undefined | null): 'aruco' | 'apriltag' {
    return (type || '').toLowerCase().includes('april') ? 'apriltag' : 'aruco';
}

export function fillDictionarySelect(
    selectEl: HTMLSelectElement | null,
    mode: 'aruco' | 'apriltag',
    value?: string
) {
    if (!selectEl) return;
    const options = MARKER_DICTIONARY_OPTIONS[mode];
    selectEl.innerHTML = '';
    for (const option of options) {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.label;
        selectEl.appendChild(opt);
    }
    const fallback = mode === 'apriltag' ? DEFAULT_APRILTAG_DICTIONARY : DEFAULT_ARUCO_DICTIONARY;
    selectEl.value = value && options.some((option) => option.id === value) ? value : fallback;
}
