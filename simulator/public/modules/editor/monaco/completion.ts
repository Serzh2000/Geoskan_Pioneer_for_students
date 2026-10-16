import { getLineTextBeforeCursor, getTextBeforeCursor } from './completion/context.js';
import { getLuaArgumentTriggerEntries, getLuaCompletionEntries, getPythonCompletionEntries } from './completion/entries.js';
import { dedupeSuggestions, formatEntryDocumentation, type CompletionDocEntry } from './completion/types.js';

let completionProvidersRegistered = false;

function ensureLanguageRegistered(monaco: any, id: string): void {
    const languages = monaco.languages.getLanguages() as Array<{ id: string }>;
    if (!languages.some((language) => language.id === id)) {
        monaco.languages.register({ id });
    }
}

export { getLuaCompletionEntries, getPythonCompletionEntries } from './completion/entries.js';

function toMonacoSuggestions(monaco: any, entries: CompletionDocEntry[], range: any, codeFence: string): any[] {
    return entries.map((entry) => ({
        label: entry.label,
        kind: (monaco.languages.CompletionItemKind as any)[entry.kind] || monaco.languages.CompletionItemKind.Method,
        insertText: entry.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        // The call form beside the name, and a documentation card: what it does, parameters, result, an example.
        detail: entry.detail,
        documentation: { value: formatEntryDocumentation(entry, codeFence) },
        // What the typed letters are matched against (the name and the Russian words for it) and where it sits in the list.
        filterText: entry.filterText,
        sortText: entry.sortText,
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
            // Typing "(" opens a list only where something fits the argument; the parameter hint opens either way.
            const afterBracket = textBeforeCursor.trimEnd().endsWith('(') && word.word === '';
            const entries = afterBracket ? getLuaArgumentTriggerEntries(documentText) : getLuaCompletionEntries(documentText, textBeforeCursor);
            const suggestions = toMonacoSuggestions(monaco, entries, range, 'lua');
            return { suggestions: dedupeSuggestions(suggestions) };
        },
        triggerCharacters: ['.', ':', '(']
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
            const suggestions = toMonacoSuggestions(monaco, getPythonCompletionEntries(documentText, textBeforeCursor), range, 'python');
            return { suggestions: dedupeSuggestions(suggestions) };
        },
        triggerCharacters: ['.']
    });
}

