import * as Blockly from 'blockly';
import { isBlockSupported } from './registry.js';
import { UNSUPPORTED_TARGET_REASON, refreshBlockWarning, setUnsupportedTargetMessage, withoutUndo } from './disable-reasons.js';
import { refreshWaitContainerGuardsForWorkspace } from './wait-in-loop-guard.js';
import type { PioneerTarget } from './targets/types.js';

const TARGET_LABELS: Record<PioneerTarget, string> = { lua: 'Lua', python: 'Python' };

function unsupportedMessage(target: PioneerTarget): string {
    return `Недоступно в ${TARGET_LABELS[target]}`;
}

// Пересчитывает disabled-reason UNSUPPORTED_TARGET_REASON для всех pioneer_*-
// блоков, уже стоящих в workspace (§6 плана, фаза 6): вызывается при
// построении тулбокса и при смене языка компиляции. Причину WAIT_IN_EVENT_REASON
// (фаза 5) не трогает — Blockly хранит причины как независимый Set
// (см. disable-reasons.ts), поэтому один блок может быть отключён сразу по
// обеим причинам одновременно, и они не затирают друг друга.
export function applyPioneerTargetToWorkspace(workspace: Blockly.Workspace, target: PioneerTarget): void {
    withoutUndo(() => {
        workspace.getAllBlocks(false).forEach((block) => {
            if (!block.type.startsWith('pioneer_')) return;

            const supported = isBlockSupported(block.type, target);
            block.setDisabledReason(!supported, UNSUPPORTED_TARGET_REASON);
            setUnsupportedTargetMessage(block, supported ? null : unsupportedMessage(target));
            refreshBlockWarning(block);
        });
    });
    // Ограничение "ожидание внутри цикла/если" (wait-in-loop-guard.ts) —
    // только для Lua: смена языка не двигает и не создаёт блоки, поэтому
    // собственный onChange-слушатель этой причины сам не сработает.
    refreshWaitContainerGuardsForWorkspace(workspace, target);
}
