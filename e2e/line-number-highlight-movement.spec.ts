import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Line Number Highlight Movement", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should move row highlight when caret moves between lines", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );
        await expect(lineNumbersContainer).toBeVisible();

        // Navigate to line 3
        await page.keyboard.press("3");
        await page.keyboard.press("G");
        await page.waitForTimeout(100);

        // Check that line 3 is highlighted
        let innerHTML = await lineNumbersContainer.innerHTML();
        const line3HighlightRegex = /<span[^>]*>3<\/span>/;
        const match3 = innerHTML.match(line3HighlightRegex);
        expect(match3).toBeTruthy();
        const line3Span = match3![0];
        expect(line3Span).toContain("font-weight: bold");

        // Move down to line 7
        await page.keyboard.press("7");
        await page.keyboard.press("G");
        await page.waitForTimeout(100);

        // Check that line 7 is now highlighted and line 3 is not
        innerHTML = await lineNumbersContainer.innerHTML();
        const line7HighlightRegex = /<span[^>]*>7<\/span>/;
        const match7 = innerHTML.match(line7HighlightRegex);
        expect(match7).toBeTruthy();
        const line7Span = match7![0];
        expect(line7Span).toContain("font-weight: bold");

        // Verify line 3 is no longer bold
        const match3After = innerHTML.match(line3HighlightRegex);
        expect(match3After).toBeTruthy();
        const line3SpanAfter = match3After![0];
        expect(line3SpanAfter).not.toContain("font-weight: bold");
    });

    test("should move row highlight when using j/k navigation", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Go to beginning
        await page.keyboard.press("g");
        await page.keyboard.press("g");
        await page.waitForTimeout(100);

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );

        // Move down 5 times with j
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("j");
            await page.waitForTimeout(50);
        }

        // Should be on line 6 (started at 1, moved down 5)
        const innerHTML = await lineNumbersContainer.innerHTML();
        const line6HighlightRegex = /<span[^>]*>6<\/span>/;
        const match = innerHTML.match(line6HighlightRegex);
        expect(match).toBeTruthy();
        expect(match![0]).toContain("font-weight: bold");
    });
});
