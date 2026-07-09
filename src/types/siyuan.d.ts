declare module "siyuan" {
    export interface IWebSocketData<T = unknown> {
        code: number;
        msg?: string;
        data: T;
    }

    export interface IProtyle {
        element?: HTMLElement;
        block?: {
            rootID?: string;
        };
    }

    export interface Protyle {
        protyle?: IProtyle;
    }

    export interface IEventBusMap {
        "ws-main": IWebSocketData;
        "loaded-protyle-static": {
            protyle: IProtyle;
        };
        "loaded-protyle-dynamic": {
            protyle: IProtyle;
            position: "afterend" | "beforebegin";
        };
        "switch-protyle": {
            protyle: IProtyle;
        };
        "destroy-protyle": {
            protyle: IProtyle;
        };
    }

    export interface EventBus {
        on<T extends keyof IEventBusMap>(
            event: T,
            callback: (event: CustomEvent<IEventBusMap[T]>) => void,
        ): void;
        off<T extends keyof IEventBusMap>(
            event: T,
            callback: (event: CustomEvent<IEventBusMap[T]>) => void,
        ): void;
    }

    export abstract class Plugin {
        eventBus: EventBus;
        data: unknown;
        name: string;

        onload(): void;
        onunload(): void;
        openSetting(): void;
        addIcons(svg: string): void;
        addTopBar(options: {
            icon: string;
            title: string;
            callback: (event: MouseEvent) => void;
            position?: "right" | "left";
        }): HTMLElement;
        loadData<T = unknown>(storageName: string): Promise<T>;
        saveData(storageName: string, content: unknown): Promise<IWebSocketData>;
    }

    export function fetchSyncPost<T = unknown>(url: string, data?: unknown): Promise<IWebSocketData<T>>;
    export function getActiveEditor(wndActive?: boolean): Protyle | undefined;
    export function showMessage(text: string, timeout?: number, type?: "info" | "error", id?: string): void;

    export class Dialog {
        element: HTMLElement;
        constructor(options: {
            title: string;
            content: string;
            width?: string;
            height?: string;
        });
        destroy(): void;
    }
}
