import type { AutopilotSourceResponse } from './types.js';

export async function fetchAutopilotSourceFile() {
    const response = await fetch('/api/autopilot-parameters');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<AutopilotSourceResponse>;
}

export async function saveAutopilotSourceFile(content: string) {
    const response = await fetch('/api/autopilot-parameters', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<AutopilotSourceResponse>;
}
