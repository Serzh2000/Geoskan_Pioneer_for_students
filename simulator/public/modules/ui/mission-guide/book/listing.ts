import { escapeHtml } from '../render/shared.js';

/** A program as it is printed in the book: numbered lines, comments set apart. The code stays readable as text for the demonstration. */
export function renderListing(code: string): string {
    const lines = code.split('\n').map(line => {
        const comment = /^\s*(--|#)/.test(line);
        return `<span class="book-line${comment ? ' book-line--comment' : ''}">${escapeHtml(line) || ' '}</span>`;
    });
    return `<pre class="book-listing"><code data-book-code>${lines.join('\n')}</code></pre>`;
}
