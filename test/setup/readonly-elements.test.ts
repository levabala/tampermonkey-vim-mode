import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
    getModeText,
} from "./test-helpers.js";

declare global {
    interface Window {
        getModeText: () => string;
    }
}

describe("Readonly Elements", () => {
    let input: HTMLInputElement | null;
    let textarea: HTMLTextAreaElement | null;
    let readonlyInput: HTMLInputElement;
    let readonlyTextarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        window.getModeText = getModeText;

        // Initialize to null
        input = null;
        textarea = null;

        // Create readonly elements
        readonlyInput = document.createElement("input");
        readonlyInput.id = "readonly-input";
        readonlyInput.readOnly = true;
        readonlyInput.value = "readonly input text";
        document.body.appendChild(readonlyInput);

        readonlyTextarea = document.createElement("textarea");
        readonlyTextarea.id = "readonly-textarea";
        readonlyTextarea.readOnly = true;
        readonlyTextarea.value = "readonly textarea text";
        document.body.appendChild(readonlyTextarea);
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
        if (readonlyInput && readonlyInput.parentNode) {
            readonlyInput.blur();
            readonlyInput.remove();
        }
        if (readonlyTextarea && readonlyTextarea.parentNode) {
            readonlyTextarea.blur();
            readonlyTextarea.remove();
        }
    });

    it("should not enter vim mode for readonly input", () => {
        readonlyInput.focus();
        // Mode indicator should not show any vim mode for readonly elements
        const modeText = window.getModeText();
        expect(modeText).toBe("");
    });

    it("should not enter vim mode for readonly textarea", () => {
        readonlyTextarea.focus();
        // Mode indicator should not show any vim mode for readonly elements
        const modeText = window.getModeText();
        expect(modeText).toBe("");
    });

    it("should enter vim mode for regular input after readonly input", () => {
        // Create regular input for this test
        ({ input, textarea } = createTestElements());

        // Focus readonly first
        readonlyInput.focus();
        expect(window.getModeText()).toBe("");

        // Then focus regular input - should work normally
        input!.focus();
        expect(window.getModeText()).toBe("-- INSERT --");
    });

    it("should not respond to vim commands on readonly textarea", () => {
        readonlyTextarea.focus();

        // Try to enter normal mode - should not work
        readonlyTextarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("");

        // Try vim commands - should not work
        readonlyTextarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "i", bubbles: true }),
        );
        expect(window.getModeText()).toBe("");
    });
});
