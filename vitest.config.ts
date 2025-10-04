import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**"],
    },
});
