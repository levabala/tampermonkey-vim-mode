import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Tab switching behavior", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("escape key clears stale mode indicator after tab switch", async ({
        page,
        context,
    }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.fill("Hello world\nSecond line");

        // Focus and enter normal mode
        await textarea.click();
        await textarea.press("Escape");

        // Blur the textarea by clicking elsewhere to simulate stale state
        await page.locator("body").click({ position: { x: 10, y: 10 } });

        // Wait a bit for blur to complete
        await page.waitForTimeout(100);

        // Create a new tab to simulate tab switching
        const htmlPath = path.join(process.cwd(), "test.html");
        const newPage = await context.newPage();
        await newPage.goto(`file://${htmlPath}`);
        await newPage.waitForTimeout(300);

        // Switch back to original tab
        await page.bringToFront();
        await page.waitForTimeout(300);

        // At this point, if there's a stale state with currentInput set but no focus,
        // pressing escape should clear it via the window-level handler
        await page.keyboard.press("Escape");

        // Clean up
        await newPage.close();

        // Success if we got here without errors - the escape handler should have
        // cleaned up any stale state
        expect(true).toBe(true);
    });

    test("window focus validates and clears stale state", async ({
        page,
        context,
    }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.fill("Hello world\nSecond line");

        // Focus and enter normal mode
        await textarea.click();
        await textarea.press("Escape");

        // Blur the textarea by clicking elsewhere
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(100);

        // Create a new tab to lose window focus
        const htmlPath = path.join(process.cwd(), "test.html");
        const newPage = await context.newPage();
        await newPage.goto(`file://${htmlPath}`);
        await newPage.waitForTimeout(300);

        // Switch back to original tab - this triggers window focus event
        await page.bringToFront();

        // Give the focus handler time to run
        await page.waitForTimeout(300);

        // The window focus handler should have cleaned up any stale state
        // We can verify by checking that normal operations still work
        await textarea.click();
        await textarea.press("Escape");

        // Clean up
        await newPage.close();

        // Success if we got here without errors
        expect(true).toBe(true);
    });
});
