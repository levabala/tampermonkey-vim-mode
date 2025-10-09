import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Caret Appearance After Refocus", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should show wide caret in normal mode after blur and refocus", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus textarea and enter normal mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");
        await textarea.press("0"); // Move to start

        // Get caret width in normal mode (should be wide - block cursor)
        let caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
                width: computed.width,
                height: computed.height,
            };
        });

        expect(caretStyle).not.toBeNull();
        expect(caretStyle?.display).toBe("block");

        const normalModeWidth = parseFloat(caretStyle?.width || "0");
        expect(normalModeWidth).toBeGreaterThan(5); // Should be wide (character width)

        // Blur the textarea by pressing Escape twice (vim behavior to unfocus)
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        // Refocus the textarea
        await textarea.click();
        await page.waitForTimeout(200);

        // Check caret appearance again
        caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
                width: computed.width,
                height: computed.height,
            };
        });

        expect(caretStyle).not.toBeNull();
        expect(caretStyle?.display).toBe("block");

        const refocusedWidth = parseFloat(caretStyle?.width || "0");
        expect(refocusedWidth).toBeGreaterThan(5); // Should still be wide (character width)

        // Verify the width is similar to the original (within 2px tolerance)
        expect(Math.abs(refocusedWidth - normalModeWidth)).toBeLessThan(2);
    });

    test("should maintain caret appearance when switching between inputs", async ({
        page,
    }) => {
        const textarea1 = page.locator("#large-textarea");
        const textarea2 = page.locator("#small-textarea");

        // Set up first textarea in normal mode
        await textarea1.click();
        await textarea1.fill("first");
        await textarea1.press("Escape");

        // Get caret width from first textarea
        let caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
                width: computed.width,
            };
        });

        const firstWidth = parseFloat(caretStyle?.width || "0");
        expect(firstWidth).toBeGreaterThan(5);

        // Switch to second textarea
        await textarea2.click();
        await textarea2.fill("second");
        await textarea2.press("Escape");

        // Switch back to first textarea
        await textarea1.click();
        await textarea1.press("Escape");
        await page.waitForTimeout(100);

        // Check caret width again
        caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
                width: computed.width,
            };
        });

        const secondWidth = parseFloat(caretStyle?.width || "0");
        expect(secondWidth).toBeGreaterThan(5);

        // Should be similar width
        expect(Math.abs(secondWidth - firstWidth)).toBeLessThan(2);
    });
});
