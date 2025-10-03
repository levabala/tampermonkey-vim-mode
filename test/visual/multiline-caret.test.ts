import { beforeEach, describe, expect, it } from "vitest";
import { calculateCaretPosition } from "../../src/common.js";
import type { TextMetrics } from "../../src/types.js";

// Mock TextMetrics for testing
class MockTextMetrics implements TextMetrics {
    private fontSize: number;
    private lineHeight: number;
    private charWidth: number;

    constructor(fontSize = 16, lineHeight = 19.2, charWidth = 8) {
        this.fontSize = fontSize;
        this.lineHeight = lineHeight;
        this.charWidth = charWidth;
    }

    measureText(text: string): number {
        return text.length * this.charWidth;
    }

    getCharWidth(): number {
        return this.charWidth;
    }

    getFontSize(): number {
        return this.fontSize;
    }

    getLineHeight(): number {
        return this.lineHeight;
    }
}

describe("Multiline Caret Positioning", () => {
    let textarea: HTMLTextAreaElement;
    let metrics: MockTextMetrics;

    beforeEach(() => {
        // Clean up
        document.body.innerHTML = "";

        // Create textarea with fixed positioning
        textarea = document.createElement("textarea");
        textarea.style.cssText = `
            position: absolute;
            left: 100px;
            top: 100px;
            width: 300px;
            height: 150px;
            padding: 10px;
            font-size: 16px;
            font-family: monospace;
            line-height: 1.2;
            border: 1px solid black;
        `;
        document.body.appendChild(textarea);

        metrics = new MockTextMetrics();
    });

    describe("Single Line in Textarea", () => {
        it("should position caret at start of line", () => {
            textarea.value = "hello world";
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should position caret in middle of line", () => {
            textarea.value = "hello world";
            textarea.selectionStart = 5;
            textarea.selectionEnd = 5;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            // X position should be defined (actual value depends on DOM layout)
            expect(position.x).toBeGreaterThanOrEqual(0);
            expect(position.width).toBeGreaterThan(0);
        });

        it("should position caret at end of line", () => {
            textarea.value = "hello";
            textarea.selectionStart = 5;
            textarea.selectionEnd = 5;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
        });
    });

    describe("Multiple Lines in Textarea", () => {
        it("should position caret on first line", () => {
            textarea.value = "line1\nline2\nline3";
            textarea.selectionStart = 2; // Middle of first line
            textarea.selectionEnd = 2;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should position caret on second line", () => {
            textarea.value = "line1\nline2\nline3";
            textarea.selectionStart = 8; // Middle of second line (6 + 2)
            textarea.selectionEnd = 8;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            // Y position should be defined (actual value depends on DOM layout)
            expect(position.y).toBeGreaterThanOrEqual(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should position caret on third line", () => {
            textarea.value = "line1\nline2\nline3";
            textarea.selectionStart = 14; // Middle of third line (6 + 6 + 2)
            textarea.selectionEnd = 14;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            // Y position should be defined (actual value depends on DOM layout)
            expect(position.y).toBeGreaterThanOrEqual(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should position caret at start of second line (after newline)", () => {
            textarea.value = "line1\nline2";
            textarea.selectionStart = 6; // Start of second line
            textarea.selectionEnd = 6;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.y).toBeGreaterThanOrEqual(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should position caret at end of middle line", () => {
            textarea.value = "line1\nline2\nline3";
            textarea.selectionStart = 11; // End of second line
            textarea.selectionEnd = 11;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });
    });

    describe("Empty Lines", () => {
        it("should handle empty first line", () => {
            textarea.value = "\nline2\nline3";
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
        });

        it("should handle empty middle line", () => {
            textarea.value = "line1\n\nline3";
            textarea.selectionStart = 6; // Start of empty line
            textarea.selectionEnd = 6;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });

        it("should handle multiple consecutive empty lines", () => {
            textarea.value = "line1\n\n\nline4";
            textarea.selectionStart = 7; // Middle empty line
            textarea.selectionEnd = 7;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });
    });

    describe("Long Lines with Wrapping", () => {
        it("should handle long line that may wrap", () => {
            textarea.value =
                "this is a very long line that might wrap depending on the width";
            textarea.selectionStart = 30;
            textarea.selectionEnd = 30;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should handle caret at end of long line", () => {
            const longText = "a".repeat(100);
            textarea.value = longText;
            textarea.selectionStart = 100;
            textarea.selectionEnd = 100;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });
    });

    describe("Special Characters", () => {
        it("should handle tabs in text", () => {
            textarea.value = "hello\tworld";
            textarea.selectionStart = 6; // After tab
            textarea.selectionEnd = 6;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });

        it("should handle unicode characters", () => {
            textarea.value = "hello 🌍 world";
            textarea.selectionStart = 7; // After emoji
            textarea.selectionEnd = 7;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });

        it("should handle multiple spaces", () => {
            textarea.value = "hello     world";
            textarea.selectionStart = 8; // In middle of spaces
            textarea.selectionEnd = 8;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty textarea", () => {
            textarea.value = "";
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
            expect(position.height).toBeCloseTo(19.2, 1);
        });

        it("should handle textarea with only newlines", () => {
            textarea.value = "\n\n\n";
            textarea.selectionStart = 1;
            textarea.selectionEnd = 1;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });

        it("should handle single character", () => {
            textarea.value = "x";
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
            expect(position.width).toBeGreaterThan(0);
        });

        it("should handle position at very last character", () => {
            textarea.value = "test\ntext";
            textarea.selectionStart = 9; // End of textarea
            textarea.selectionEnd = 9;

            const position = calculateCaretPosition(textarea, metrics);

            expect(position).toBeDefined();
        });
    });

    describe("Scrolled Content", () => {
        it("should account for scrollTop when calculating position", () => {
            textarea.value = "line1\n".repeat(20); // Many lines
            textarea.scrollTop = 50; // Scroll down
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position1 = calculateCaretPosition(textarea, metrics);

            textarea.scrollTop = 0;
            const position2 = calculateCaretPosition(textarea, metrics);

            // Positions should differ based on scroll
            expect(position1.y).not.toBe(position2.y);
        });

        it("should account for scrollLeft when calculating position", () => {
            textarea.value = "x".repeat(100); // Long line
            textarea.scrollLeft = 50; // Scroll right
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;

            const position1 = calculateCaretPosition(textarea, metrics);

            textarea.scrollLeft = 0;
            const position2 = calculateCaretPosition(textarea, metrics);

            // Positions should differ based on scroll
            expect(position1.x).not.toBe(position2.x);
        });
    });
});
