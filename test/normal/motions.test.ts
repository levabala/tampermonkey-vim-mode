import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "../setup/test-helpers.js";

describe("Basic Motions", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should move cursor right with l", () => {
        input.value = "hello";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Cursor stays at 0 after escape (no movement on empty line start)
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        expect(input.selectionStart).toBe(1);
    });

    it("should move cursor left with h", () => {
        input.value = "hello";
        input.focus();
        input.selectionStart = 2;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Cursor stays at 2 (not at end of line)
        expect(input.selectionStart).toBe(2);
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "h", bubbles: true }),
        );
        expect(input.selectionStart).toBe(1);
    });

    it("should move to start of line with 0", () => {
        input.value = "hello world";
        input.focus();
        input.selectionStart = 5;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "0", bubbles: true }),
        );
        expect(input.selectionStart).toBe(0);
    });

    it("should move to end of line with $", () => {
        input.value = "hello";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "$", bubbles: true }),
        );
        expect(input.selectionStart).toBe(5);
    });

    it("should move forward by word with w", () => {
        input.value = "hello world test";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Cursor stays at 0
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(input.selectionStart).toBe(6);
    });

    it("should move backward by word with b", () => {
        input.value = "hello world test";
        input.focus();
        input.selectionStart = 12;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Cursor stays at 12 (not at end)
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "b", bubbles: true }),
        );
        expect(input.selectionStart).toBe(6);
    });
});

describe("Multiline Operations", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should move down with j", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(6);
    });

    it("should move up with k", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 6; // line2
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(0);
    });

    it("should go to first line with gg", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 12; // line3
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "g", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "g", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(0);
    });

    it("should go to last line with G", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "G", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(17);
    });
});

describe("Character Finding", () => {
    let input: HTMLInputElement, textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should find character with f", () => {
        input.value = "hello world";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "f", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(input.selectionStart).toBe(6);
    });

    it("should find till character with t", () => {
        input.value = "hello world";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "t", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(input.selectionStart).toBe(5);
    });

    it("should repeat find with ;", () => {
        input.value = "hello world wow";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "f", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "o", bubbles: true }),
        );
        expect(input.selectionStart).toBe(4);
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: ";", bubbles: true }),
        );
        expect(input.selectionStart).toBe(7);
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: ";", bubbles: true }),
        );
        expect(input.selectionStart).toBe(13);
    });
});

describe("w motion on empty lines", () => {
    let textarea: HTMLTextAreaElement;
    let input: HTMLInputElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should jump to next non-empty line with w from empty line", () => {
        textarea.value = "first\n\nsecond";
        textarea.focus();
        textarea.selectionStart = 6; // On the empty line (right after first\n)
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(7); // Should be at 's' in 'second'
    });

    it("should skip multiple consecutive empty lines with w", () => {
        textarea.value = "first\n\n\n\nsecond";
        textarea.focus();
        textarea.selectionStart = 6; // On first empty line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(10); // Should be at 's' in 'second'
    });

    it("should handle w from whitespace-only line", () => {
        textarea.value = "first\n   \nsecond";
        textarea.focus();
        textarea.selectionStart = 6; // On the whitespace-only line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(10); // Should be at 's' in 'second'
    });

    it("should handle count with w across empty lines", () => {
        textarea.value = "first\n\nsecond\n\nthird";
        textarea.focus();
        textarea.selectionStart = 6; // On first empty line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "2", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(textarea.selectionStart).toBe(14); // Should be at 't' in 'third'
    });
});
