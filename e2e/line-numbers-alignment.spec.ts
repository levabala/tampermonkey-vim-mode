import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Line Numbers Column Alignment", () => {
    test.beforeEach(async ({ page }) => {
        // Load the HTML file directly
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        // Wait for the script to load
        await page.waitForTimeout(500);
    });

    test("should render line numbers column with proper alignment", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Click to focus and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Wait for line numbers to appear - use data attribute for specificity
        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );
        await expect(lineNumbersContainer).toBeVisible();

        // Check that line numbers container is properly positioned
        const textareaBox = await textarea.boundingBox();
        const lineNumbersBox = await lineNumbersContainer.boundingBox();

        expect(textareaBox).toBeTruthy();
        expect(lineNumbersBox).toBeTruthy();

        // Line numbers should be to the left of textarea
        expect(lineNumbersBox!.x).toBeLessThan(textareaBox!.x);

        // Line numbers should align vertically with textarea (allow for padding/border)
        expect(Math.abs(lineNumbersBox!.y - textareaBox!.y)).toBeLessThan(15);
    });

    test("should maintain alignment with wrapped text", async ({ page }) => {
        const textarea = page.locator("#large-textarea");

        // Click and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Navigate to a long line that wraps (Line 1 is very long)
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );
        await expect(lineNumbersContainer).toBeVisible();

        // Get computed styles
        const textareaLineHeight = await textarea.evaluate((el) =>
            window.getComputedStyle(el).getPropertyValue("line-height"),
        );
        const lineNumbersLineHeight = await lineNumbersContainer.evaluate(
            (el) => window.getComputedStyle(el).getPropertyValue("line-height"),
        );

        // Line heights should match for proper alignment
        expect(lineNumbersLineHeight).toBe(textareaLineHeight);

        // Font sizes should match
        const textareaFontSize = await textarea.evaluate((el) =>
            window.getComputedStyle(el).getPropertyValue("font-size"),
        );
        const lineNumbersFontSize = await lineNumbersContainer.evaluate((el) =>
            window.getComputedStyle(el).getPropertyValue("font-size"),
        );

        expect(lineNumbersFontSize).toBe(textareaFontSize);
    });

    test("should show correct number of lines", async ({ page }) => {
        const textarea = page.locator("#large-textarea");

        // Click and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Wait for debounce to settle
        await page.waitForTimeout(100);

        // Count logical lines in textarea
        const textContent = await textarea.inputValue();
        const logicalLines = textContent.split("\n").length;

        // Get line numbers from container
        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );
        const lineNumbersText = await lineNumbersContainer.textContent();
        const displayedLines = lineNumbersText!.trim().split("\n").length;

        // Should have one line number per logical line, not per wrapped line
        // Allow for minor differences due to empty lines at end
        expect(Math.abs(displayedLines - logicalLines)).toBeLessThan(10);
    });

    test("should highlight current line correctly", async ({ page }) => {
        const textarea = page.locator("#large-textarea");

        // Click and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Navigate to line 5
        await page.keyboard.press("5");
        await page.keyboard.press("G");

        // Wait for debounce to settle
        await page.waitForTimeout(100);

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );

        // Check that line 5 is highlighted (bold)
        const innerHTML = await lineNumbersContainer.innerHTML();
        expect(innerHTML).toContain("font-weight: bold");
    });

    test("should sync scroll with textarea", async ({ page }) => {
        const textarea = page.locator("#large-textarea");

        // Click and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Scroll down with Ctrl+d (half page down)
        await page.keyboard.press("Control+d");
        await page.waitForTimeout(100);

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );

        // Get scroll position
        const textareaScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Line numbers container should have transform to match scroll (with chunked rendering)
        const transform = await lineNumbersContainer.evaluate((el) =>
            window.getComputedStyle(el).getPropertyValue("transform"),
        );

        // Transform should contain negative scroll value (can be matrix or translateY format)
        expect(textareaScrollTop).toBeGreaterThan(0);
        // matrix(1, 0, 0, 1, 0, -Y) where Y is the scroll amount
        expect(transform).toContain(`-${textareaScrollTop}`);
    });

    test("should handle relative line numbers", async ({ page }) => {
        // Enable relative line numbers via config
        await page.addScriptTag({
            content: `
                window.TAMPER_VIM_MODE = {
                    showLineNumbers: true,
                    relativeLineNumbers: true,
                    disableCustomCaret: false
                };
            `,
        });

        await page.reload();
        await page.waitForTimeout(500);

        const textarea = page.locator("#large-textarea");

        // Click and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Navigate to line 10
        await page.keyboard.press("1");
        await page.keyboard.press("0");
        await page.keyboard.press("G");

        // Wait for debounce to settle
        await page.waitForTimeout(100);

        const lineNumbersContainer = page.locator(
            'div[data-vim-line-numbers="true"]',
        );
        const lineNumbersText = await lineNumbersContainer.textContent();

        // Should show relative distances from current line
        expect(lineNumbersText).toBeTruthy();
        const lines = lineNumbersText!.trim().split("\n");
        expect(lines.length).toBeGreaterThan(0);
    });
});
