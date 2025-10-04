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

describe("Visual Mode ESC/Ctrl-[ Behavior", () => {
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

    it("should switch from visual mode to normal mode on Escape without blurring", () => {
        input.value = "hello world";
        input.focus();
        expect(window.getModeText()).toBe("-- INSERT --");

        // Switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual mode with 'v'
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "v", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- VISUAL --");

        // Press Escape - should switch to normal mode without blurring
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Should be in normal mode
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Input should still be focused (not blurred)
        expect(document.activeElement).toBe(input);
    });

    it("should switch from visual mode to normal mode on Ctrl-[ without blurring", () => {
        input.value = "hello world";
        input.focus();
        expect(window.getModeText()).toBe("-- INSERT --");

        // Switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual mode with 'v'
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "v", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- VISUAL --");

        // Press Ctrl-[ - should switch to normal mode without blurring
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "[",
                ctrlKey: true,
                bubbles: true,
            }),
        );

        // Should be in normal mode
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Input should still be focused (not blurred)
        expect(document.activeElement).toBe(input);
    });

    it("should switch from visual-line mode to normal mode on Escape without blurring", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        expect(window.getModeText()).toBe("-- INSERT --");

        // Switch to normal mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Enter visual-line mode with 'V'
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "V", bubbles: true }),
        );
        expect(window.getModeText()).toBe("-- VISUAL LINE --");

        // Press Escape - should switch to normal mode without blurring
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Should be in normal mode
        expect(window.getModeText()).toBe("-- NORMAL --");

        // Textarea should still be focused (not blurred)
        expect(document.activeElement).toBe(textarea);
    });

    it("should clear visual selection when switching to normal mode", () => {
        input.value = "hello world";
        input.focus();

        // Switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Enter visual mode and make a selection
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "v", bubbles: true }),
        );

        // Move cursor to extend selection
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );

        // Press Escape - should clear selection and switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        expect(window.getModeText()).toBe("-- NORMAL --");
        expect(document.activeElement).toBe(input);

        // Selection should be cleared (checked by verifying no visual highlight overlay)
        const visualOverlay = document.querySelector(
            'div[style*="position: absolute"][style*="pointer-events: none"]',
        );
        // If overlay exists, it should either be hidden or removed
        if (visualOverlay) {
            const style = (visualOverlay as HTMLElement).style;
            expect(
                style.display === "none" || style.width === "0px",
            ).toBeTruthy();
        }
    });
});
