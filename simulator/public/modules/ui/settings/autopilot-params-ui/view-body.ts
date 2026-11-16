import { renderAutopilotParamsHome, renderAutopilotParamsPick } from './home-markup.js';
import { renderAutopilotParamsBody } from './markup.js';
import { buildPreview } from './preview.js';
import { renderAutopilotParamsPreview, type PreviewSource } from './preview-markup.js';
import type { WizardSelection } from './station2-presets.js';
import type { FlashMessage, ParamsView, PickMode } from './types.js';
import { renderAutopilotParamsWizard } from './wizard-markup.js';

type Common = Parameters<typeof renderAutopilotParamsHome>[0];
type Editor = Parameters<typeof renderAutopilotParamsBody>[0];

/** Разметка того экрана окна, который открыт сейчас. */
export function renderViewBody(ctx: {
    view: ParamsView;
    pickMode: PickMode;
    common: Common;
    editor: Editor;
    previewSource: PreviewSource | null;
    wizardSelection: WizardSelection;
    flash: FlashMessage | null;
}): string {
    const { view, common } = ctx;
    if (view === 'home') return renderAutopilotParamsHome(common);
    if (view === 'pick') return renderAutopilotParamsPick({ ...common, mode: ctx.pickMode });
    if (view === 'wizard') return renderAutopilotParamsWizard({ selection: ctx.wizardSelection, mode: ctx.pickMode, flashMessage: ctx.flash });
    if (view === 'preview' && ctx.previewSource) {
        return renderAutopilotParamsPreview({
            source: ctx.previewSource,
            preview: buildPreview(ctx.previewSource.text, common.state.values),
            mode: ctx.pickMode,
            flashMessage: ctx.flash,
            isDroneBusy: common.isDroneBusy
        });
    }
    return renderAutopilotParamsBody(ctx.editor);
}
