import type { GuideApiFocusItem } from '../../types.js';

export function apiFocus(title: string, summary: string, example?: string): GuideApiFocusItem {
    return { title, summary, example };
}
