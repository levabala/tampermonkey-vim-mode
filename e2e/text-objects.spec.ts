import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Text Objects with Pairs", () => {
    test.beforeEach(async ({ page }) => {
        // Load the HTML file directly
        const htmlPath = path.join(process.cwd(), "test-visual-mode.html");
        await page.goto(`file://${htmlPath}`);
        // Wait for the script to load
        await page.waitForTimeout(500);
    });

    test("should delete inside parentheses with di(", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        // Set initial content
        await textarea.fill("foo(bar)baz");
        await textarea.press("Escape");

        // Move cursor inside parentheses (position 5, on 'a' in "bar")
        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        // Type di( - this will send Shift key events in real browser
        await textarea.press("d");
        await textarea.press("i");
        await textarea.press("("); // This requires Shift+9, will send Shift event

        const value = await textarea.inputValue();
        expect(value).toBe("foo()baz");
    });

    test("should delete around parentheses with da)", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("foo(bar)baz");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        await textarea.press("d");
        await textarea.press("a");
        await textarea.press(")"); // This requires Shift+0, will send Shift event

        const value = await textarea.inputValue();
        expect(value).toBe("foobaz");
    });

    test("should change inside braces with ci{", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("foo{bar}baz");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        await textarea.press("c");
        await textarea.press("i");
        await textarea.press("{"); // This requires Shift+[, will send Shift event

        // Should now be in insert mode with content deleted
        const value = await textarea.inputValue();
        expect(value).toBe("foo{}baz");

        // Verify we're in insert mode by typing
        await textarea.type("new");
        const finalValue = await textarea.inputValue();
        expect(finalValue).toBe("foo{new}baz");
    });

    test("should delete inside angle brackets with di<", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("foo<bar>baz");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        await textarea.press("d");
        await textarea.press("i");
        await textarea.press("<"); // This requires Shift+,, will send Shift event

        const value = await textarea.inputValue();
        expect(value).toBe("foo<>baz");
    });

    test("should delete inside brackets with di]", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("foo[bar]baz");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        await textarea.press("d");
        await textarea.press("i");
        await textarea.press("]"); // Does not require Shift

        const value = await textarea.inputValue();
        expect(value).toBe("foo[]baz");
    });

    test("should yank inside quotes with yi\" and paste", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill('foo"bar"baz');
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        // Yank inside quotes
        await textarea.press("y");
        await textarea.press("i");
        await textarea.press('"'); // This requires Shift+', will send Shift event

        // Move to end and paste
        await textarea.press("$");
        await textarea.press("p");

        const value = await textarea.inputValue();
        expect(value).toBe('foo"bar"bazbar');
    });

    test("should visual select inside parentheses with vi( and delete", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("foo(bar)baz");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        // Visual select inside parentheses
        await textarea.press("v");
        await textarea.press("i");
        await textarea.press("("); // This requires Shift+9, will send Shift event

        // Delete the selection
        await textarea.press("d");

        const value = await textarea.inputValue();
        expect(value).toBe("foo()baz");
    });

    test("should handle multiword content in parentheses", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("test(hello world there)end");
        await textarea.press("Escape");

        // Move cursor somewhere inside the parentheses
        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 12; // inside "hello world there"
            el.selectionEnd = 12;
        });

        await textarea.press("d");
        await textarea.press("a");
        await textarea.press("(");

        const value = await textarea.inputValue();
        expect(value).toBe("testend");
    });

    test("should handle nested parentheses", async ({ page }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("outer(inner(deep))end");
        await textarea.press("Escape");

        // Move cursor inside the innermost parentheses
        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 14; // inside "deep"
            el.selectionEnd = 14;
        });

        await textarea.press("d");
        await textarea.press("i");
        await textarea.press("(");

        const value = await textarea.inputValue();
        expect(value).toBe("outer(inner())end");
    });

    test("should handle multiline content in parentheses", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");
        await textarea.click();

        await textarea.fill("before(line1\nline2\nline3)after");
        await textarea.press("Escape");

        // Move cursor inside the multiline content
        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 14; // somewhere in the middle
            el.selectionEnd = 14;
        });

        await textarea.press("d");
        await textarea.press("i");
        await textarea.press("(");

        const value = await textarea.inputValue();
        expect(value).toBe("before()after");
    });
});
