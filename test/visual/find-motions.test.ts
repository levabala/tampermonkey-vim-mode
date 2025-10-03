import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "../setup/test-helpers.js";

describe("Visual Mode: Find Character Motions", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    describe("f (find character forward)", () => {
        it("should extend selection forward to character with f", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode with v
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'o' with fo
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Cursor should be at position 4 ('o' in "hello")
            expect(input.selectionStart).toBe(4);
        });

        it("should find second occurrence with count 2f", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find second 'o' with 2fo
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "2", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Cursor should be at position 7 (second 'o' in "world")
            expect(input.selectionStart).toBe(7);
        });

        it("should work in multiline textarea", () => {
            textarea.value = "hello\nworld foo";
            textarea.focus();
            textarea.selectionStart = 0;

            // Enter normal mode
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'o' on same line
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Should find 'o' in "hello", not cross line boundary
            expect(textarea.selectionStart).toBe(4);
        });
    });

    describe("F (find character backward)", () => {
        it("should extend selection backward to character with F", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 10; // 'd' in "world"

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'o' backward with Fo
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "F", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Cursor should be at position 7 ('o' in "world")
            expect(input.selectionStart).toBe(7);
        });
    });

    describe("t (till character forward)", () => {
        it("should extend selection forward till character with t", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Till 'o' with to (stops before 'o')
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "t", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Cursor should be at position 3 (before 'o' in "hello")
            expect(input.selectionStart).toBe(3);
        });
    });

    describe("T (till character backward)", () => {
        it("should extend selection backward till character with T", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 10; // 'd' in "world"

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Till 'o' backward with To (stops after 'o')
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "T", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Cursor should be at position 8 (after 'o' in "world")
            expect(input.selectionStart).toBe(8);
        });
    });

    describe("; (repeat find)", () => {
        it("should repeat last find with ;", () => {
            input.value = "hello world foo";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find first 'o' with fo
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            expect(input.selectionStart).toBe(4);

            // Repeat to find next 'o'
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: ";", bubbles: true }),
            );

            expect(input.selectionStart).toBe(7);

            // Repeat again to find third 'o'
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: ";", bubbles: true }),
            );

            expect(input.selectionStart).toBe(13);
        });

        it("should work with count 2;", () => {
            input.value = "hello world foo bar";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find first 'o'
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            expect(input.selectionStart).toBe(4);

            // Repeat 2 times with 2;
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "2", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: ";", bubbles: true }),
            );

            // Should skip to third 'o'
            expect(input.selectionStart).toBe(13);
        });
    });

    describe(", (reverse find)", () => {
        it("should reverse last find with ,", () => {
            input.value = "hello world foo";
            input.focus();
            input.selectionStart = 10; // Start at 'd' in "world"

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'o' forward with fo
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "o", bubbles: true }),
            );

            // Should find 'o' in "foo"
            expect(input.selectionStart).toBe(13);

            // Reverse with , to find previous 'o'
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: ",", bubbles: true }),
            );

            // Should find 'o' in "world" (going backward from 13)
            expect(input.selectionStart).toBe(7);
        });
    });

    describe("Visual mode with operators after find", () => {
        it("should delete selected text after f motion with d", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'w' with fw
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "w", bubbles: true }),
            );

            // Delete with d
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "d", bubbles: true }),
            );

            // Text from 0 to 6 (inclusive) should be deleted: "hello w"
            expect(input.value).toBe("orld");
        });

        it("should yank selected text after f motion with y", () => {
            input.value = "hello world";
            input.focus();
            input.selectionStart = 0;

            // Enter normal mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );

            // Enter visual mode
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );

            // Find 'w' with fw
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "f", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "w", bubbles: true }),
            );

            // Yank with y
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "y", bubbles: true }),
            );

            // Text should be unchanged
            expect(input.value).toBe("hello world");

            // Now paste to verify yanked content
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "p", bubbles: true }),
            );

            // Yanked text "hello w" should be pasted
            expect(input.value).toBe("hello whello world");
        });
    });
});
