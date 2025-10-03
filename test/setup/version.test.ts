import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
    getIndicator,
} from "./test-helpers.js";

describe("Version Display", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should display version in the indicator", () => {
        input.focus();
        const indicator = getIndicator();

        // Find the version label child element
        const versionLabel = Array.from(indicator!.children).find((child) =>
            child.textContent?.startsWith("v"),
        );

        expect(versionLabel).toBeDefined();
        // In test environment, version will be 'unknown' due to document.currentScript not being available
        // In production, it will be extracted from the userscript header
        expect(versionLabel?.textContent).toMatch(/^v(\d+\.\d+\.\d+|unknown)$/);
    });
});
