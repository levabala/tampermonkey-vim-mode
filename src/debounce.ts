/**
 * Creates a smart debounced function that executes immediately on first call,
 * then debounces rapid subsequent calls.
 *
 * @param fn Function to debounce
 * @param wait Time in ms to wait before executing subsequent calls
 * @returns Debounced function
 */
export function createSmartDebounce<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
    wait: number,
): (...args: TArgs) => void {
    let timer: number | null = null;
    let lastExecution = 0;

    return (...args: TArgs) => {
        const now = performance.now();
        const timeSinceLastExecution = now - lastExecution;

        // If it's been more than 'wait' ms since last execution, execute immediately
        if (timeSinceLastExecution > wait) {
            lastExecution = now;
            fn(...args);
            return;
        }

        // Cancel any pending execution
        if (timer !== null) {
            clearTimeout(timer);
        }

        // Schedule debounced execution
        timer = window.setTimeout(() => {
            timer = null;
            lastExecution = performance.now();
            fn(...args);
        }, wait);
    };
}
