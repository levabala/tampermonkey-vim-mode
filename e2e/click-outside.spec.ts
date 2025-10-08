import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe.skip(
    "Click Outside Input - TODO: fix test environment issues",
    () => {
        test.beforeEach(async ({ page }) => {
            const htmlPath = path.join(process.cwd(), "test.html");
            await page.goto(`file://${htmlPath}`);
            await page.waitForTimeout(500);
        });

        test("should clear vim mode when clicking outside textarea", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill(
                "line 1\nline 2\nline 3\nline 4\nline 5\nline 6",
            );
            await textarea.press("Escape");
            await page.waitForTimeout(100);

            // Verify we're in normal mode - line number overlay should exist
            const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
            await expect(lineNumbers).toBeVisible();

            // Click outside the textarea (on body) - blur the textarea
            await textarea.evaluate((el) => (el as HTMLElement).blur());
            await page.waitForTimeout(100);

            // Line number overlay should be gone
            await expect(lineNumbers).not.toBeVisible();

            // Focus the textarea again
            await textarea.click();
            await page.waitForTimeout(100);

            // We should be in insert mode (no line numbers visible)
            await expect(lineNumbers).not.toBeVisible();
        });

        test("should clear vim mode when clicking on another element", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill(
                "line 1\nline 2\nline 3\nline 4\nline 5\nline 6",
            );
            await textarea.press("Escape");
            await page.waitForTimeout(100);

            // Verify we're in normal mode
            const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
            await expect(lineNumbers).toBeVisible();

            // Click on the instructions div
            await page.locator(".instructions").click();
            await page.waitForTimeout(100);

            // Line numbers should be gone
            await expect(lineNumbers).not.toBeVisible();

            // Click back on textarea
            await textarea.click();
            await page.waitForTimeout(100);

            // Should be in insert mode (no line numbers)
            await expect(lineNumbers).not.toBeVisible();
        });

        test("should preserve textarea content when clicking outside", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill(
                "line 1\nline 2\nline 3\nline 4\nline 5\nline 6",
            );
            await textarea.press("Escape");

            // Click outside
            await page.locator("body").click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(100);

            // Content should be preserved
            const content = await textarea.inputValue();
            expect(content).toBe(
                "line 1\nline 2\nline 3\nline 4\nline 5\nline 6",
            );
        });
    },
);
