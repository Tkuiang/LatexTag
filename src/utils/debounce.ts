export interface lt_DebouncedFunction {
    (): void;
    lt_cancel(): void;
}

export function lt_debounce(lt_callback: () => void, lt_wait: number): lt_DebouncedFunction {
    let lt_timer: number | undefined;

    const lt_debounced = (() => {
        window.clearTimeout(lt_timer);
        lt_timer = window.setTimeout(() => {
            lt_timer = undefined;
            lt_callback();
        }, lt_wait);
    }) as lt_DebouncedFunction;

    lt_debounced.lt_cancel = () => {
        window.clearTimeout(lt_timer);
        lt_timer = undefined;
    };

    return lt_debounced;
}
