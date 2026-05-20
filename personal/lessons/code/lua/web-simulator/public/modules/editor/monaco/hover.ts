import { apiDocs, pythonApiDocs } from '../../docs/api-docs.js';

let hoverProvidersRegistered = false;

function ensureLanguageRegistered(monaco: any, id: string): void {
    const languages = monaco.languages.getLanguages() as Array<{ id: string }>;
    if (!languages.some((language) => language.id === id)) {
        monaco.languages.register({ id });
    }
}

function getMarkdownContents(languageLabel: string, fullWord: string, doc: any, codeFence: string): Array<{ value: string }> {
    const contents = [
        { value: `**${languageLabel}: ${fullWord}**` },
        { value: `_${doc.desc || ''}_` }
    ];

    if (doc.syntax) {
        contents.push({ value: `\`\`\`${codeFence}\n${doc.syntax}\n\`\`\`` });
    }
    if (doc.params) {
        contents.push({ value: `**\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b:** ${doc.params}` });
    }
    if (doc.returns) {
        contents.push({ value: `**\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442:** ${doc.returns}` });
    }
    if (doc.example) {
        contents.push({ value: `**\u041f\u0440\u0438\u043c\u0435\u0440:**\n\`\`\`${codeFence}\n${doc.example}\n\`\`\`` });
    }

    return contents;
}

function findLuaDoc(fullWord: string): { lookupKey: string; doc: any } | null {
    const exactDoc = (apiDocs as Record<string, any>)[fullWord];
    if (exactDoc) {
        return { lookupKey: fullWord, doc: exactDoc };
    }

    const memberMatch = fullWord.match(/([.:])([^.:]+)$/);
    if (!memberMatch) return null;

    const [, separator, member] = memberMatch;
    const suffix = `${separator}${member}`;
    const candidates = Object.entries(apiDocs as Record<string, any>)
        .filter(([key]) => key.endsWith(suffix));

    if (candidates.length === 1) {
        const [lookupKey, doc] = candidates[0];
        return { lookupKey, doc };
    }

    return null;
}

export function setupHoverProvider(monaco: any) {
    if (hoverProvidersRegistered) return;
    hoverProvidersRegistered = true;
    ensureLanguageRegistered(monaco, 'lua');
    ensureLanguageRegistered(monaco, 'python');

    monaco.languages.registerHoverProvider('lua', {
        provideHover: function(model: any, position: any) {
            const word = model.getWordAtPosition(position);
            if (!word) return;

            const line = model.getLineContent(position.lineNumber);
            const fullWord = getFullWordAtPosition(line, position.column - 1);
            const match = findLuaDoc(fullWord);
            if (match) {
                return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: getMarkdownContents('Pioneer API', match.lookupKey, match.doc, 'lua')
                };
            }
        }
    });

    // Python hover: resolve docs by the last segment after the dot.
    monaco.languages.registerHoverProvider('python', {
        provideHover: function(model: any, position: any) {
            const word = model.getWordAtPosition(position);
            if (!word) return;

            const line = model.getLineContent(position.lineNumber);
            const fullWord = getFullWordAtPosition(line, position.column - 1);
            if (!fullWord) return;

            const parts = fullWord.split('.');
            const last = parts[parts.length - 1];
            if (!last) return;

            // Resolve documentation on demand to keep provider stateless.
            let found: any = undefined;
            for (const [key, doc] of Object.entries(pythonApiDocs as any)) {
                if (!key.includes('.')) continue;
                const method = key.split('.').slice(-1)[0];
                if (method === last) {
                    found = doc;
                    break;
                }
            }

            if (!found) return;

            return {
                range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                contents: getMarkdownContents('Python SDK', fullWord, found, 'python')
            };
        }
    });
}

function getFullWordAtPosition(line: string, index: number) {
    let start = index;
    while (start > 0 && /[\w.:]/.test(line[start - 1])) start--;
    
    let end = index;
    while (end < line.length && /[\w.:]/.test(line[end])) end++;
    
    return line.substring(start, end);
}
