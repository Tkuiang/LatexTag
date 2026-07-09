import {
    Plugin as lt_Plugin,
    getActiveEditor as lt_getActiveEditor,
    showMessage as lt_showMessage,
    type IEventBusMap as lt_IEventBusMap,
} from "siyuan";
import {lt_renumberCurrentDocument, lt_clearCurrentDocumentTags} from "./formula/numbering";
import {lt_createToolbarController, type lt_ToolbarController} from "./ui/toolbar";
import {lt_openSettingsDialog, type lt_SettingsDialogResult} from "./ui/settings";
import {lt_debounce, type lt_DebouncedFunction} from "./utils/debounce";

const lt_STORAGE_NAME = "settings";
const lt_DEFAULT_SETTINGS: lt_PluginSettings = {
    lt_globalEnabled: false,
    lt_defaultEnableNewDocuments: false,
    lt_defaultEnableNewDocumentsSince: "",
    lt_enabledByDoc: {},
};

interface lt_PluginSettings {
    lt_globalEnabled: boolean;
    lt_defaultEnableNewDocuments: boolean;
    lt_defaultEnableNewDocumentsSince: string;
    lt_enabledByDoc: Record<string, boolean>;
}

type lt_EventDetail<lt_T extends keyof lt_IEventBusMap> = CustomEvent<lt_IEventBusMap[lt_T]>;
type lt_OpenNoneditableBlockEvent = CustomEvent<{
    blockElement: HTMLElement;
    renderElement: HTMLElement;
    toolbar: {
        subElement?: HTMLElement;
    };
}>;

export default class lt_LatexTagPlugin extends lt_Plugin {
    #lt_settings: lt_PluginSettings = lt_createDefaultSettings();
    #lt_toolbar: lt_ToolbarController | undefined;
    #lt_activeRootId = "";
    #lt_activeMathEditorElement: HTMLElement | undefined;
    #lt_activeMathBlockElement: HTMLElement | undefined;
    #lt_isApplying = false;

    readonly #lt_scheduleRenumber: lt_DebouncedFunction = lt_debounce(() => {
        void this.lt_renumberActiveDocument();
    }, 800);

    readonly #lt_handleEditorChanged = () => {
        if (!this.lt_isActiveDocumentEnabled() || this.#lt_isApplying) {
            return;
        }
        this.#lt_scheduleRenumber();
    };

    readonly #lt_handleSwitchProtyle = (lt_event: lt_EventDetail<"switch-protyle">) => {
        const lt_rootId = lt_event.detail.protyle.block?.rootID ?? "";
        if (!lt_rootId || lt_rootId === this.#lt_activeRootId) {
            return;
        }
        this.#lt_activeRootId = lt_rootId;
        this.#lt_toolbar?.lt_setEnabled(this.lt_isDocumentEnabled(lt_rootId));

        if (this.lt_isDocumentEnabled(lt_rootId)) {
            this.#lt_scheduleRenumber();
        }
    };

    readonly #lt_handleOpenNoneditableBlock = (lt_event: lt_OpenNoneditableBlockEvent) => {
        if (!lt_isMathBlockElement(lt_event.detail.blockElement)) {
            return;
        }

        this.#lt_activeMathBlockElement = lt_event.detail.blockElement;
        this.#lt_activeMathEditorElement = lt_event.detail.toolbar.subElement ?? lt_event.detail.renderElement;
    };

    readonly #lt_handleDocumentFocusOut = (lt_event: FocusEvent) => {
        const lt_target = lt_event.target;
        if (!(lt_target instanceof HTMLElement)) {
            return;
        }

        if (this.lt_isMathEditorElement(lt_target) && this.lt_isActiveDocumentEnabled()) {
            this.#lt_scheduleRenumber();
        }
    };

    override async onload() {
        this.addIcons(`<symbol id="iconLatexTag" viewBox="0 0 32 32">
<path d="M4 6.667h24v3.2h-9.733v15.467h-4.533v-15.467h-9.733v-3.2z"></path>
<path d="M21.333 14.667h6.667v3.2h-6.667v-3.2z"></path>
<path d="M21.333 22.133h6.667v3.2h-6.667v-3.2z"></path>
</symbol>`);

        this.#lt_settings = await this.lt_loadSettings();
        this.#lt_toolbar = lt_createToolbarController(
            this,
            this.lt_isActiveDocumentEnabled(),
            async () => {
                await this.lt_toggleNumbering();
            },
            () => {
                this.lt_openSettings();
            },
        );

        this.lt_bindEvents();
        document.addEventListener("focusout", this.#lt_handleDocumentFocusOut, true);

        if (this.lt_isActiveDocumentEnabled()) {
            this.#lt_scheduleRenumber();
        }
    }

    override onunload() {
        this.lt_unbindEvents();
        document.removeEventListener("focusout", this.#lt_handleDocumentFocusOut, true);
        this.#lt_scheduleRenumber.lt_cancel();
    }

    override openSetting() {
        this.lt_openSettings();
    }

    private lt_bindEvents() {
        this.eventBus.on("ws-main", this.#lt_handleEditorChanged);
        this.eventBus.on("loaded-protyle-static", this.#lt_handleEditorChanged);
        this.eventBus.on("loaded-protyle-dynamic", this.#lt_handleEditorChanged);
        this.eventBus.on("switch-protyle", this.#lt_handleSwitchProtyle);
        this.eventBus.on("destroy-protyle", this.#lt_handleEditorChanged);
        this.eventBus.on("open-noneditableblock" as keyof lt_IEventBusMap, this.#lt_handleOpenNoneditableBlock as never);
    }

    private lt_unbindEvents() {
        this.eventBus.off("ws-main", this.#lt_handleEditorChanged);
        this.eventBus.off("loaded-protyle-static", this.#lt_handleEditorChanged);
        this.eventBus.off("loaded-protyle-dynamic", this.#lt_handleEditorChanged);
        this.eventBus.off("switch-protyle", this.#lt_handleSwitchProtyle);
        this.eventBus.off("destroy-protyle", this.#lt_handleEditorChanged);
        this.eventBus.off("open-noneditableblock" as keyof lt_IEventBusMap, this.#lt_handleOpenNoneditableBlock as never);
    }

    private async lt_loadSettings(): Promise<lt_PluginSettings> {
        try {
            const lt_stored = await this.loadData(lt_STORAGE_NAME);
            return lt_normalizeSettings(lt_stored);
        } catch {
            return lt_createDefaultSettings();
        }
    }

    private async lt_saveSettings() {
        await this.saveData(lt_STORAGE_NAME, lt_toStoredSettings(this.#lt_settings));
    }

    private lt_openSettings() {
        const lt_rootId = this.lt_getActiveRootId();
        lt_openSettingsDialog({
            lt_globalEnabled: this.#lt_settings.lt_globalEnabled,
            lt_defaultEnableNewDocuments: this.#lt_settings.lt_defaultEnableNewDocuments,
            lt_currentDocumentEnabled: this.lt_isDocumentEnabled(lt_rootId),
            lt_hasActiveDocument: Boolean(lt_rootId),
        }, async (lt_result) => {
            await this.lt_applySettings(lt_result);
        });
    }

    private async lt_toggleNumbering() {
        const lt_rootId = this.lt_getActiveRootId();
        const lt_wasEnabled = this.lt_isDocumentEnabled(lt_rootId);

        if (this.#lt_settings.lt_globalEnabled) {
            this.#lt_settings.lt_globalEnabled = false;
            await this.lt_saveSettings();
            this.#lt_toolbar?.lt_setEnabled(this.lt_isDocumentEnabled(lt_rootId));

            if (lt_rootId && lt_wasEnabled) {
                await this.lt_clearActiveDocument();
            }
            lt_showMessage("LaTeX formula numbering is globally disabled.");
            return;
        }

        if (!lt_rootId) {
            lt_showMessage("No active document.");
            return;
        }

        const lt_nextEnabled = !lt_wasEnabled;
        this.#lt_settings.lt_enabledByDoc[lt_rootId] = lt_nextEnabled;
        await this.lt_saveSettings();
        this.#lt_toolbar?.lt_setEnabled(lt_nextEnabled);

        if (lt_nextEnabled) {
            await this.lt_renumberActiveDocument();
            lt_showMessage("LaTeX formula numbering is enabled for this document.");
            return;
        }

        await this.lt_clearActiveDocument();
        lt_showMessage("LaTeX formula numbering is disabled for this document.");
    }

    private async lt_applySettings(lt_result: lt_SettingsDialogResult) {
        const lt_rootId = this.lt_getActiveRootId();
        const lt_wasEnabled = this.lt_isDocumentEnabled(lt_rootId);
        const lt_previousDefaultNewDocuments = this.#lt_settings.lt_defaultEnableNewDocuments;

        this.#lt_settings.lt_globalEnabled = lt_result.lt_globalEnabled;
        this.#lt_settings.lt_defaultEnableNewDocuments = lt_result.lt_globalEnabled ? false : lt_result.lt_defaultEnableNewDocuments;
        if (this.#lt_settings.lt_defaultEnableNewDocuments && !lt_previousDefaultNewDocuments) {
            this.#lt_settings.lt_defaultEnableNewDocumentsSince = lt_getCurrentSiyuanTimestamp();
        }
        if (!this.#lt_settings.lt_defaultEnableNewDocuments) {
            this.#lt_settings.lt_defaultEnableNewDocumentsSince = "";
        }

        if (lt_rootId && !this.#lt_settings.lt_globalEnabled) {
            this.#lt_settings.lt_enabledByDoc[lt_rootId] = lt_result.lt_currentDocumentEnabled;
        }

        await this.lt_saveSettings();

        const lt_isEnabled = this.lt_isDocumentEnabled(lt_rootId);
        this.#lt_toolbar?.lt_setEnabled(lt_isEnabled);

        if (!lt_rootId) {
            lt_showMessage("LaTeX Tag settings saved.");
            return;
        }

        if (lt_isEnabled) {
            await this.lt_renumberActiveDocument();
            lt_showMessage(this.#lt_settings.lt_globalEnabled ? "LaTeX formula numbering is globally enabled." : "LaTeX formula numbering is enabled for this document.");
            return;
        }

        if (lt_wasEnabled) {
            await this.lt_clearActiveDocument();
        }
        lt_showMessage("LaTeX formula numbering is disabled for this document.");
    }

    private lt_getActiveRootId(): string {
        const lt_activeEditor = lt_getActiveEditor();
        const lt_rootId = lt_activeEditor?.protyle?.block?.rootID ?? "";
        this.#lt_activeRootId = lt_rootId;
        return lt_rootId;
    }

    private lt_isActiveDocumentEnabled(): boolean {
        const lt_rootId = this.lt_getActiveRootId();
        return this.lt_isDocumentEnabled(lt_rootId);
    }

    private lt_isDocumentEnabled(lt_rootId: string): boolean {
        if (!lt_rootId) {
            return false;
        }

        if (this.#lt_settings.lt_globalEnabled) {
            return true;
        }

        const lt_explicitValue = this.#lt_settings.lt_enabledByDoc[lt_rootId];
        if (typeof lt_explicitValue === "boolean") {
            return lt_explicitValue;
        }

        return this.#lt_settings.lt_defaultEnableNewDocuments && lt_isDocumentCreatedAfter(lt_rootId, this.#lt_settings.lt_defaultEnableNewDocumentsSince);
    }

    private lt_getVisibleMathBlockOrder(): string[] {
        const lt_activeEditor = lt_getActiveEditor();
        const lt_editorElement = lt_activeEditor?.protyle?.element;
        if (!lt_editorElement) {
            return [];
        }

        return Array.from(lt_editorElement.querySelectorAll<HTMLElement>(
            "[data-node-id][data-type='NodeMathBlock'], [data-node-id][data-subtype='math']",
        ))
            .map((lt_element) => lt_element.dataset.nodeId)
            .filter((lt_id): lt_id is string => Boolean(lt_id));
    }

    private lt_isEditingMathBlock(): boolean {
        const lt_activeElement = document.activeElement;
        if (lt_activeElement instanceof HTMLElement && this.lt_isMathEditorElement(lt_activeElement)) {
            return true;
        }

        const lt_mathEditor = this.#lt_activeMathEditorElement;
        if (!lt_mathEditor?.isConnected) {
            this.#lt_activeMathEditorElement = undefined;
            this.#lt_activeMathBlockElement = undefined;
            return false;
        }

        return Boolean(
            lt_mathEditor.querySelector("textarea:focus, input:focus, [contenteditable='true']:focus"),
        );
    }

    private lt_isMathEditorElement(lt_element: HTMLElement): boolean {
        if (lt_isMathBlockElement(lt_element) || Boolean(lt_element.closest("[data-type='NodeMathBlock'], [data-subtype='math']"))) {
            return true;
        }

        const lt_mathEditor = this.#lt_activeMathEditorElement;
        if (lt_mathEditor?.isConnected && lt_mathEditor.contains(lt_element)) {
            return true;
        }

        return Boolean(
            this.#lt_activeMathBlockElement?.isConnected &&
            lt_element instanceof HTMLTextAreaElement &&
            lt_mathEditor?.isConnected,
        );
    }

    private async lt_renumberActiveDocument() {
        const lt_rootId = this.lt_getActiveRootId();
        if (!lt_rootId || this.#lt_isApplying || this.lt_isEditingMathBlock()) {
            return;
        }

        this.#lt_isApplying = true;
        try {
            await lt_renumberCurrentDocument(lt_rootId, this.lt_getVisibleMathBlockOrder());
        } catch (lt_error) {
            console.error("[latextag] renumber failed", lt_error);
            lt_showMessage("LaTeX formula numbering failed. See console.", 5000, "error");
        } finally {
            this.#lt_isApplying = false;
        }
    }

    private async lt_clearActiveDocument() {
        const lt_rootId = this.lt_getActiveRootId();
        if (!lt_rootId || this.#lt_isApplying) {
            return;
        }

        this.#lt_isApplying = true;
        try {
            await lt_clearCurrentDocumentTags(lt_rootId);
        } catch (lt_error) {
            console.error("[latextag] clear tags failed", lt_error);
            lt_showMessage("Failed to clear LaTeX formula tags. See console.", 5000, "error");
        } finally {
            this.#lt_isApplying = false;
        }
    }
}

function lt_createDefaultSettings(): lt_PluginSettings {
    return {
        ...lt_DEFAULT_SETTINGS,
        lt_enabledByDoc: {},
    };
}

function lt_isMathBlockElement(lt_element: HTMLElement): boolean {
    return lt_element.dataset.type === "NodeMathBlock" || lt_element.dataset.subtype === "math";
}

function lt_normalizeSettings(lt_stored: unknown): lt_PluginSettings {
    const lt_settings = lt_createDefaultSettings();

    if (lt_stored && typeof lt_stored === "object") {
        const lt_storedObject = lt_stored as Record<string, unknown>;

        lt_settings.lt_globalEnabled = lt_readBooleanSetting(lt_storedObject, "lt_globalEnabled", "globalEnabled");
        lt_settings.lt_defaultEnableNewDocuments = lt_readBooleanSetting(lt_storedObject, "lt_defaultEnableNewDocuments", "defaultEnableNewDocuments") && !lt_settings.lt_globalEnabled;
        lt_settings.lt_defaultEnableNewDocumentsSince = lt_readStringSetting(lt_storedObject, "lt_defaultEnableNewDocumentsSince", "defaultEnableNewDocumentsSince");

        const lt_enabledByDoc = lt_storedObject.lt_enabledByDoc ?? lt_storedObject.enabledByDoc;
        if (lt_enabledByDoc && typeof lt_enabledByDoc === "object" && !Array.isArray(lt_enabledByDoc)) {
            lt_settings.lt_enabledByDoc = Object.fromEntries(
                Object.entries(lt_enabledByDoc as Record<string, unknown>)
                    .filter(([lt_rootId, lt_enabled]) => lt_rootId && typeof lt_enabled === "boolean"),
            ) as Record<string, boolean>;
        }
    }

    return lt_settings;
}

function lt_toStoredSettings(lt_settings: lt_PluginSettings) {
    return {
        lt_globalEnabled: lt_settings.lt_globalEnabled,
        lt_defaultEnableNewDocuments: lt_settings.lt_defaultEnableNewDocuments,
        lt_defaultEnableNewDocumentsSince: lt_settings.lt_defaultEnableNewDocumentsSince,
        lt_enabledByDoc: lt_settings.lt_enabledByDoc,
    };
}

function lt_readBooleanSetting(lt_storedObject: Record<string, unknown>, lt_key: string, lt_legacyKey: string): boolean {
    return lt_storedObject[lt_key] === true || lt_storedObject[lt_legacyKey] === true;
}

function lt_readStringSetting(lt_storedObject: Record<string, unknown>, lt_key: string, lt_legacyKey: string): string {
    const lt_value = lt_storedObject[lt_key] ?? lt_storedObject[lt_legacyKey];
    return typeof lt_value === "string" ? lt_value : "";
}

function lt_isDocumentCreatedAfter(lt_rootId: string, lt_since: string): boolean {
    const lt_created = lt_rootId.slice(0, 14);
    return /^\d{14}$/.test(lt_created) && /^\d{14}$/.test(lt_since) && lt_created >= lt_since;
}

function lt_getCurrentSiyuanTimestamp(): string {
    const lt_date = new Date();
    const lt_pad = (lt_value: number) => lt_value.toString().padStart(2, "0");
    return [
        lt_date.getFullYear().toString(),
        lt_pad(lt_date.getMonth() + 1),
        lt_pad(lt_date.getDate()),
        lt_pad(lt_date.getHours()),
        lt_pad(lt_date.getMinutes()),
        lt_pad(lt_date.getSeconds()),
    ].join("");
}
