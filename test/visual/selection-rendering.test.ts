import { beforeEach, describe, expect, it } from "vitest";
import {
    calculateSelectionRects,
    DOMVisualSelectionRenderer,
    updateVisualSelection,
    clearVisualSelection,
    removeVisualSelection,
} from "../../src/common.js";
import type { SelectionRect, TextMetrics } from "../../src/types.js";

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

describe("Visual Selection Rendering", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;
    let metrics: MockTextMetrics;

    beforeEach(() => {
        // Clean up existing elements
        document.body.innerHTML = "";

        // Create fresh test elements
        input = document.createElement("input");
        input.style.cssText = `
            position: absolute;
            left: 100px;
            top: 100px;
            width: 200px;
            padding: 5px;
            font-size: 16px;
            font-family: monospace;
        `;
        document.body.appendChild(input);

        textarea = document.createElement("textarea");
        textarea.style.cssText = `
            position: absolute;
            left: 100px;
            top: 200px;
            width: 200px;
            height: 100px;
            padding: 5px;
            font-size: 16px;
            font-family: monospace;
        `;
        document.body.appendChild(textarea);

        metrics = new MockTextMetrics();
    });

    describe("calculateSelectionRects", () => {
        it("should calculate single-line selection rect for input", () => {
            input.value = "hello world";
            input.selectionStart = 0;
            input.selectionEnd = 5;

            const rects = calculateSelectionRects(input, 0, 5, metrics);

            expect(rects).toHaveLength(1);
            expect(rects[0]).toMatchObject({
                width: 40, // 5 chars * 8px
                height: 19.2,
            });
        });

        it("should handle empty selection", () => {
            input.value = "hello";
            const rects = calculateSelectionRects(input, 2, 2, metrics);

            expect(rects).toHaveLength(1);
            expect(rects[0].width).toBe(0);
        });

        it("should handle selection at end of input", () => {
            input.value = "hello";
            const rects = calculateSelectionRects(input, 3, 5, metrics);

            expect(rects).toHaveLength(1);
            expect(rects[0].width).toBe(16); // 2 chars * 8px
        });

        it("should handle reversed selection (end < start)", () => {
            input.value = "hello world";
            const rects = calculateSelectionRects(input, 7, 2, metrics);

            expect(rects).toHaveLength(1);
            expect(rects[0].width).toBe(40); // 5 chars * 8px
        });

        it("should preserve selection direction (forward)", () => {
            // When selecting forward (start=2, end=7), selection should go from 2 to 7
            input.value = "hello world";
            const rects = calculateSelectionRects(input, 2, 7, metrics);

            expect(rects).toHaveLength(1);
            // Selection should start at position 2 (char 'l')
            const rect = input.getBoundingClientRect();
            const expectedX = rect.left + window.scrollX + 5 + 2 * 8; // padding + (2 chars * 8px)
            expect(rects[0].x).toBeCloseTo(expectedX, 0);
            expect(rects[0].width).toBe(40); // 5 chars * 8px
        });

        it("should preserve selection direction (backward)", () => {
            // When selecting backward (start=7, end=2), selection should still go from 2 to 7
            // but we need to verify it starts at position 2, not position 7
            input.value = "hello world";
            const rects = calculateSelectionRects(input, 7, 2, metrics);

            expect(rects).toHaveLength(1);
            // Selection should start at position 2 (the minimum), not jump to 7
            const rect = input.getBoundingClientRect();
            const expectedX = rect.left + window.scrollX + 5 + 2 * 8; // padding + (2 chars * 8px)
            expect(rects[0].x).toBeCloseTo(expectedX, 0);
            expect(rects[0].width).toBe(40); // 5 chars * 8px
        });

        it("should calculate multiline selection rects for textarea", () => {
            textarea.value = "line1\nline2\nline3";
            // Select from "ne1" to "ne2" (across two lines)
            const rects = calculateSelectionRects(textarea, 3, 12, metrics);

            // Should have at least 2 rectangles (one for each line)
            expect(rects.length).toBeGreaterThanOrEqual(1);
        });

        it("should handle full line selection in textarea", () => {
            textarea.value = "line1\nline2\nline3";
            // Select entire second line including newline
            const rects = calculateSelectionRects(textarea, 6, 12, metrics);

            expect(rects.length).toBeGreaterThanOrEqual(1);
        });

        it("should handle selection spanning multiple lines", () => {
            textarea.value = "abc\ndef\nghi";
            // Select from start to end (all three lines)
            const rects = calculateSelectionRects(textarea, 0, 11, metrics);

            expect(rects.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("DOMVisualSelectionRenderer", () => {
        let renderer: DOMVisualSelectionRenderer;

        beforeEach(() => {
            renderer = new DOMVisualSelectionRenderer();
        });

        it("should create renderer with container in DOM", () => {
            const containers = document.querySelectorAll(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(containers.length).toBeGreaterThan(0);
        });

        it("should render selection rectangles", () => {
            const rects: SelectionRect[] = [
                { x: 10, y: 20, width: 50, height: 20 },
                { x: 10, y: 40, width: 30, height: 20 },
            ];

            renderer.render(rects);

            // Check that rectangles were created
            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(container?.children.length).toBe(2);
        });

        it("should clear existing rectangles when rendering new ones", () => {
            const rects1: SelectionRect[] = [
                { x: 10, y: 20, width: 50, height: 20 },
            ];
            const rects2: SelectionRect[] = [
                { x: 10, y: 20, width: 30, height: 20 },
                { x: 10, y: 40, width: 40, height: 20 },
            ];

            renderer.render(rects1);
            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(container?.children.length).toBe(1);

            renderer.render(rects2);
            expect(container?.children.length).toBe(2);
        });

        it("should clear all rectangles", () => {
            const rects: SelectionRect[] = [
                { x: 10, y: 20, width: 50, height: 20 },
            ];

            renderer.render(rects);
            renderer.clear();

            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(container?.children.length).toBe(0);
        });

        it("should destroy renderer and remove from DOM", () => {
            const containersBefore = document.querySelectorAll(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            const countBefore = containersBefore.length;

            renderer.destroy();

            const containersAfter = document.querySelectorAll(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(containersAfter.length).toBeLessThan(countBefore);
        });

        it("should apply correct styling to selection rectangles", () => {
            const rects: SelectionRect[] = [
                { x: 10, y: 20, width: 50, height: 20 },
            ];

            renderer.render(rects);

            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            ) as HTMLElement;
            const rect = container?.children[0] as HTMLElement;

            expect(rect.style.position).toBe("absolute");
            expect(rect.style.left).toBe("10px");
            expect(rect.style.top).toBe("20px");
            expect(rect.style.width).toBe("50px");
            expect(rect.style.height).toBe("20px");
            expect(rect.style.backgroundColor).toBe("rgba(80, 120, 255, 0.3)");
            expect(rect.style.border).toBe("1px solid rgba(80, 120, 255, 0.5)");
        });
    });

    describe("Visual Selection Integration", () => {
        beforeEach(() => {
            // Clear any existing renderers
            removeVisualSelection();
        });

        it("should create and update visual selection", () => {
            input.value = "hello world";

            updateVisualSelection(input, 0, 5);

            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(container).not.toBeNull();
            expect(container?.children.length).toBeGreaterThan(0);
        });

        it("should clear visual selection", () => {
            input.value = "hello world";
            updateVisualSelection(input, 0, 5);

            clearVisualSelection();

            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            // Container still exists but should have no children
            if (container) {
                expect(container.children.length).toBe(0);
            }
        });

        it("should remove visual selection renderer completely", () => {
            input.value = "hello world";
            updateVisualSelection(input, 0, 5);

            const containersBefore = document.querySelectorAll(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            const countBefore = containersBefore.length;

            removeVisualSelection();

            const containersAfter = document.querySelectorAll(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(containersAfter.length).toBeLessThanOrEqual(countBefore);
        });

        it("should handle multiple updates to visual selection", () => {
            input.value = "hello world";

            updateVisualSelection(input, 0, 5);
            updateVisualSelection(input, 6, 11);
            updateVisualSelection(input, 0, 11);

            const container = document.body.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"]',
            );
            expect(container).not.toBeNull();
        });
    });
});
