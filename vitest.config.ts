import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        // Suppress expected canvas warnings from jsdom
        onConsoleLog: (log) => {
            if (log.includes("Not implemented: HTMLCanvasElement")) {
                return false;
            }
        },
    },
});
