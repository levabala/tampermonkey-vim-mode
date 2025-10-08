import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Performance Textarea (1500 lines)", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should render line numbers beyond line 30 for large textarea", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        // Focus the textarea and enter normal mode
        await textarea.click();
        await textarea.press("Escape");

        // Wait for async line number rendering to complete
        // Since there are 1500 lines divided into 50 chunks of 30 lines each,
        // give it enough time to render multiple frames
        await page.waitForTimeout(1000);

        // Line numbers should be visible
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Navigate to line 100 (well beyond the first chunk)
        await textarea.press("1");
        await textarea.press("0");
        await textarea.press("0");
        await textarea.press("G");

        // Wait for rendering to complete
        await page.waitForTimeout(500);

        // Get line numbers text
        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toBeTruthy();

        // Should contain line number 100
        expect(lineNumbersText).toContain("100");

        // Navigate to line 500
        await textarea.press("5");
        await textarea.press("0");
        await textarea.press("0");
        await textarea.press("G");

        await page.waitForTimeout(500);

        // Should contain line number 500
        const lineNumbersText500 = await lineNumbers.textContent();
        expect(lineNumbersText500).toContain("500");

        // Navigate to line 1000
        await textarea.press("1");
        await textarea.press("0");
        await textarea.press("0");
        await textarea.press("0");
        await textarea.press("G");

        await page.waitForTimeout(500);

        // Should contain line number 1000
        const lineNumbersText1000 = await lineNumbers.textContent();
        expect(lineNumbersText1000).toContain("1000");

        // Navigate to last line (1500)
        await textarea.press("G");

        await page.waitForTimeout(500);

        // Should contain line number 1500
        const lineNumbersText1500 = await lineNumbers.textContent();
        expect(lineNumbersText1500).toContain("1500");
    });

    test("should show all line numbers when scrolling through performance textarea", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        // Focus the textarea and enter normal mode
        await textarea.click();
        await textarea.press("Escape");

        // Wait for initial rendering
        await page.waitForTimeout(1000);

        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');

        // Navigate through multiple chunks by jumping lines
        const lineNumbersToCheck = [50, 150, 300, 600, 900, 1200, 1450];

        for (const lineNum of lineNumbersToCheck) {
            // Navigate to line by typing each digit
            const digits = String(lineNum).split("");
            for (const digit of digits) {
                await textarea.press(digit);
            }
            await textarea.press("G");

            // Wait for rendering
            await page.waitForTimeout(300);

            // Check line number is visible
            const lineNumbersText = await lineNumbers.textContent();
            expect(
                lineNumbersText,
                `Line ${lineNum} should be visible in line numbers`,
            ).toContain(String(lineNum));
        }
    });
});
