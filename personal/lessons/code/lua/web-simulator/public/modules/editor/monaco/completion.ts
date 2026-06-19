import { getLineTextBeforeCursor, getTextBeforeCursor } from './completion/context.js';
import { getLuaCompletionEntries, getPythonCompletionEntries } from './completion/entries.js';
import { dedupeSuggestions, type CompletionDocEntry } from './completion/types.js';

let completionProvidersRegistered = false;

function ensureLanguageRegistered(monaco: any, id: string): void {
    const languages = monaco.languages.getLanguages() as Array<{ id: string }>;
    if (!languages.some((language) => language.id === id)) {
        monaco.languages.register({ id });
    }
}

export { getLuaCompletionEntries, getPythonCompletionEntries } from './completion/entries.js';

function toMonacoSuggestions(monaco: any, entries: CompletionDocEntry[], range: any): any[] {
    return entries.map((entry) => ({
        label: entry.label,
        kind: (monaco.languages.CompletionItemKind as any)[entry.kind] || monaco.languages.CompletionItemKind.Method,
        insertText: entry.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: { value: entry.documentation },
        range
    }));
}

export function setupCompletionProvider(monaco: any) {
    if (completionProvidersRegistered) return;
    completionProvidersRegistered = true;
    ensureLanguageRegistered(monaco, 'lua');
    ensureLanguageRegistered(monaco, 'python');

    monaco.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems(model: any, position: any) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const documentText = getTextBeforeCursor(model, position);
            const textBeforeCursor = getLineTextBeforeCursor(model, position);
            const suggestions = toMonacoSuggestions(monaco, getLuaCompletionEntries(documentText, textBeforeCursor), range);
            return { suggestions: dedupeSuggestions(suggestions) };
        },
        triggerCharacters: ['.', ':']
    });

    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems(model: any, position: any) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const documentText = getTextBeforeCursor(model, position);
            const textBeforeCursor = getLineTextBeforeCursor(model, position);
            const suggestions = toMonacoSuggestions(monaco, getPythonCompletionEntries(documentText, textBeforeCursor), range);
            return { suggestions: dedupeSuggestions(suggestions) };
        },
        triggerCharacters: ['.']
    });
}

