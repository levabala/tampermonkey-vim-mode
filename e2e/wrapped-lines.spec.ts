import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Wrapped Lines Cursor Position", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should not allow cursor to go past last character on wrapped line", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Create a long line that will wrap
        const longLine = "a".repeat(200);
        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
        }, longLine);
        await page.keyboard.press("Escape");

        // Go to start of line
        await page.keyboard.press("0");

        // Move to end of line with $
        await page.keyboard.press("$");

        // Get cursor position - should be at last character
        const pos = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        const text = await textarea.inputValue();

        // Cursor should be at the last character (length - 1), not past it
        expect(pos).toBe(text.length - 1);

        // Try moving right - should stay at last character
        await page.keyboard.press("l");
        const posAfterL = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        expect(posAfterL).toBe(text.length - 1);
    });

    test("should correctly navigate wrapped lines with j/k", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Create text with a very long line that wraps multiple times
        const longLine = "a".repeat(300);
        const testText = `short\n${longLine}\nshort2`;
        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
            (el as HTMLTextAreaElement).selectionStart = 0;
            (el as HTMLTextAreaElement).selectionEnd = 0;
        }, testText);
        await page.keyboard.press("Escape");

        // Start at beginning
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        // Get initial position
        const initialPos = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        expect(initialPos).toBe(0);

        // Move down with j - should go to next logical line, not visual line
        await page.keyboard.press("j");
        const posAfterJ = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );

        // Should be on the long line (after "short\n")
        expect(posAfterJ).toBe(6); // Position of first 'a' in long line
    });

    test("should keep cursor on screen-wrapped line when moving horizontally", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Create a line that wraps at a specific width
        const longLine = "word ".repeat(50); // 250 characters
        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
        }, longLine.trimEnd());
        await page.keyboard.press("Escape");

        // Go to position that should be on second visual row (wrapped line)
        await page.keyboard.press("0");

        // Move right to middle of text
        for (let i = 0; i < 100; i++) {
            await page.keyboard.press("l");
        }

        const midPos = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );

        // Verify we're in the middle somewhere
        expect(midPos).toBeGreaterThan(50);
        expect(midPos).toBeLessThan(200);

        // Now try moving to end
        await page.keyboard.press("$");

        const endPos = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        const text = await textarea.inputValue();

        // Should be at last character
        expect(endPos).toBe(text.length - 1);

        // Try moving right from end - should stay there
        await page.keyboard.press("l");
        const posAfterL = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        expect(posAfterL).toBe(text.length - 1);
    });

    test("should handle custom caret positioning on wrapped lines", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Very long line that definitely wraps
        const longLine = "x".repeat(500);
        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
        }, longLine);
        await page.keyboard.press("Escape");

        // Start at beginning
        await page.keyboard.press("0");

        // Move to a position in the middle
        const targetPos = 250;
        await textarea.evaluate((el, pos) => {
            (el as HTMLTextAreaElement).selectionStart = pos;
            (el as HTMLTextAreaElement).selectionEnd = pos;
        }, targetPos);

        // Wait for caret to update
        await page.waitForTimeout(100);

        // The custom caret should exist and be visible
        const caretCount = await page
            .locator(
                'div[style*="mix-blend-mode: difference"][style*="position: absolute"]',
            )
            .count();
        expect(caretCount).toBeGreaterThan(0);
    });

    test("should not go past end of wrapped line when typing and deleting", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Create a line and go to end
        await textarea.click();
        await textarea.evaluate((el) => {
            (el as HTMLTextAreaElement).value = "hello world";
        });
        await page.keyboard.press("Escape");
        await page.keyboard.press("$");

        // Enter insert mode at end
        await page.keyboard.press("a");

        // Type some characters
        await page.keyboard.type(" test");

        // Go back to normal mode
        await page.keyboard.press("Escape");

        const pos = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).selectionStart,
        );
        const text = await textarea.inputValue();

        // Should be at last character, not past it
        expect(pos).toBe(text.length - 1);
    });
});
