import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Rapid Paste Performance", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should handle rapid paste operations without lag", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await textarea.press("Escape");

        // Yank a short line (10 chars)
        await textarea.press("y");
        await textarea.press("y");

        // Wait for yank to complete
        await page.waitForTimeout(100);

        // Measure time for 20 rapid paste operations
        const startTime = Date.now();

        // Simulate holding 'p' by rapidly pressing it
        for (let i = 0; i < 20; i++) {
            await textarea.press("p", { delay: 0 });
        }

        // Wait for async chunk rendering to settle
        await page.waitForTimeout(150);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // With chunked rendering, this should complete quickly
        // Only affected chunks are updated incrementally
        expect(totalTime).toBeLessThan(2000); // Should complete reasonably fast with chunked rendering

        // Verify line numbers are still visible and correct
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Verify the pastes actually happened (20 new lines added)
        const value = await textarea.inputValue();
        const lines = value.split("\n");
        expect(lines.length).toBeGreaterThan(1500 + 19); // Original + 20 paste operations (each adds a line)
    });

    test("should update line numbers after async rendering completes", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await textarea.press("Escape");

        // Go to top
        await textarea.press("g");
        await textarea.press("g");

        // Yank first line
        await textarea.press("y");
        await textarea.press("y");

        // Rapid paste 5 times
        for (let i = 0; i < 5; i++) {
            await textarea.press("p", { delay: 0 });
        }

        // Wait for async chunk rendering to complete
        await page.waitForTimeout(150);

        // Line numbers should be visible and show updated count
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Verify line numbers content exists and is non-empty
        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toBeTruthy();
        expect(lineNumbersText!.trim().length).toBeGreaterThan(0);
    });

    test("should update quickly for single paste", async ({ page }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await textarea.press("Escape");

        // Yank a line
        await textarea.press("y");
        await textarea.press("y");

        // Single paste
        await textarea.press("p");

        // Wait for async rendering to start
        await page.waitForTimeout(100);

        // Line numbers should update quickly with chunked rendering
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toBeTruthy();
    });
});
