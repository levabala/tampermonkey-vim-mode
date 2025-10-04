import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        exclude: ["**/node_modules/**", "**/e2e/**"],
        // Suppress expected canvas warnings from jsdom
        onConsoleLog: (log) => {
            if (log.includes("Not implemented: HTMLCanvasElement")) {
                return false;
            }
        },
    },
});
