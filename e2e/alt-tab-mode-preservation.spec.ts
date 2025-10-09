import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Alt+Tab Mode Preservation", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should preserve insert mode when alt+tabbing away and back", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus and enter insert mode (default)
        await textarea.click();
        await textarea.fill("hello world");

        // Verify in insert mode (no custom caret)
        const caretExists = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            return caretEl !== null;
        });
        expect(caretExists).toBe(false); // No custom caret in insert mode

        // Simulate alt+tab by blurring the input (focus leaves window)
        await page.evaluate(() => {
            const textarea = document.getElementById(
                "large-textarea",
            ) as HTMLTextAreaElement;
            textarea.blur();
        });
        await page.waitForTimeout(100);

        // Simulate alt+tab back by focusing the input
        await textarea.click();
        await page.waitForTimeout(100);

        // Try typing - should still be in insert mode
        await textarea.press("x");
        const value = await textarea.inputValue();
        expect(value).toBe("hello worldx"); // 'x' was inserted, not a vim command
    });

    test("should preserve normal mode when alt+tabbing away and back", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus and enter normal mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");

        // Verify in normal mode (custom caret exists)
        let caretExists = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            return caretEl !== null;
        });
        expect(caretExists).toBe(true);

        // Simulate alt+tab by blurring the input (focus leaves window)
        await page.evaluate(() => {
            const textarea = document.getElementById(
                "large-textarea",
            ) as HTMLTextAreaElement;
            textarea.blur();
        });
        await page.waitForTimeout(100);

        // Simulate alt+tab back by focusing the input
        await textarea.click();
        await page.waitForTimeout(100);

        // Try vim command 'l' - should still be in normal mode
        await textarea.press("l");
        await page.waitForTimeout(50);

        // Verify still in normal mode (text unchanged, cursor moved)
        const value = await textarea.inputValue();
        expect(value).toBe("hello world"); // 'l' moved cursor, didn't insert text

        // Verify custom caret still exists
        caretExists = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            return caretEl !== null;
        });
        expect(caretExists).toBe(true);
    });

    test("should preserve visual mode when alt+tabbing away and back", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus and enter visual mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");
        await textarea.press("0"); // Move to start
        await textarea.press("v"); // Enter visual mode
        await textarea.press("e"); // Select first word

        // Verify in visual mode (visual selection exists)
        let hasVisualSelection = await page.evaluate(() => {
            const selectionDivs = Array.from(
                document.querySelectorAll(
                    'div[style*="position: absolute"][style*="pointer-events: none"]',
                ),
            ).filter((div) => {
                const bgColor = (div as HTMLElement).style.backgroundColor;
                return bgColor.includes("rgba") || bgColor.includes("rgb");
            });
            return selectionDivs.length > 0;
        });
        expect(hasVisualSelection).toBe(true);

        // Simulate alt+tab by blurring the input
        await page.evaluate(() => {
            const textarea = document.getElementById(
                "large-textarea",
            ) as HTMLTextAreaElement;
            textarea.blur();
        });
        await page.waitForTimeout(100);

        // Simulate alt+tab back by focusing the input
        await textarea.click();
        await page.waitForTimeout(100);

        // Verify still in visual mode (visual selection restored)
        hasVisualSelection = await page.evaluate(() => {
            const selectionDivs = Array.from(
                document.querySelectorAll(
                    'div[style*="position: absolute"][style*="pointer-events: none"]',
                ),
            ).filter((div) => {
                const bgColor = (div as HTMLElement).style.backgroundColor;
                return bgColor.includes("rgba") || bgColor.includes("rgb");
            });
            return selectionDivs.length > 0;
        });
        expect(hasVisualSelection).toBe(true);
    });
});
