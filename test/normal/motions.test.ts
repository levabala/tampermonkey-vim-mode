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

describe("WORD Motions", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should move forward by WORD with W (treating punctuation as part of WORD)", () => {
        input.value = "hello world.test foo";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "W", bubbles: true }),
        );
        // W should skip "hello" and move to "world.test" (WORD includes punctuation)
        expect(input.selectionStart).toBe(6);
    });

    it("should differentiate W from w with punctuation", () => {
        input.value = "foo bar.baz";
        input.focus();
        input.selectionStart = 4; // at 'b' in bar
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // w should stop at the dot (punctuation is treated as a separate word)
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        expect(input.selectionStart).toBe(8); // at 'b' in baz (dot skipped as non-word)

        // Reset and test W
        input.selectionStart = 4;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "W", bubbles: true }),
        );
        expect(input.selectionStart).toBe(11); // at end, since "bar.baz" is one WORD
    });

    it("should work with count 3W", () => {
        input.value = "one two three four five";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "3", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "W", bubbles: true }),
        );
        expect(input.selectionStart).toBe(14); // at 'four'
    });

    it("should move backward by WORD with B", () => {
        input.value = "hello world.test foo";
        input.focus();
        input.selectionStart = 17; // at 'f' in foo
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "B", bubbles: true }),
        );
        // B should move to start of "world.test"
        expect(input.selectionStart).toBe(6);
    });

    it("should move to end of WORD with E", () => {
        input.value = "hello world.test foo";
        input.focus();
        input.selectionStart = 0;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "E", bubbles: true }),
        );
        // E should move to end of "hello"
        expect(input.selectionStart).toBe(4);
    });

    it("should differentiate E from e with punctuation", () => {
        input.value = "foo bar.baz test";
        input.focus();
        input.selectionStart = 4; // at 'b' in bar
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // e should stop at end of "bar"
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "e", bubbles: true }),
        );
        expect(input.selectionStart).toBe(6); // at 'r' in bar

        // Reset and test E
        input.selectionStart = 4;
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "E", bubbles: true }),
        );
        expect(input.selectionStart).toBe(10); // at 'z' in baz, since "bar.baz" is one WORD
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
