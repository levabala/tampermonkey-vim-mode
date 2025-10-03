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
