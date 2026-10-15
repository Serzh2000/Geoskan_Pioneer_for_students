import { findCallContext, type ScriptLanguage } from './completion/call-context.js';
import { getTextBeforeCursor } from './completion/context.js';
import { resolveSignature } from './completion/signature.js';

let signatureProvidersRegistered = false;

function ensureLanguageRegistered(monaco: any, id: string): void {
    const languages = monaco.languages.getLanguages() as Array<{ id: string }>;
    if (!languages.some((language) => language.id === id)) {
        monaco.languages.register({ id });
    }
}

/*
 * The hint that opens after "(" and follows the commas: the call form with the argument being typed in bold, and under
 * it what the function does and what each argument means. It reads the same documentation as the completion list.
 */
export function setupSignatureHelpProvider(monaco: any) {
    if (signatureProvidersRegistered) return;
    signatureProvidersRegistered = true;

    for (const language of ['lua', 'python'] as ScriptLanguage[]) {
        ensureLanguageRegistered(monaco, language);
        monaco.languages.registerSignatureHelpProvider(language, {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [')'],
            provideSignatureHelp(model: any, position: any) {
                const text = getTextBeforeCursor(model, position);
                const context = findCallContext(text, language);
                if (!context) return null;
                const signature = resolveSignature(language, text, context.callee);
                if (!signature) return null;

                const lines = [signature.doc.desc];
                if (signature.doc.params) lines.push(`**Параметры:** ${signature.doc.params}`);
                if (signature.doc.returns) lines.push(`**Результат:** ${signature.doc.returns}`);
                const last = Math.max(0, signature.parameters.length - 1);
                return {
                    value: {
                        signatures: [
                            {
                                label: signature.label,
                                documentation: { value: lines.filter(Boolean).join('\n\n') },
                                parameters: signature.parameters.map((range) => ({ label: range }))
                            }
                        ],
                        activeSignature: 0,
                        activeParameter: Math.min(context.argIndex, last)
                    },
                    dispose() {}
                };
            }
        });
    }
}
