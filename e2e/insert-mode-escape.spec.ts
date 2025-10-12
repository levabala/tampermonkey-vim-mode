import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Insert Mode - Escape Key", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should exit insert mode with Escape and remain focused", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await textarea.fill("hello");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        // Enter insert mode
        await textarea.press("a");
        await textarea.type(" world");

        // Press Escape to exit insert mode
        await textarea.press("Escape");

        // Verify we're in normal mode by executing a normal mode command
        await textarea.press("x");

        const value = await textarea.inputValue();
        expect(value).toBe("hello worl");

        // Verify the textarea is still focused
        const isFocused = await textarea.evaluate(
            (el: HTMLTextAreaElement) =>
                document.activeElement === el,
        );
        expect(isFocused).toBe(true);
    });

    test("should exit insert mode with Ctrl-[ and remain focused", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await textarea.fill("hello");
        await textarea.press("Escape");

        await textarea.evaluate((el: HTMLTextAreaElement) => {
            el.selectionStart = 5;
            el.selectionEnd = 5;
        });

        // Enter insert mode
        await textarea.press("a");
        await textarea.type(" world");

        // Press Ctrl-[ to exit insert mode
        await textarea.press("Control+[");

        // Verify we're in normal mode by executing a normal mode command
        await textarea.press("x");

        const value = await textarea.inputValue();
        expect(value).toBe("hello worl");

        // Verify the textarea is still focused
        const isFocused = await textarea.evaluate(
            (el: HTMLTextAreaElement) =>
                document.activeElement === el,
        );
        expect(isFocused).toBe(true);
    });
});
