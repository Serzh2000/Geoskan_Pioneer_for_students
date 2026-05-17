import { apiDocs, pythonApiDocs } from '../../docs/api-docs.js';

export function setupHoverProvider(monaco: any) {
    monaco.languages.registerHoverProvider('lua', {
        provideHover: function(model: any, position: any) {
            const word = model.getWordAtPosition(position);
            if (!word) return;

            const line = model.getLineContent(position.lineNumber);
            const fullWord = getFullWordAtPosition(line, position.column - 1);
            
            const doc = (apiDocs as any)[fullWord];
            if (doc) {
                return {
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    contents: [
                        { value: `**Pioneer API: ${fullWord}**` },
                        { value: `_${doc.desc}_` },
                        { value: `\`\`\`lua\n${doc.syntax}\n\`\`\`` },
                        { value: `**Параметры:** ${doc.params}` },
                        { value: `**Результат:** ${doc.returns}` },
                        { value: `**Пример:**\n\`\`\`lua\n${doc.example}\n\`\`\`` }
                    ]
                };
            }
        }
    });

    // Python hover: ищем подсказку по последнему сегменту после точки.
    monaco.languages.registerHoverProvider('python', {
        provideHover: function(model: any, position: any) {
            const line = model.getLineContent(position.lineNumber);
            const fullWord = getFullWordAtPosition(line, position.column - 1);
            if (!fullWord) return;

            const parts = fullWord.split('.');
            const last = parts[parts.length - 1];
            if (!last) return;

            // Map methodName -> doc (делаем на месте, чтобы не усложнять и не хранить состояние)
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
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                contents: [
                    { value: `**Python SDK: ${fullWord}**` },
                    { value: `_${found.desc || ''}_` },
                    { value: `\`\`\`python\n${found.syntax || ''}\n\`\`\`` },
                    { value: `**Параметры:** ${found.params || ''}` },
                    { value: `**Возвращает:** ${found.returns || ''}` },
                    ...(found.example ? [{ value: `**Пример:**\n\`\`\`python\n${found.example}\n\`\`\`` }] : [])
                ]
            };
        }
    });
}

function getFullWordAtPosition(line: string, index: number) {
    let start = index;
    while (start > 0 && /[\w.]/.test(line[start - 1])) start--;
    
    let end = index;
    while (end < line.length && /[\w.]/.test(line[end])) end++;
    
    return line.substring(start, end);
}
