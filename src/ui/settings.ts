import {Dialog as lt_Dialog} from "siyuan";

export interface lt_SettingsDialogState {
    lt_globalEnabled: boolean;
    lt_defaultEnableNewDocuments: boolean;
    lt_currentDocumentEnabled: boolean;
    lt_hasActiveDocument: boolean;
}

export interface lt_SettingsDialogResult {
    lt_globalEnabled: boolean;
    lt_defaultEnableNewDocuments: boolean;
    lt_currentDocumentEnabled: boolean;
}

export function lt_openSettingsDialog(
    lt_state: lt_SettingsDialogState,
    lt_onSave: (lt_result: lt_SettingsDialogResult) => void | Promise<void>,
) {
    const lt_dialog = new lt_Dialog({
        title: "LaTeX Tag",
        content: `<div class="b3-dialog__content latextag-settings">
    <label class="latextag-settings__item">
        <input data-setting="global" class="b3-switch fn__flex-shrink0" type="checkbox"${lt_state.lt_globalEnabled ? " checked" : ""}>
        <span>
            <span class="latextag-settings__title">全局启用</span>
            <span class="latextag-settings__desc">开启后所有文档都会自动进行公式编号。</span>
        </span>
    </label>
    <label class="latextag-settings__item">
        <input data-setting="default-new-doc" class="b3-switch fn__flex-shrink0" type="checkbox"${lt_state.lt_defaultEnableNewDocuments ? " checked" : ""}${lt_state.lt_globalEnabled ? " disabled" : ""}>
        <span>
            <span class="latextag-settings__title">新建文档默认开启</span>
            <span class="latextag-settings__desc">仅在未开启全局启用时生效。</span>
        </span>
    </label>
    <label class="latextag-settings__item">
        <input data-setting="current-doc" class="b3-switch fn__flex-shrink0" type="checkbox"${lt_state.lt_currentDocumentEnabled ? " checked" : ""}${lt_state.lt_globalEnabled || !lt_state.lt_hasActiveDocument ? " disabled" : ""}>
        <span>
            <span class="latextag-settings__title">当前文档启用</span>
            <span class="latextag-settings__desc">用于单独开启或关闭当前文档。</span>
        </span>
    </label>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" data-action="cancel">取消</button>
    <div class="fn__space"></div>
    <button class="b3-button b3-button--text" data-action="save">保存</button>
</div>`,
        width: "520px",
    });

    const lt_globalInput = lt_getInput(lt_dialog, "global");
    const lt_defaultNewDocInput = lt_getInput(lt_dialog, "default-new-doc");
    const lt_currentDocInput = lt_getInput(lt_dialog, "current-doc");

    const lt_syncDisabledState = () => {
        if (lt_globalInput.checked) {
            lt_defaultNewDocInput.checked = false;
        }
        lt_defaultNewDocInput.disabled = lt_globalInput.checked;
        lt_currentDocInput.disabled = lt_globalInput.checked || !lt_state.lt_hasActiveDocument;
    };

    lt_globalInput.addEventListener("change", lt_syncDisabledState);
    lt_syncDisabledState();

    lt_dialog.element.querySelector<HTMLElement>("[data-action='cancel']")?.addEventListener("click", () => {
        lt_dialog.destroy();
    });

    lt_dialog.element.querySelector<HTMLElement>("[data-action='save']")?.addEventListener("click", () => {
        void lt_onSave({
            lt_globalEnabled: lt_globalInput.checked,
            lt_defaultEnableNewDocuments: lt_globalInput.checked ? false : lt_defaultNewDocInput.checked,
            lt_currentDocumentEnabled: lt_currentDocInput.checked,
        });
        lt_dialog.destroy();
    });
}

function lt_getInput(lt_dialog: lt_Dialog, lt_setting: string): HTMLInputElement {
    const lt_input = lt_dialog.element.querySelector<HTMLInputElement>(`[data-setting='${lt_setting}']`);
    if (!lt_input) {
        throw new Error(`Missing settings input: ${lt_setting}`);
    }
    return lt_input;
}
