import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "../setup/test-helpers.js";

describe("Text Objects", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should delete inside parentheses with di(", () => {
        input.value = "foo(bar)baz";
        input.focus();
        input.selectionStart = 5; // inside parens
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "d", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "i", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "(", bubbles: true }),
        );
        expect(input.value).toBe("foo()baz");
    });

    it('should delete around quotes with da"', () => {
        input.value = 'foo"bar"baz';
        input.focus();
        input.selectionStart = 5; // inside quotes
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "d", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: "a", bubbles: true }),
        );
        input.dispatchEvent(
            new KeyboardEvent("keydown", { key: '"', bubbles: true }),
        );
        expect(input.value).toBe("foobaz");
    });
});
