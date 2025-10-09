import { test, expect } from "@playwright/test";
import * as path from "node:path";

test.describe("Mode indicator on blur", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("mode indicator should hide when input loses focus", async ({
        page,
    }) => {
        const textarea = page.locator("textarea").first();
        const indicator = page.locator("#vim-mode-indicator");

        // Focus textarea (should show INSERT mode)
        await textarea.focus();
        await page.waitForTimeout(100);

        await expect(indicator).toBeVisible();
        let mode = await indicator.textContent();
        expect(mode).toContain("INSERT");

        // Enter normal mode
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        await expect(indicator).toBeVisible();
        mode = await indicator.textContent();
        expect(mode).toContain("NORMAL");

        // Explicitly blur the textarea
        await textarea.evaluate((el) => el.blur());
        await page.waitForTimeout(100);

        // Mode indicator should now be hidden since input is not focused
        const isVisible = await indicator.isVisible();
        expect(isVisible).toBe(false);
    });

    test("mode indicator should hide when input is hidden via display:none", async ({
        page,
    }) => {
        const textarea = page.locator("textarea").first();
        const indicator = page.locator("#vim-mode-indicator");

        // Focus textarea
        await textarea.focus();
        await page.waitForTimeout(100);

        // Enter normal mode
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        await expect(indicator).toBeVisible();
        const mode = await indicator.textContent();
        expect(mode).toContain("NORMAL");

        // Hide the textarea via CSS
        await page.evaluate(() => {
            const textarea = document.querySelector("textarea");
            if (textarea) {
                (textarea as HTMLElement).style.display = "none";
            }
        });

        await page.waitForTimeout(100);

        // Mode indicator should be hidden
        const isVisible = await indicator.isVisible();
        expect(isVisible).toBe(false);
    });
});
