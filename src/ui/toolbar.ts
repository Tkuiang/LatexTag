import type {Plugin as lt_Plugin} from "siyuan";

export interface lt_ToolbarController {
    lt_setEnabled(lt_enabled: boolean): void;
}

export function lt_createToolbarController(
    lt_plugin: lt_Plugin,
    lt_enabled: boolean,
    lt_onToggle: () => void | Promise<void>,
    lt_onOpenSettings: () => void,
): lt_ToolbarController {
    const lt_element = lt_plugin.addTopBar({
        icon: "iconLatexTag",
        title: lt_getTitle(lt_enabled),
        position: "right",
        callback: () => {
            void lt_onToggle();
        },
    });

    lt_element.classList.add("latextag-toolbar");
    lt_element.addEventListener("contextmenu", (lt_event) => {
        lt_event.preventDefault();
        lt_event.stopPropagation();
        lt_onOpenSettings();
    });

    function lt_setEnabled(lt_nextEnabled: boolean) {
        lt_element.classList.toggle("latextag-toolbar--enabled", lt_nextEnabled);
        lt_element.setAttribute("aria-label", lt_getTitle(lt_nextEnabled));
        lt_element.setAttribute("data-position", "south");
        lt_element.setAttribute("title", lt_getTitle(lt_nextEnabled));
    }

    lt_setEnabled(lt_enabled);

    return {
        lt_setEnabled,
    };
}

function lt_getTitle(lt_enabled: boolean): string {
    return `公式自动编号：${lt_enabled ? "开启" : "关闭"}`;
}
