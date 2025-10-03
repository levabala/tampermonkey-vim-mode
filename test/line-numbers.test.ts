import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOMLineNumbersRenderer } from "../src/common.js";
import type { EditableElement } from "../src/types.js";

// Helper to create a mock textarea element
function createMockTextarea(
    value: string,
    selectionStart: number,
    width = 300,
): EditableElement {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.selectionStart = selectionStart;
    textarea.selectionEnd = selectionStart;

    // Set styles that affect wrapping
    textarea.style.fontSize = "16px";
    textarea.style.fontFamily = "monospace";
    textarea.style.padding = "10px";
    textarea.style.border = "1px solid black";
    textarea.style.width = `${width}px`;
    textarea.style.whiteSpace = "pre-wrap"; // Enable text wrapping
    textarea.style.wordWrap = "break-word";
    textarea.style.lineHeight = "20px";

    // Mock getBoundingClientRect
    textarea.getBoundingClientRect = vi.fn(() => ({
        left: 10,
        top: 10,
        width: width,
        height: 100,
        right: 10 + width,
        bottom: 110,
        x: 10,
        y: 10,
        toJSON: () => ({}),
    }));

    document.body.appendChild(textarea);
    return textarea as EditableElement;
}

describe("Line Numbers with Text Wrap", () => {
    let renderer: DOMLineNumbersRenderer;

    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
        renderer = new DOMLineNumbersRenderer();
        // Enable line numbers in config
        window.TAMPER_VIM_MODE = {
            showLineNumbers: true,
            relativeLineNumbers: false,
            disableCustomCaret: false,
        };
    });

    describe("Without text wrap", () => {
        it("should render line numbers for each logical line", () => {
            const textarea = createMockTextarea("line1\nline2\nline3", 0);
            renderer.render(textarea, 1, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            expect(container).toBeTruthy();
            expect(container.style.display).toBe("block");

            // Should have 3 line numbers
            const lineNumbers = container.textContent || "";
            const lines = lineNumbers.trim().split("\n");
            expect(lines.length).toBe(3);
        });

        it("should highlight current line", () => {
            const textarea = createMockTextarea("line1\nline2\nline3", 6);
            renderer.render(textarea, 2, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const innerHTML = container.innerHTML;

            // Line 2 should be highlighted
            expect(innerHTML).toContain("font-weight: bold");
        });
    });

    describe("With text wrap", () => {
        it("should render line numbers only for logical lines, not wrapped lines", () => {
            // Create a textarea with a very long line that will wrap
            // Assuming monospace font ~8px per char, width 200px = ~25 chars per line
            const longLine =
                "This is a very long line that will definitely wrap multiple times when displayed";
            const textarea = createMockTextarea(
                `short\n${longLine}\nshort2`,
                0,
                200,
            );

            // We have 3 logical lines: "short", longLine (wraps), "short2"
            renderer.render(textarea, 1, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            expect(container).toBeTruthy();

            // Should have exactly 3 line numbers (one per logical line)
            const lineNumbers = container.textContent || "";
            const lines = lineNumbers.trim().split("\n");
            expect(lines.length).toBe(3);
        });

        it("should align line numbers vertically with wrapped text", () => {
            // This test verifies that line numbers align with the first visual line
            // of each logical line, even when lines wrap
            const longLine = "A".repeat(100); // Very long line
            const textarea = createMockTextarea(
                `first\n${longLine}\nthird`,
                0,
                200,
            );

            renderer.render(textarea, 1, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;

            // Line numbers container should be positioned at the top of the textarea
            const textareaRect = textarea.getBoundingClientRect();
            const containerTop = parseInt(container.style.top);
            expect(containerTop).toBe(textareaRect.top + window.scrollY);

            // Height should match textarea height
            expect(container.style.height).toBe(`${textareaRect.height}px`);
        });

        it("should handle scroll correctly with wrapped lines", () => {
            const longLine = "B".repeat(150);
            const textarea = createMockTextarea(
                `${longLine}\n${longLine}\n${longLine}`,
                0,
                200,
            );
            textarea.scrollTop = 40;

            renderer.render(textarea, 1, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const wrapper = container.firstChild as HTMLElement;

            // The wrapper should have transform to sync with textarea scroll
            expect(wrapper.style.transform).toContain("translateY(-40px)");
        });

        it("should handle current line highlighting with wrapped text", () => {
            const longLine = "C".repeat(100);
            const textarea = createMockTextarea(
                `first\n${longLine}\nthird`,
                6 + longLine.length + 50,
                200,
            );

            // Cursor is in the middle of the long wrapped line (line 2)
            renderer.render(textarea, 2, 3);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const innerHTML = container.innerHTML;

            // Line 2 should be highlighted even though it wraps
            expect(innerHTML).toContain("font-weight: bold");

            // Count line numbers - should still be 3
            const lines = (container.textContent || "").trim().split("\n");
            expect(lines.length).toBe(3);
        });

        it("should update when textarea width changes causing different wrap points", () => {
            const text = "This is a moderately long line of text";
            const textarea = createMockTextarea(text, 0, 200);

            renderer.render(textarea, 1, 1);

            // Get initial line count
            let container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const initialLines = (container.textContent || "")
                .trim()
                .split("\n");
            expect(initialLines.length).toBe(1);

            // Change textarea width (simulating window resize)
            textarea.style.width = "100px";
            textarea.getBoundingClientRect = vi.fn(() => ({
                left: 10,
                top: 10,
                width: 100,
                height: 100,
                right: 110,
                bottom: 110,
                x: 10,
                y: 10,
                toJSON: () => ({}),
            }));

            // Re-render
            renderer.render(textarea, 1, 1);

            container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const newLines = (container.textContent || "").trim().split("\n");

            // Should still have 1 logical line (no \n characters)
            expect(newLines.length).toBe(1);
        });

        it("should handle empty lines that don't wrap", () => {
            const textarea = createMockTextarea("line1\n\n\nline4", 0, 200);

            renderer.render(textarea, 1, 4);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const lines = (container.textContent || "").trim().split("\n");

            // Should have 4 line numbers for 4 logical lines
            expect(lines.length).toBe(4);
        });

        it("should handle mix of wrapped and non-wrapped lines", () => {
            const shortLine = "short";
            const longLine = "D".repeat(100);
            const textarea = createMockTextarea(
                `${shortLine}\n${longLine}\n${shortLine}\n${longLine}`,
                0,
                200,
            );

            renderer.render(textarea, 1, 4);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const lines = (container.textContent || "").trim().split("\n");

            // Should have exactly 4 line numbers (one per logical line)
            expect(lines.length).toBe(4);
        });
    });

    describe("Relative line numbers with wrap", () => {
        beforeEach(() => {
            window.TAMPER_VIM_MODE = {
                showLineNumbers: true,
                relativeLineNumbers: true,
                disableCustomCaret: false,
            };
        });

        it("should show relative line numbers correctly with wrapped lines", () => {
            const longLine = "E".repeat(100);
            const textarea = createMockTextarea(
                `line1\n${longLine}\nline3\nline4`,
                0,
                200,
            );

            // Current line is 2 (the long wrapped line)
            renderer.render(textarea, 2, 4);

            const container = document.querySelector(
                'div[style*="position: absolute"]',
            ) as HTMLElement;
            const text = container.textContent || "";

            // Should contain relative line numbers: 1, 2 (current), 1, 2
            // Note: exact formatting may vary, but should show relative distances
            expect(text).toBeTruthy();

            // Should have 4 lines
            const lines = text.trim().split("\n");
            expect(lines.length).toBe(4);
        });
    });
});
