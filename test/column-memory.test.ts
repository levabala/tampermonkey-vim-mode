import { beforeEach, describe, expect, it } from "vitest";
import { executeMotion, resetColumnMemory } from "../src/normal.js";
import type { EditableElement } from "../src/types.js";

function createMockTextarea(value: string, pos: number): EditableElement {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos;
    document.body.appendChild(textarea);
    return textarea as EditableElement;
}

describe("Column memory through empty lines", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        resetColumnMemory();
    });

    it("should remember column position when moving through empty line with k", () => {
        // Text with empty line in the middle:
        // line 1: "hello world"  (positions 0-11)
        // line 2: ""             (position 12)
        // line 3: "foo bar baz"  (positions 13-24)
        const text = "hello world\n\nfoo bar baz";
        const textarea = createMockTextarea(text, 23); // Position at 'a' in "baz" (column 10 of line 3)

        // Move up once - should go to empty line at column 0 (line too short)
        executeMotion(textarea, "k", 1);
        expect(textarea.selectionStart).toBe(12); // Start of line 2 (empty)

        // Move up again - should return to column 10 on line 1
        executeMotion(textarea, "k", 1);
        expect(textarea.selectionStart).toBe(10); // Should be at column 10, not column 0
    });

    it("should remember column position when moving through empty line with j", () => {
        // Text with empty line in the middle:
        // line 1: "hello world"
        // line 2: ""
        // line 3: "foo bar baz"
        const text = "hello world\n\nfoo bar baz";
        const textarea = createMockTextarea(text, 10); // Position at 'l' in "world" (column 10)

        // Move down once - should go to empty line at column 0 (line too short)
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(12); // Start of line 2 (empty)

        // Move down again - should return to column 10 on line 3
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(23); // Should be at column 10 of line 3 (13 + 10 = 23)
    });

    it("should remember column position when moving through multiple empty lines", () => {
        // Text with multiple empty lines
        const text = "hello world\n\n\n\nfoo bar baz";
        const textarea = createMockTextarea(text, 8); // Position at 'w' in "world" (column 8)

        // Move down through empty lines
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(12); // Empty line 1

        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(13); // Empty line 2

        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(14); // Empty line 3

        // Move down to final line - should return to column 8
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(23); // Should be at column 8 of last line (15 + 8 = 23)
    });

    it("should remember highest column when moving through lines of varying length", () => {
        // Text with varying line lengths
        // line 0: "hello world" (pos 0-11)
        // line 1: "short"       (pos 12-17)
        // line 2: "hello again" (pos 18-29)
        const text = "hello world\nshort\nhello again";
        const textarea = createMockTextarea(text, 10); // Column 10

        // Move down to shorter line
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(17); // End of "short" (line too short, clamped to end)

        // Move down again - should try to return to column 10
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(28); // Should be at column 10 of "hello again" (18 + 10 = 28)
    });

    it("should reset column memory when horizontal movement occurs", () => {
        // line 0: "hello world" (pos 0-11)
        // line 1: ""            (pos 12)
        // line 2: ""            (pos 13)
        // line 3: "foo bar baz" (pos 14-25)
        const text = "hello world\n\n\nfoo bar baz";
        const textarea = createMockTextarea(text, 10); // Column 10

        // Move down to empty line
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(12); // At empty line 1

        // Move horizontally (this should reset column memory)
        executeMotion(textarea, "h", 1);
        expect(textarea.selectionStart).toBe(11); // Moved left to 'd' of "world"

        // Now move down twice - should use current column (11), not original column (10)
        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(12); // Back to empty line (column 11 clamped to 0)

        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(13); // Next empty line

        executeMotion(textarea, "j", 1);
        expect(textarea.selectionStart).toBe(25); // Column 11 of "foo bar baz" (14 + 11 = 25)
    });
});
