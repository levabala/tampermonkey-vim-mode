import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "../setup/test-helpers.js";

describe("Paste - Character-wise", () => {
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(null as unknown as HTMLInputElement, textarea);
    });

    it("should paste word after cursor with p", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0; // on "l" of line1
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank word "line1"
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        // Move to next line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        // Paste
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        // Should paste "line1" after current character, cursor on last char
        expect(textarea.value).toBe("line1\nlline1ine2\nline3");
        expect(textarea.selectionStart).toBe(11); // on '1' of pasted "line1"
    });

    it("should paste word before cursor with P", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank word "line1"
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "w", bubbles: true }),
        );
        // Move to next line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        // Paste before
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "P", bubbles: true }),
        );
        // Should paste "line1" before current character, cursor on last char
        expect(textarea.value).toBe("line1\nline1line2\nline3");
        expect(textarea.selectionStart).toBe(10); // on '1' of pasted "line1"
    });
});

describe("Paste - Line-wise", () => {
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(null as unknown as HTMLInputElement, textarea);
    });

    it("should paste line below on empty line with p", () => {
        textarea.value = "line1\n\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank line with yy
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        // Move to empty line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        // Paste
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        // Should create new line below and paste, cursor at start of pasted line
        expect(textarea.value).toBe("line1\n\nline1\nline3");
        expect(textarea.selectionStart).toBe(7); // start of pasted "line1"
    });

    it("should paste line below on non-empty line with p", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank line with yy
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        // Move to next line (even with cursor on text)
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        // Now on 'n' of line2
        // Paste - should ignore cursor position and create new line below
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        expect(textarea.value).toBe("line1\nline2\nline1\nline3");
        expect(textarea.selectionStart).toBe(12); // start of pasted "line1"
    });

    it("should paste line above with P", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 6; // on line2
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank line with yy
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        // Move to next line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        // Paste above
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "P", bubbles: true }),
        );
        // Should create new line above and paste, cursor at start of pasted line
        expect(textarea.value).toBe("line1\nline2\nline2\nline3");
        expect(textarea.selectionStart).toBe(12); // start of pasted "line2"
    });
});

describe("Paste - Visual Line Selection", () => {
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(null as unknown as HTMLInputElement, textarea);
    });

    it("should paste multiple lines with V selection", () => {
        textarea.value = "line1\nline2\nline3\nline4";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Visual line mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "V", bubbles: true }),
        );
        // Select 2 lines
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "j", bubbles: true }),
        );
        // Yank
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "y", bubbles: true }),
        );
        // Move to line 4
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "G", bubbles: true }),
        );
        // Paste
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        // Should paste below line4 and cursor at start of first pasted line
        expect(textarea.value).toBe("line1\nline2\nline3\nline4\nline1\nline2");
        expect(textarea.selectionStart).toBe(24); // start of first pasted line
    });

    it("should paste line below even when cursor is on text", () => {
        textarea.value = "line1\nline2\nline3";
        textarea.focus();
        textarea.selectionStart = 0;
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        // Yank line with dd (delete also yanks)
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "d", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "d", bubbles: true }),
        );
        // Now on line2 (which was line2)
        // Move to middle of line
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "l", bubbles: true }),
        );
        // Paste - should create new line below regardless of cursor position
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        expect(textarea.value).toBe("line2\nline1\nline3");
        expect(textarea.selectionStart).toBe(6); // start of pasted "line1"
    });
});
