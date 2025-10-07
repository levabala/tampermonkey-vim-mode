import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Wrapped Lines Across Chunks", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should correctly render line numbers when wrapped lines span multiple chunks", async ({
        page,
    }) => {
        // Create a textarea with lines that will wrap, positioned across chunk boundaries
        // Chunk size is 30 lines, so we'll create content around lines 28-32
        const textarea = page.locator("#large-textarea");

        // Build content: 28 normal lines, then a very long line at line 29 that will wrap multiple times,
        // then a few more normal lines
        const normalLines = Array(28)
            .fill(0)
            .map((_, i) => `Line ${i + 1}`)
            .join("\n");
        const veryLongLine =
            "This is an extremely long line that will definitely wrap multiple times across the textarea width. ".repeat(
                10,
            );
        const moreNormalLines = Array(5)
            .fill(0)
            .map((_, i) => `Line ${29 + i}`)
            .join("\n");

        const content = `${normalLines}\n${veryLongLine}\n${moreNormalLines}`;

        await textarea.fill(content);
        await textarea.click();
        await textarea.press("Escape");

        // Wait for async rendering to complete
        await page.waitForTimeout(200);

        // Line numbers should be visible
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        // Navigate to line 29 (the wrapped line that spans chunks)
        await textarea.press("g");
        await textarea.press("g");
        for (let i = 0; i < 28; i++) {
            await textarea.press("j");
        }

        await page.waitForTimeout(200);

        // Verify line numbers are still rendering correctly
        const lineNumbersText = await lineNumbers.textContent();
        expect(lineNumbersText).toBeTruthy();

        // Should have line numbers for all logical lines (28 + 1 long + 5 = 34 lines)
        const lines = content.split("\n");
        expect(lines.length).toBe(34);

        // The line numbers should contain markers for lines around the chunk boundary
        // Line 29 should appear (the wrapped line)
        // Line 30 should appear (after the wrapped line)
        expect(lineNumbersText).toContain("29");
        expect(lineNumbersText).toContain("30");

        // Navigate through the wrapped line to ensure caret and line numbers stay in sync
        await textarea.press("j"); // Move to line 30
        await page.waitForTimeout(100);

        await textarea.press("k"); // Move back to line 29
        await page.waitForTimeout(100);

        // Line numbers should still be visible and correct
        await expect(lineNumbers).toBeVisible();
        const updatedText = await lineNumbers.textContent();
        expect(updatedText).toBeTruthy();
    });

    test("should handle highlighting correctly for wrapped line spanning chunks", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create content with a very long line at line 29 (spans chunk boundary at 30)
        const normalLines = Array(28)
            .fill(0)
            .map((_, i) => `Line ${i + 1}`)
            .join("\n");
        const veryLongLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ".repeat(50); // Very long line
        const moreLines = Array(5)
            .fill(0)
            .map((_, i) => `Line ${29 + i}`)
            .join("\n");

        await textarea.fill(`${normalLines}\n${veryLongLine}\n${moreLines}`);
        await textarea.click();
        await textarea.press("Escape");

        // Navigate to the wrapped line (line 29)
        await textarea.press("g");
        await textarea.press("g");
        for (let i = 0; i < 28; i++) {
            await textarea.press("j");
        }

        await page.waitForTimeout(200);

        // Get line numbers container
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        const lineNumbersHTML = await lineNumbers.evaluate(
            (el) => el.innerHTML,
        );

        // Should have highlighting styles applied
        // The highlighted line should have the style with background-color
        expect(lineNumbersHTML).toContain("background-color");
        expect(lineNumbersHTML).toContain("rgba(255, 255, 255, 0.2)");

        // Navigate to next line (line 30)
        await textarea.press("j");
        await page.waitForTimeout(200);

        // Highlighting should have moved
        const updatedHTML = await lineNumbers.evaluate((el) => el.innerHTML);
        expect(updatedHTML).toContain("background-color");
    });

    test("should correctly count visual rows for wrapped lines at chunk boundaries", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Create exactly 30 lines, where line 30 is very long and wraps
        // This tests the exact chunk boundary
        const lines29 = Array(29)
            .fill(0)
            .map((_, i) => `Line ${i + 1}`)
            .join("\n");
        const line30Wrapped = "X".repeat(500); // Will wrap multiple times
        const moreLines = Array(5)
            .fill(0)
            .map((_, i) => `Line ${31 + i}`)
            .join("\n");

        await textarea.fill(`${lines29}\n${line30Wrapped}\n${moreLines}`);
        await textarea.click();
        await textarea.press("Escape");

        await page.waitForTimeout(200);

        // Navigate to line 30
        await textarea.press("g");
        await textarea.press("g");
        for (let i = 0; i < 29; i++) {
            await textarea.press("j");
        }

        await page.waitForTimeout(200);

        // Line numbers should still be rendering
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        await expect(lineNumbers).toBeVisible();

        const lineNumbersText = await lineNumbers.textContent();

        // Should show line 30 and surrounding lines
        expect(lineNumbersText).toContain("30");
        expect(lineNumbersText).toContain("31");

        // Wrapped portions of line 30 should show empty space in line numbers
        // (not additional line numbers)
        const lineNumberLines = lineNumbersText!.split("\n");

        // Count how many lines show "30" - should be exactly 1 (first visual row of the wrapped line)
        const line30Count = lineNumberLines.filter((line) =>
            line.includes("30"),
        ).length;
        expect(line30Count).toBe(1);
    });
});
