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

    describe("Parentheses ()", () => {
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

        it("should delete inside parentheses with di)", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: ")", bubbles: true }),
            );
            expect(input.value).toBe("foo()baz");
        });

        it("should delete around parentheses with da(", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });

        it("should change inside parentheses with ci(", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "c", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "i", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(input.value).toBe("foo()baz");
            expect(input.selectionStart).toBe(4);
        });

        it("should yank inside parentheses with yi(", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "y", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "i", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(input.value).toBe("foo(bar)baz");
            // Verify yank by pasting
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "p", bubbles: true }),
            );
            expect(input.value).toBe("foo(bbar)baz");
        });
    });

    describe("Brackets []", () => {
        it("should delete inside brackets with di[", () => {
            input.value = "foo[bar]baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "[", bubbles: true }),
            );
            expect(input.value).toBe("foo[]baz");
        });

        it("should delete inside brackets with di]", () => {
            input.value = "foo[bar]baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "]", bubbles: true }),
            );
            expect(input.value).toBe("foo[]baz");
        });

        it("should delete around brackets with da]", () => {
            input.value = "foo[bar]baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "]", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });
    });

    describe("Braces {}", () => {
        it("should delete inside braces with di{", () => {
            input.value = "foo{bar}baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "{", bubbles: true }),
            );
            expect(input.value).toBe("foo{}baz");
        });

        it("should delete inside braces with di}", () => {
            input.value = "foo{bar}baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "}", bubbles: true }),
            );
            expect(input.value).toBe("foo{}baz");
        });

        it("should delete around braces with da{", () => {
            input.value = "foo{bar}baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "{", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });
    });

    describe("Angle brackets <>", () => {
        it("should delete inside angle brackets with di<", () => {
            input.value = "foo<bar>baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "<", bubbles: true }),
            );
            expect(input.value).toBe("foo<>baz");
        });

        it("should delete inside angle brackets with di>", () => {
            input.value = "foo<bar>baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: ">", bubbles: true }),
            );
            expect(input.value).toBe("foo<>baz");
        });

        it("should delete around angle brackets with da<", () => {
            input.value = "foo<bar>baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "<", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });
    });

    describe("Double quotes", () => {
        it('should delete inside quotes with di"', () => {
            input.value = 'foo"bar"baz';
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: '"', bubbles: true }),
            );
            expect(input.value).toBe('foo""baz');
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

    describe("Single quotes", () => {
        it("should delete inside single quotes with di'", () => {
            input.value = "foo'bar'baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "'", bubbles: true }),
            );
            expect(input.value).toBe("foo''baz");
        });

        it("should delete around single quotes with da'", () => {
            input.value = "foo'bar'baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "'", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });
    });

    describe("Backticks", () => {
        it("should delete inside backticks with di`", () => {
            input.value = "foo`bar`baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "`", bubbles: true }),
            );
            expect(input.value).toBe("foo``baz");
        });

        it("should delete around backticks with da`", () => {
            input.value = "foo`bar`baz";
            input.focus();
            input.selectionStart = 5;
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
                new KeyboardEvent("keydown", { key: "`", bubbles: true }),
            );
            expect(input.value).toBe("foobaz");
        });
    });

    describe("Nested pairs", () => {
        it("should handle nested parentheses", () => {
            input.value = "foo(bar(baz))qux";
            input.focus();
            input.selectionStart = 9; // inside inner parens at 'baz'
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
            expect(input.value).toBe("foo(bar())qux");
        });

        it("should handle nested brackets", () => {
            input.value = "foo[bar[baz]]qux";
            input.focus();
            input.selectionStart = 9;
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
                new KeyboardEvent("keydown", { key: "[", bubbles: true }),
            );
            expect(input.value).toBe("foo[bar]qux");
        });
    });

    describe("Multiline pairs", () => {
        it("should work across lines in textarea", () => {
            textarea.value = "foo(\nbar\n)baz";
            textarea.focus();
            textarea.selectionStart = 6; // inside parens on 'bar' line
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "d", bubbles: true }),
            );
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "i", bubbles: true }),
            );
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(textarea.value).toBe("foo()baz");
        });
    });

    describe("Visual mode with text objects", () => {
        it("should visual select inside parentheses with vi(", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "i", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(input.selectionStart).toBe(4);
            expect(input.selectionEnd).toBe(7);
        });

        it("should visual select around parentheses with va(", () => {
            input.value = "foo(bar)baz";
            input.focus();
            input.selectionStart = 5;
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "v", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "a", bubbles: true }),
            );
            input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "(", bubbles: true }),
            );
            expect(input.selectionStart).toBe(3);
            expect(input.selectionEnd).toBe(8);
        });
    });
});
