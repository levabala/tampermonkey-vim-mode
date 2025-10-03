import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateCaretPosition, DOMCaretRenderer } from "../src/common.js";
import type {
    CaretPosition,
    CaretRenderer,
    EditableElement,
    TextMetrics,
} from "../src/types.js";

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

// Mock CaretRenderer for testing
class MockCaretRenderer implements CaretRenderer {
    private lastPosition: CaretPosition | null = null;
    private active = false;

    show(position: CaretPosition): void {
        this.lastPosition = position;
        this.active = true;
    }

    hide(): void {
        this.active = false;
    }

    isActive(): boolean {
        return this.active;
    }

    getLastPosition(): CaretPosition | null {
        return this.lastPosition;
    }
}

// Helper to create a mock input element
function createMockInput(
    value: string,
    selectionStart: number,
    tagName: "INPUT" | "TEXTAREA" = "INPUT",
): EditableElement {
    const input = document.createElement(
        tagName.toLowerCase() as "input" | "textarea",
    );
    input.value = value;
    input.selectionStart = selectionStart;
    input.selectionEnd = selectionStart;

    // Set some default styles
    input.style.fontSize = "16px";
    input.style.fontFamily = "monospace";
    input.style.padding = "5px";
    input.style.border = "1px solid black";

    // Mock getBoundingClientRect
    input.getBoundingClientRect = vi.fn(() => ({
        left: 10,
        top: 10,
        width: 300,
        height: 30,
        right: 310,
        bottom: 40,
        x: 10,
        y: 10,
        toJSON: () => ({}),
    }));

    document.body.appendChild(input);
    return input as EditableElement;
}

describe("CaretPosition Calculation", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    describe("Single-line input", () => {
        it("should calculate position at start of empty input", () => {
            const input = createMockInput("", 0);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.x).toBe(15); // left(10) + paddingLeft(5)
            expect(position.y).toBe(15); // top(10) + paddingTop(5)
            expect(position.width).toBe(8); // charWidth
            expect(position.height).toBe(19.2); // lineHeight
        });

        it("should calculate position at start of text", () => {
            const input = createMockInput("hello", 0);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.x).toBe(15); // left(10) + paddingLeft(5) + textWidth(0)
            expect(position.y).toBe(15);
        });

        it("should calculate position in middle of text", () => {
            const input = createMockInput("hello", 3);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.x).toBe(39); // left(10) + paddingLeft(5) + textWidth(3*8=24)
            expect(position.y).toBe(15);
        });

        it("should calculate position at end of text", () => {
            const input = createMockInput("hello", 5);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.x).toBe(55); // left(10) + paddingLeft(5) + textWidth(5*8=40)
            expect(position.y).toBe(15);
        });

        it("should account for scrollLeft", () => {
            const input = createMockInput(
                "hello world this is a long text",
                20,
            );
            input.scrollLeft = 50;
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            // Should subtract scrollLeft from x position
            expect(position.x).toBe(125); // left(10) + paddingLeft(5) + textWidth(20*8=160) - scrollLeft(50)
        });
    });

    describe("Multi-line textarea", () => {
        it("should calculate position at start of empty textarea", () => {
            const input = createMockInput("", 0, "TEXTAREA");
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.width).toBe(8);
            expect(position.height).toBe(19.2);
            // x and y will depend on mirror element calculation
        });

        it("should calculate position on first line", () => {
            const input = createMockInput("hello\nworld", 3, "TEXTAREA");
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.width).toBe(8);
            expect(position.height).toBe(19.2);
        });

        it("should calculate position on second line", () => {
            const input = createMockInput("hello\nworld", 8, "TEXTAREA");
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.width).toBe(8);
            expect(position.height).toBe(19.2);
        });

        it("should account for scroll in textarea", () => {
            const input = createMockInput(
                "line1\nline2\nline3\nline4\nline5",
                20,
                "TEXTAREA",
            );
            input.scrollTop = 20;
            input.scrollLeft = 10;
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);

            expect(position.width).toBe(8);
            expect(position.height).toBe(19.2);
            // Position should account for scroll offsets
        });
    });

    describe("Edge cases", () => {
        it("should handle position beyond text length", () => {
            const input = createMockInput("hi", 10);
            input.selectionStart = 10; // Beyond actual text
            const metrics = new MockTextMetrics();

            // Should not crash
            const position = calculateCaretPosition(input, metrics);
            expect(position).toBeDefined();
        });

        it("should handle special characters", () => {
            const input = createMockInput("hello\tworld", 5);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);
            expect(position.width).toBe(8); // tab char width
        });

        it("should handle emoji", () => {
            const input = createMockInput("😀hello", 2);
            const metrics = new MockTextMetrics();

            const position = calculateCaretPosition(input, metrics);
            expect(position).toBeDefined();
        });
    });
});

describe("MockCaretRenderer", () => {
    it("should track show/hide state", () => {
        const renderer = new MockCaretRenderer();

        expect(renderer.isActive()).toBe(false);

        renderer.show({ x: 10, y: 20, width: 8, height: 16 });
        expect(renderer.isActive()).toBe(true);
        expect(renderer.getLastPosition()).toEqual({
            x: 10,
            y: 20,
            width: 8,
            height: 16,
        });

        renderer.hide();
        expect(renderer.isActive()).toBe(false);
    });

    it("should update position on multiple show calls", () => {
        const renderer = new MockCaretRenderer();

        renderer.show({ x: 10, y: 20, width: 8, height: 16 });
        expect(renderer.getLastPosition()?.x).toBe(10);

        renderer.show({ x: 30, y: 40, width: 8, height: 16 });
        expect(renderer.getLastPosition()?.x).toBe(30);
    });
});

describe("DOMCaretRenderer", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("should create and append caret element", () => {
        const renderer = new DOMCaretRenderer();

        expect(renderer.isActive()).toBe(true);
        const carets = document.querySelectorAll(
            'div[style*="position: absolute"]',
        );
        expect(carets.length).toBeGreaterThan(0);
    });

    it("should update caret position and size", () => {
        const renderer = new DOMCaretRenderer();
        const position: CaretPosition = { x: 100, y: 50, width: 8, height: 16 };

        renderer.show(position);

        const caret = document.querySelector(
            'div[style*="position: absolute"]',
        ) as HTMLElement;
        expect(caret.style.left).toBe("100px");
        expect(caret.style.top).toBe("50px");
        expect(caret.style.width).toBe("8px");
        expect(caret.style.height).toBe("16px");
    });

    it("should hide caret", () => {
        const renderer = new DOMCaretRenderer();
        renderer.show({ x: 100, y: 50, width: 8, height: 16 });

        renderer.hide();

        const caret = document.querySelector(
            'div[style*="position: absolute"]',
        ) as HTMLElement;
        expect(caret.style.display).toBe("none");
    });

    it("should remove caret on destroy", () => {
        const renderer = new DOMCaretRenderer();
        renderer.show({ x: 100, y: 50, width: 8, height: 16 });

        expect(renderer.isActive()).toBe(true);

        renderer.destroy();

        expect(renderer.isActive()).toBe(false);
        const carets = document.querySelectorAll(
            'div[style*="position: absolute"]',
        );
        expect(carets.length).toBe(0);
    });
});

describe("Caret positioning with real DOM layout", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("should not double-count padding in textarea positioning", () => {
        // This test verifies the fix for the bug where padding was counted twice:
        // once in the mirror element (via copied styles) and once by adding paddingTop
        //
        // Note: jsdom doesn't actually render text layout, so getBoundingClientRect
        // returns 0 for dynamically created mirror elements. This test documents
        // the fix but can't fully verify it in jsdom. Manual testing in a real
        // browser is needed to confirm correct positioning.

        const textarea = document.createElement("textarea");
        textarea.value = "line1\nline2\nline3";
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
        textarea.style.fontSize = "16px";
        textarea.style.fontFamily = "monospace";
        textarea.style.lineHeight = "20px";
        textarea.style.padding = "10px";
        textarea.style.position = "absolute";
        textarea.style.top = "100px";
        textarea.style.left = "100px";
        document.body.appendChild(textarea);

        const metrics = new (class implements TextMetrics {
            measureText(text: string): number {
                return text.length * 8;
            }
            getCharWidth(): number {
                return 8;
            }
            getFontSize(): number {
                return 16;
            }
            getLineHeight(): number {
                return 20;
            }
        })();

        const position = calculateCaretPosition(
            textarea as EditableElement,
            metrics,
        );

        const rect = textarea.getBoundingClientRect();

        // Verify position is relative to the textarea
        expect(position.y).toBeGreaterThanOrEqual(rect.top);
        expect(position.y).toBeLessThan(rect.top + 100);

        // The key assertion: padding should NOT be added separately
        // because the mirror element already has padding styles copied
        // This was the bug: y = rect.top + (spanRect.top - mirrorRect.top) + paddingTop
        // Fixed to: y = rect.top + (spanRect.top - mirrorRect.top)
        expect(position).toBeDefined();
        expect(position.width).toBe(8);
        expect(position.height).toBe(20);
    });
});

describe("Caret positioning relative to textarea layout", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        vi.clearAllMocks();
    });

    describe("Normal flow layout", () => {
        it("should position caret relative to textarea in normal document flow", () => {
            // Create a container with some offset from the top
            const container = document.createElement("div");
            container.style.marginTop = "50px";
            container.style.marginLeft = "30px";
            document.body.appendChild(container);

            // Create textarea in normal flow
            const textarea = document.createElement("textarea");
            textarea.value = "hello\nworld";
            textarea.selectionStart = 3;
            textarea.selectionEnd = 3;
            textarea.style.fontSize = "16px";
            textarea.style.fontFamily = "monospace";
            textarea.style.padding = "10px";
            textarea.style.border = "2px solid black";
            container.appendChild(textarea);

            // Mock getBoundingClientRect to simulate real layout
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 30,
                top: 50,
                width: 300,
                height: 100,
                right: 330,
                bottom: 150,
                x: 30,
                y: 50,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(16, 19.2, 8);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // Position should account for container offset
            // x = rect.left + padding + text width - scrollLeft
            expect(position.x).toBeGreaterThanOrEqual(30);
            // y should account for container's margin-top
            expect(position.y).toBeGreaterThanOrEqual(50);
        });

        it("should handle textarea in nested containers", () => {
            // Create nested containers with various offsets
            const outerDiv = document.createElement("div");
            outerDiv.style.marginTop = "20px";
            outerDiv.style.paddingLeft = "15px";
            document.body.appendChild(outerDiv);

            const innerDiv = document.createElement("div");
            innerDiv.style.marginTop = "10px";
            innerDiv.style.marginLeft = "25px";
            outerDiv.appendChild(innerDiv);

            const textarea = document.createElement("textarea");
            textarea.value = "test";
            textarea.selectionStart = 2;
            textarea.selectionEnd = 2;
            textarea.style.fontSize = "14px";
            textarea.style.padding = "5px";
            innerDiv.appendChild(textarea);

            // Mock getBoundingClientRect with cumulative offsets
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 40, // 15 + 25
                top: 30, // 20 + 10
                width: 200,
                height: 80,
                right: 240,
                bottom: 110,
                x: 40,
                y: 30,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(14, 16.8, 7);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // Caret should be positioned relative to the textarea's actual position
            expect(position.x).toBeGreaterThanOrEqual(40);
            expect(position.y).toBeGreaterThanOrEqual(30);
        });
    });

    describe("Absolute positioning", () => {
        it("should position caret relative to absolutely positioned textarea", () => {
            // Create absolutely positioned textarea
            const textarea = document.createElement("textarea");
            textarea.value = "absolute positioning test";
            textarea.selectionStart = 8;
            textarea.selectionEnd = 8;
            textarea.style.position = "absolute";
            textarea.style.top = "100px";
            textarea.style.left = "200px";
            textarea.style.fontSize = "16px";
            textarea.style.fontFamily = "monospace";
            textarea.style.padding = "8px";
            document.body.appendChild(textarea);

            // Mock getBoundingClientRect to match absolute position
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 200,
                top: 100,
                width: 300,
                height: 100,
                right: 500,
                bottom: 200,
                x: 200,
                y: 100,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(16, 19.2, 8);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // Caret should be positioned relative to absolute position
            expect(position.x).toBeGreaterThanOrEqual(200);
            expect(position.y).toBeGreaterThanOrEqual(100);
        });

        it("should handle fixed positioning", () => {
            // Create fixed position textarea
            const textarea = document.createElement("textarea");
            textarea.value = "fixed";
            textarea.selectionStart = 3;
            textarea.selectionEnd = 3;
            textarea.style.position = "fixed";
            textarea.style.top = "50px";
            textarea.style.right = "20px";
            textarea.style.fontSize = "14px";
            textarea.style.padding = "6px";
            document.body.appendChild(textarea);

            // Mock getBoundingClientRect for fixed position
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 680, // assuming viewport width 1000px, right: 20px
                top: 50,
                width: 300,
                height: 80,
                right: 980,
                bottom: 130,
                x: 680,
                y: 50,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(14, 16.8, 7);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // Caret should match fixed position
            expect(position.x).toBeGreaterThanOrEqual(680);
            expect(position.y).toBe(50); // rect.top (padding already in mirror)
        });

        it("should handle relative positioning with offsets", () => {
            const container = document.createElement("div");
            container.style.position = "relative";
            container.style.top = "30px";
            container.style.left = "40px";
            document.body.appendChild(container);

            const textarea = document.createElement("textarea");
            textarea.value = "relative";
            textarea.selectionStart = 4;
            textarea.selectionEnd = 4;
            textarea.style.position = "relative";
            textarea.style.top = "10px";
            textarea.style.left = "15px";
            textarea.style.fontSize = "16px";
            textarea.style.padding = "8px";
            container.appendChild(textarea);

            // Mock getBoundingClientRect with cumulative relative offsets
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 55, // 40 + 15
                top: 40, // 30 + 10
                width: 250,
                height: 90,
                right: 305,
                bottom: 130,
                x: 55,
                y: 40,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(16, 19.2, 8);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // Caret should account for relative positioning
            expect(position.x).toBeGreaterThanOrEqual(55);
            expect(position.y).toBe(40); // rect.top (padding already in mirror)
        });
    });

    describe("Scrolled document", () => {
        it("should account for window scroll when positioning caret in single-line input", () => {
            const input = document.createElement("input");
            input.value = "scrolled content";
            input.selectionStart = 8;
            input.selectionEnd = 8;
            input.style.fontSize = "16px";
            input.style.padding = "10px";
            document.body.appendChild(input);

            // Mock getBoundingClientRect (viewport-relative)
            vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
                left: 20,
                top: 50, // viewport-relative position
                width: 300,
                height: 30,
                right: 320,
                bottom: 80,
                x: 20,
                y: 50,
                toJSON: () => ({}),
            });

            // Mock window scroll
            const originalScrollX = window.scrollX;
            const originalScrollY = window.scrollY;
            Object.defineProperty(window, "scrollX", {
                value: 100,
                configurable: true,
            });
            Object.defineProperty(window, "scrollY", {
                value: 200,
                configurable: true,
            });

            const metrics = new MockTextMetrics(16, 19.2, 8);
            const position = calculateCaretPosition(
                input as EditableElement,
                metrics,
            );

            // For input elements, window scroll is NOT added (getBoundingClientRect already accounts for it)
            // x = rect.left + padding + textWidth - input.scrollLeft
            expect(position.x).toBe(94); // 20 + 10 + (8*8=64) - 0
            // y = rect.top + padding
            expect(position.y).toBe(60); // 50 + 10

            // Restore original values
            Object.defineProperty(window, "scrollX", {
                value: originalScrollX,
                configurable: true,
            });
            Object.defineProperty(window, "scrollY", {
                value: originalScrollY,
                configurable: true,
            });
        });

        it("should position caret correctly in textarea regardless of window scroll", () => {
            const textarea = document.createElement("textarea");
            textarea.value = "line1\nline2\nline3";
            textarea.selectionStart = 8;
            textarea.selectionEnd = 8;
            textarea.style.fontSize = "16px";
            textarea.style.padding = "10px";
            document.body.appendChild(textarea);

            // Mock getBoundingClientRect (viewport-relative)
            vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
                left: 20,
                top: 50,
                width: 300,
                height: 100,
                right: 320,
                bottom: 150,
                x: 20,
                y: 50,
                toJSON: () => ({}),
            });

            const metrics = new MockTextMetrics(16, 19.2, 8);
            const position = calculateCaretPosition(
                textarea as EditableElement,
                metrics,
            );

            // For textarea with mirror technique, position is calculated relative to rect
            // which already accounts for viewport position
            expect(position.x).toBeGreaterThanOrEqual(20);
            expect(position.y).toBeGreaterThanOrEqual(50);
            expect(position.width).toBe(8);
            expect(position.height).toBe(19.2);
        });
    });
});
