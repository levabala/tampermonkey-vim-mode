import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";

describe("Line numbers on initial focus", () => {
    let dom: JSDOM;
    let document: Document;
    let window: Window & typeof globalThis;

    beforeEach(() => {
        // Create a new JSDOM instance for each test
        dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
            url: "http://localhost",
            pretendToBeVisual: true,
        });
        document = dom.window.document;
        window = dom.window as unknown as Window & typeof globalThis;

        // Set up global objects for the script
        global.document = document;
        global.window = window;

        // Mock TAMPER_VIM_MODE config with line numbers enabled
        (global as any).TAMPER_VIM_MODE = {
            showLineNumbers: true,
            relativeLineNumbers: false,
            disableCustomCaret: false,
        };

        // Set up debug logging
        (global as any).debug = (...args: any[]) => {
            // Silent by default, can be enabled for debugging
        };

        // Mock updateIndicator
        (global as any).updateIndicator = vi.fn();
    });

    it("should show line numbers column when focusing into insert mode", async () => {
        // Import the main script which sets up event listeners
        await import("../../src/main.js");

        // Create a textarea
        const textarea = document.createElement("textarea");
        textarea.value = "line 1\nline 2\nline 3";
        document.body.appendChild(textarea);

        // Focus the textarea (this should trigger insert mode)
        textarea.focus();
        const focusEvent = new dom.window.FocusEvent("focusin", {
            bubbles: true,
            target: textarea,
        });
        textarea.dispatchEvent(focusEvent);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Check that line numbers container exists and is visible
        const lineNumbersContainer = document.querySelector(
            'div[style*="position: absolute"]',
        );
        expect(lineNumbersContainer).toBeTruthy();
        expect(lineNumbersContainer?.textContent).toContain("1");
        expect(lineNumbersContainer?.textContent).toContain("2");
        expect(lineNumbersContainer?.textContent).toContain("3");

        // Check that the container is visible (display is not 'none')
        const computedStyle = window.getComputedStyle(
            lineNumbersContainer as Element,
        );
        expect(computedStyle.display).not.toBe("none");
    });

    it("should show line numbers with correct styling on initial focus", async () => {
        // Import the main script which sets up event listeners
        await import("../../src/main.js");

        // Create a textarea
        const textarea = document.createElement("textarea");
        textarea.value = "line 1\nline 2";
        document.body.appendChild(textarea);

        // Focus the textarea
        textarea.focus();
        const focusEvent = new dom.window.FocusEvent("focusin", {
            bubbles: true,
            target: textarea,
        });
        textarea.dispatchEvent(focusEvent);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Find the line numbers container
        const containers = Array.from(
            document.querySelectorAll('div[style*="position: absolute"]'),
        );
        const lineNumbersContainer = containers.find((el) =>
            el.textContent?.includes("1"),
        );

        expect(lineNumbersContainer).toBeTruthy();

        // Check styling
        const style = (lineNumbersContainer as HTMLElement).style;
        expect(style.backgroundColor).toContain("rgba(0, 0, 0, 0.7)");
        expect(style.color).toContain("rgba(255, 255, 255, 0.6)");
        expect(style.fontFamily).toBe("monospace");
    });

    it("should position line numbers correctly on initial focus", async () => {
        // Import the main script which sets up event listeners
        await import("../../src/main.js");

        // Create a textarea with known position
        const textarea = document.createElement("textarea");
        textarea.value = "line 1\nline 2";
        textarea.style.position = "absolute";
        textarea.style.left = "100px";
        textarea.style.top = "50px";
        document.body.appendChild(textarea);

        // Mock getBoundingClientRect
        textarea.getBoundingClientRect = vi.fn(() => ({
            left: 100,
            top: 50,
            width: 300,
            height: 100,
            right: 400,
            bottom: 150,
            x: 100,
            y: 50,
            toJSON: () => ({}),
        }));

        // Focus the textarea
        textarea.focus();
        const focusEvent = new dom.window.FocusEvent("focusin", {
            bubbles: true,
            target: textarea,
        });
        textarea.dispatchEvent(focusEvent);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Find the line numbers container
        const containers = Array.from(
            document.querySelectorAll('div[style*="position: absolute"]'),
        );
        const lineNumbersContainer = containers.find((el) =>
            el.textContent?.includes("1"),
        ) as HTMLElement;

        expect(lineNumbersContainer).toBeTruthy();

        // Check that it's positioned to the left of the textarea
        expect(lineNumbersContainer.style.top).toBe("50px");
        expect(lineNumbersContainer.style.height).toBe("100px");
    });
});
