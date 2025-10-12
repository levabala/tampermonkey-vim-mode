import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Count Commands with Zero Digit", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("0 should still work as motion (go to start of line) when no count", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Go to start of file first
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        // Move to a position mid-line
        await page.keyboard.press("$"); // End of line
        await page.keyboard.press("h"); // Back one char
        await page.keyboard.press("h");
        await page.keyboard.press("h");

        const posBeforeZero = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.selectionStart,
        );

        // Now press 0 to go to start of line
        await page.keyboard.press("0");

        const posAfterZero = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.selectionStart,
        );

        // Should be at start of line (position 0 for first line)
        expect(posAfterZero).toBe(0);
        expect(posAfterZero).toBeLessThan(posBeforeZero);
    });

    test("10j should move down 10 lines", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Go to start
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        // Move down 10 lines
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("j");

        // Verify we're on line 11
        const result = await textarea.evaluate((el: HTMLTextAreaElement) => {
            const text = el.value;
            const lines = text.split("\n");
            const pos = el.selectionStart;

            let charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (pos >= charCount && pos <= charCount + lines[i].length) {
                    return { lineNumber: i + 1, lineContent: lines[i] };
                }
                charCount += lines[i].length + 1;
            }
            return { lineNumber: -1, lineContent: "" };
        });

        expect(result.lineNumber).toBe(11);
    });

    test("20k should move up 20 lines", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Go to line 30
        await page.keyboard.press("g");
        await page.keyboard.press("g");
        await page.keyboard.press("2");
        await page.keyboard.press("9");
        await page.keyboard.press("j"); // Now on line 30

        // Move up 20 lines
        await page.keyboard.press("2");
        await page.keyboard.press("0");
        await page.keyboard.press("k");

        // Should be on line 10
        const result = await textarea.evaluate((el: HTMLTextAreaElement) => {
            const text = el.value;
            const lines = text.split("\n");
            const pos = el.selectionStart;

            let charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (pos >= charCount && pos <= charCount + lines[i].length) {
                    return i + 1;
                }
                charCount += lines[i].length + 1;
            }
            return -1;
        });

        expect(result).toBe(10);
    });

    test("30w should move forward 30 words", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        await page.keyboard.press("g");
        await page.keyboard.press("g");

        const startPos = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.selectionStart,
        );

        // Move 30 words forward
        await page.keyboard.press("3");
        await page.keyboard.press("0");
        await page.keyboard.press("w");

        const endPos = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.selectionStart,
        );

        // Should have moved significantly forward
        expect(endPos).toBeGreaterThan(startPos + 50);
    });

    test("10x should delete 10 characters", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        await page.keyboard.press("g");
        await page.keyboard.press("g");

        const originalLength = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.value.length,
        );

        // Delete 10 characters
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("x");

        const newLength = await textarea.evaluate(
            (el: HTMLTextAreaElement) => el.value.length,
        );

        // Total text should be exactly 10 characters shorter
        expect(newLength).toBe(originalLength - 10);
    });

    test("100G should go to line 100", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Navigate to line 100
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("0");
        await page.keyboard.press("G");

        const result = await textarea.evaluate((el: HTMLTextAreaElement) => {
            const text = el.value;
            const lines = text.split("\n");
            const pos = el.selectionStart;

            let charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (pos >= charCount && pos <= charCount + lines[i].length) {
                    return i + 1;
                }
                charCount += lines[i].length + 1;
            }
            return -1;
        });

        expect(result).toBe(100);
    });

    test("10j in visual mode should extend selection 10 lines", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        const originalText = await textarea.inputValue();
        const originalLines = originalText.split("\n");

        // Go to line 1
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        // Enter visual mode
        await page.keyboard.press("v");

        // Select down 10 lines
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("j");

        // Delete selection
        await page.keyboard.press("d");

        const newText = await textarea.inputValue();
        const newLines = newText.split("\n");

        // Should have deleted ~10 lines (accounting for partial selection)
        expect(newLines.length).toBeLessThan(originalLines.length - 8);
        expect(newLines.length).toBeGreaterThan(originalLines.length - 12);
    });

    test("count with 0 in middle (e.g., 105) should work", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Navigate to line 105
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("5");
        await page.keyboard.press("G");

        const result = await textarea.evaluate((el: HTMLTextAreaElement) => {
            const text = el.value;
            const lines = text.split("\n");
            const pos = el.selectionStart;

            let charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                if (pos >= charCount && pos <= charCount + lines[i].length) {
                    return i + 1;
                }
                charCount += lines[i].length + 1;
            }
            return -1;
        });

        expect(result).toBe(105);
    });
});
