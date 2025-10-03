import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "./test-helpers.js";

describe("Click handling while focused in input", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;
    let button: HTMLButtonElement;
    let clickHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());

        button = document.createElement("button");
        button.textContent = "Click me";
        clickHandler = vi.fn();
        button.addEventListener("click", clickHandler);
        document.body.appendChild(button);
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
        if (button.parentNode) {
            button.parentNode.removeChild(button);
        }
    });

    it("should allow button click to complete when clicking from focused input", async () => {
        // Focus input and enter insert mode
        input.focus();
        expect(document.activeElement).toBe(input);

        // Click on button - this triggers blur on input
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        // The click should have been processed
        expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it("should allow button click to complete from normal mode", async () => {
        // Focus input
        input.focus();
        expect(document.activeElement).toBe(input);

        // Switch to normal mode
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Click on button
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        // The click should have been processed
        expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it("should not refocus input after clicking button in insert mode", async () => {
        // Focus input in insert mode
        input.focus();
        expect(document.activeElement).toBe(input);

        // Click on button - this causes blur
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

        // Wait for any async refocusing
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                // Input should not be refocused
                expect(document.activeElement).not.toBe(input);
                resolve();
            }, 10);
        });
    });

    it("should not refocus input after clicking button in normal mode", async () => {
        // Focus input and switch to normal mode
        input.focus();
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Click on button
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

        // Wait for any async refocusing
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                // Input should not be refocused
                expect(document.activeElement).not.toBe(input);
                resolve();
            }, 10);
        });
    });
});
