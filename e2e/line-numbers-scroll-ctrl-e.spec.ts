import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Ctrl-E Scrolling", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should render all visible line numbers when scrolling with Ctrl-E", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        // Focus the textarea and enter normal mode
        await textarea.click();
        await textarea.press("Escape");

        // Wait for initial rendering
        await page.waitForTimeout(1000);

        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Start from the beginning - line numbers should show lines 1-30ish
        let lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toContain("1");

        // Scroll down multiple times with Ctrl-E (each Ctrl-E scrolls down one line)
        // After 30+ Ctrl-E presses, we should see line numbers beyond 30
        for (let i = 0; i < 40; i++) {
            await textarea.press("Control+e");
            await page.waitForTimeout(50); // Small delay for rendering
        }

        // Give extra time for chunks to render after scrolling
        await page.waitForTimeout(500);

        // After scrolling 40 lines down, we should see line numbers in the 40s-60s range
        // depending on the textarea height
        lineNumbersText = await lineNumbers.textContent();

        // Check that we have line numbers beyond 30
        // We should see at least line 40 or higher
        const hasHighLineNumbers =
            lineNumbersText!.includes("40") ||
            lineNumbersText!.includes("50") ||
            lineNumbersText!.includes("60") ||
            lineNumbersText!.includes("70");

        expect(
            hasHighLineNumbers,
            `Should show line numbers beyond 30 after scrolling. Current line numbers: ${lineNumbersText}`,
        ).toBe(true);

        // Continue scrolling to line 100+ area
        for (let i = 0; i < 60; i++) {
            await textarea.press("Control+e");
            await page.waitForTimeout(30);
        }

        await page.waitForTimeout(500);

        lineNumbersText = await lineNumbers.textContent();

        // Should now see line numbers in the 100s range
        const has100sLineNumbers =
            lineNumbersText!.includes("100") ||
            lineNumbersText!.includes("110") ||
            lineNumbersText!.includes("120") ||
            lineNumbersText!.includes("130");

        expect(
            has100sLineNumbers,
            `Should show line numbers in 100s range after more scrolling. Current line numbers: ${lineNumbersText}`,
        ).toBe(true);
    });

    test("should maintain line numbers visibility when scrolling back up with Ctrl-Y", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        await textarea.click();
        await textarea.press("Escape");
        await page.waitForTimeout(1000);

        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');

        // Scroll down to line 100 area
        await textarea.press("1");
        await textarea.press("0");
        await textarea.press("0");
        await textarea.press("G");
        await page.waitForTimeout(500);

        let lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toContain("100");

        // Now scroll up with Ctrl-Y
        for (let i = 0; i < 30; i++) {
            await textarea.press("Control+y");
            await page.waitForTimeout(50);
        }

        await page.waitForTimeout(500);

        // Should see line numbers in the 70s-80s range
        lineNumbersText = await lineNumbers.textContent();
        const hasCorrectRange =
            lineNumbersText!.includes("70") ||
            lineNumbersText!.includes("80") ||
            lineNumbersText!.includes("90");

        expect(
            hasCorrectRange,
            `Should show line numbers in 70s-90s range after scrolling up. Current: ${lineNumbersText}`,
        ).toBe(true);
    });
});
