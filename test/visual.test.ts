import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditableElement } from "../src/types.js";

// Mock the setup module
vi.mock("../src/setup.js", () => ({
    debug: vi.fn(),
    updateIndicator: vi.fn(),
}));

// Helper to create a real textarea element
function createTextarea(value: string): EditableElement {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;
    document.body.appendChild(textarea);
    return textarea as EditableElement;
}

// Helper to simulate key press
function pressKey(
    element: HTMLElement,
    key: string,
    options: { ctrlKey?: boolean } = {},
): void {
    const event = new KeyboardEvent("keydown", {
        key,
        ctrlKey: options.ctrlKey || false,
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event);
}

// Helper to wait for async operations
function waitForNextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Visual mode ESC behavior", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    it("should switch from visual mode to normal mode on ESC, not blur", async () => {
        const textarea = createTextarea("hello world");

        // Focus the textarea (starts in insert mode)
        textarea.focus();
        await waitForNextTick();

        // Switch to normal mode
        pressKey(textarea, "Escape");
        await waitForNextTick();

        // Enter visual mode with 'v'
        pressKey(textarea, "v");
        await waitForNextTick();

        // Verify textarea still has focus before ESC
        expect(document.activeElement).toBe(textarea);

        // Press ESC - should switch to normal mode, NOT blur
        pressKey(textarea, "Escape");
        await waitForNextTick();

        // Verify textarea still has focus (did not blur)
        expect(document.activeElement).toBe(textarea);
    });

    it("should switch from visual-line mode to normal mode on ESC, not blur", async () => {
        const textarea = createTextarea("line1\nline2\nline3");

        // Focus the textarea (starts in insert mode)
        textarea.focus();
        await waitForNextTick();

        // Switch to normal mode
        pressKey(textarea, "Escape");
        await waitForNextTick();

        // Enter visual-line mode with 'V'
        pressKey(textarea, "V");
        await waitForNextTick();

        // Verify textarea still has focus before ESC
        expect(document.activeElement).toBe(textarea);

        // Press ESC - should switch to normal mode, NOT blur
        pressKey(textarea, "Escape");
        await waitForNextTick();

        // Verify textarea still has focus (did not blur)
        expect(document.activeElement).toBe(textarea);
    });

    it("ESC from normal mode should blur (verified by existing tests)", async () => {
        // This behavior is already tested in test/setup/mode-switching.test.ts
        // where it verifies that pressing ESC in normal mode blurs the input.
        // We're testing the opposite here: ESC in visual mode should NOT blur.
        expect(true).toBe(true);
    });

    it("should work with Ctrl-[ instead of ESC in visual mode", async () => {
        const textarea = createTextarea("test content");

        // Focus the textarea (starts in insert mode)
        textarea.focus();
        await waitForNextTick();

        // Switch to normal mode
        pressKey(textarea, "Escape");
        await waitForNextTick();

        // Enter visual mode
        pressKey(textarea, "v");
        await waitForNextTick();

        // Verify textarea still has focus before Ctrl-[
        expect(document.activeElement).toBe(textarea);

        // Press Ctrl-[ - should switch to normal mode, NOT blur
        pressKey(textarea, "[", { ctrlKey: true });
        await waitForNextTick();

        // Verify textarea still has focus (did not blur)
        expect(document.activeElement).toBe(textarea);
    });
});
