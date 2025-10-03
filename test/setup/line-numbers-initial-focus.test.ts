import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "./test-helpers.js";

describe("Line numbers on initial focus", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should show line numbers column when focusing into insert mode", () => {
        // Set up textarea with multiple lines
        textarea.value = "line 1\nline 2\nline 3";

        // Focus the textarea (this should trigger insert mode)
        textarea.focus();

        // Check that line numbers container exists and is visible
        const lineNumbersContainers = Array.from(
            document.querySelectorAll('div[style*="position: absolute"]'),
        );
        const lineNumbersContainer = lineNumbersContainers.find((el) => {
            const content = el.textContent || "";
            return content.includes("1") && content.includes("2");
        });

        expect(lineNumbersContainer).toBeTruthy();
        expect(lineNumbersContainer?.textContent).toContain("1");
        expect(lineNumbersContainer?.textContent).toContain("2");
        expect(lineNumbersContainer?.textContent).toContain("3");

        // Check that the container is visible (display is not 'none')
        const style = (lineNumbersContainer as HTMLElement).style;
        expect(style.display).not.toBe("none");
    });

    it("should show line numbers with correct styling on initial focus", () => {
        // Set up textarea with multiple lines
        textarea.value = "line 1\nline 2";

        // Focus the textarea
        textarea.focus();

        // Find the line numbers container
        const containers = Array.from(
            document.querySelectorAll('div[style*="position: absolute"]'),
        );
        const lineNumbersContainer = containers.find((el) => {
            const content = el.textContent || "";
            return content.includes("1") && content.includes("2");
        });

        expect(lineNumbersContainer).toBeTruthy();

        // Check styling - note: jsdom doesn't compute styles, so we check inline styles
        const style = (lineNumbersContainer as HTMLElement).style;
        // Check that the important style properties are set (may be empty string in jsdom)
        expect(style.position).toBe("absolute");
        expect(style.pointerEvents).toBe("none");
    });

    it("should position line numbers correctly on initial focus", () => {
        // Set up textarea with multiple lines
        textarea.value = "line 1\nline 2";

        // Focus the textarea
        textarea.focus();

        // Find the line numbers container
        const containers = Array.from(
            document.querySelectorAll('div[style*="position: absolute"]'),
        );
        const lineNumbersContainer = containers.find((el) => {
            const content = el.textContent || "";
            return content.includes("1") && content.includes("2");
        }) as HTMLElement;

        expect(lineNumbersContainer).toBeTruthy();

        // Check that it's positioned absolutely
        expect(lineNumbersContainer.style.position).toBe("absolute");
    });
});
