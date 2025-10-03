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

describe("Mode Switching", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
        window.getModeText = getModeText;
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should start in insert mode when input is focused", () => {
        input.focus();
        expect(window.getModeText()).toBe("-- INSERT --");
    });

    it("should switch to normal mode on Escape", () => {
        input.focus();
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });

    it("should switch to normal mode on Ctrl-]", () => {
        input.focus();
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "]",
                ctrlKey: true,
                bubbles: true,
            }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });

    it("should remain in normal mode after Escape despite focus events", () => {
        input.focus();
        expect(window.getModeText()).toBe("-- INSERT --");

        // First Escape - should switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Simulate focusin event (which might happen due to blur prevention logic)
        input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Second Escape - should unfocus (blur the input)
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // After unfocusing, indicator should be hidden
        expect(window.getModeText()).toBe("");

        // Simulate blur/focus cycle and verify Escape still works
        input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "i", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- INSERT --");
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });

    it("should switch back to insert mode with i", () => {
        input.focus();
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "i", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- INSERT --");
    });

    it("should exit visual mode on Escape", () => {
        input.value = "hello world";
        input.focus();
        // Switch to normal mode first
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual mode with v
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "v", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- VISUAL --");

        // Exit visual mode with Escape
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });

    it("should exit visual mode on Ctrl-]", () => {
        input.value = "hello world";
        input.focus();
        // Switch to normal mode first
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual mode with v
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "v", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- VISUAL --");

        // Exit visual mode with Ctrl-]
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "]",
                ctrlKey: true,
                bubbles: true,
            }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });

    it("should exit visual-line mode on Ctrl-]", () => {
        input.value = "hello world";
        input.focus();
        // Switch to normal mode first
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual-line mode with V
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "V",
                shiftKey: true,
                bubbles: true,
            }),
        );
        expect(window.getModeText()).toBe("-- VISUAL LINE --");

        // Exit visual-line mode with Ctrl-]
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "]",
                ctrlKey: true,
                bubbles: true,
            }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");
    });
});
