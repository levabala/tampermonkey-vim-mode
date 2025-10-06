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

        // Count how many bold spans there are
        let innerHTML = await lineNumbersContainer.innerHTML();
        let boldSpans = innerHTML.match(/font-weight:\s*bold/g);

        // Expect exactly one bold span
        expect(boldSpans?.length).toBe(1);

        // Verify it's line 3 that's bold
        const line3Match = innerHTML.match(
            /<span[^>]*font-weight:\s*bold[^>]*>\s*3\s*<\/span>/,
        );
        expect(line3Match).toBeTruthy();

        // Move down to line 7
        await page.keyboard.press("7");
        await page.keyboard.press("G");
        await page.waitForTimeout(100);

        // Check that there's still only one bold span
        innerHTML = await lineNumbersContainer.innerHTML();
        boldSpans = innerHTML.match(/font-weight:\s*bold/g);

        // Expect exactly one bold span
        expect(boldSpans?.length).toBe(1);

        // Verify it's line 7 that's bold
        const line7Match = innerHTML.match(
            /<span[^>]*font-weight:\s*bold[^>]*>\s*7\s*<\/span>/,
        );
        expect(line7Match).toBeTruthy();
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

        // Check line 1 is highlighted
        let innerHTML = await lineNumbersContainer.innerHTML();
        let boldSpans = innerHTML.match(/font-weight:\s*bold/g);
        expect(boldSpans?.length).toBe(1);

        // Move down 5 times with j
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("j");
            await page.waitForTimeout(50);
        }

        // Should be on line 6 (started at 1, moved down 5)
        innerHTML = await lineNumbersContainer.innerHTML();
        boldSpans = innerHTML.match(/font-weight:\s*bold/g);
        expect(boldSpans?.length).toBe(1);

        // Verify it's line 6 that's bold
        const line6Match = innerHTML.match(
            /<span[^>]*font-weight:\s*bold[^>]*>\s*6\s*<\/span>/,
        );
        expect(line6Match).toBeTruthy();
    });
});
