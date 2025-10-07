import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Line Numbers with Text Wrap", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should show line numbers when text wraps, even with fewer than 5 lines", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create a very long line that will definitely wrap, plus a few short lines (total < 5 logical lines)
        const longLine = "word ".repeat(100); // Creates a line that will wrap multiple times
        const testText = `${longLine.trim()}\nshort line 2\nshort line 3`;

        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
            (el as HTMLTextAreaElement).selectionStart = 0;
            (el as HTMLTextAreaElement).selectionEnd = 0;
        }, testText);
        await page.keyboard.press("Escape");

        // Wait for line numbers to render
        await page.waitForTimeout(200);

        // Check that line numbers container exists and is visible
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Verify it has content (line numbers)
        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toBeTruthy();
        expect(lineNumbersText!.trim().length).toBeGreaterThan(0);
    });

    test("should hide line numbers when no wrapping and fewer than 5 lines", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create short text with no wrapping (3 lines)
        const testText = "line 1\nline 2\nline 3";

        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
            (el as HTMLTextAreaElement).selectionStart = 0;
            (el as HTMLTextAreaElement).selectionEnd = 0;
        }, testText);
        await page.keyboard.press("Escape");

        // Wait for potential line numbers rendering
        await page.waitForTimeout(200);

        // Check that line numbers container is not visible or doesn't exist
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        const isVisible = await lineNumbers
            .evaluate((el) => {
                const style = window.getComputedStyle(el);
                return style.display !== "none";
            })
            .catch(() => false);

        expect(isVisible).toBe(false);
    });

    test("should show line numbers when 6 or more lines even without wrapping", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create 6 short lines with no wrapping
        const testText = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6";

        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
            (el as HTMLTextAreaElement).selectionStart = 0;
            (el as HTMLTextAreaElement).selectionEnd = 0;
        }, testText);
        await page.keyboard.press("Escape");

        // Wait for line numbers to render
        await page.waitForTimeout(200);

        // Check that line numbers container exists and is visible
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();
    });

    test("should show line numbers with single wrapped line (edge case)", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create a single very long line that will wrap multiple times
        const longLine = "x".repeat(500);

        await textarea.click();
        await textarea.evaluate((el, text) => {
            (el as HTMLTextAreaElement).value = text;
            (el as HTMLTextAreaElement).selectionStart = 0;
            (el as HTMLTextAreaElement).selectionEnd = 0;
        }, longLine);
        await page.keyboard.press("Escape");

        // Wait for line numbers to render
        await page.waitForTimeout(200);

        // Check that line numbers container exists and is visible
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Verify it shows line number 1
        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toContain("1");
    });
});
