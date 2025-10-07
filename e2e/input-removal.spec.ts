import { test, expect } from "@playwright/test";
import * as path from "node:path";

test.describe("Input removal", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("mode indicator should disappear when focused input is removed from DOM", async ({
        page,
    }) => {
        // Create a new input element
        await page.evaluate(() => {
            const input = document.createElement("textarea");
            input.id = "temp-input";
            input.value = "test content";
            document.body.appendChild(input);
        });

        // Focus the input and verify mode indicator appears
        await page.focus("#temp-input");
        await page.waitForTimeout(100);

        // Check that mode indicator is visible (should show "INSERT")
        const indicatorBefore = await page.locator("#vim-mode-indicator");
        await expect(indicatorBefore).toBeVisible();
        const modeBefore = await indicatorBefore.textContent();
        expect(modeBefore).toContain("INSERT");

        // Enter normal mode
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);

        // Verify we're in normal mode
        const modeAfterEsc = await indicatorBefore.textContent();
        expect(modeAfterEsc).toContain("NORMAL");

        // Remove the input from DOM
        await page.evaluate(() => {
            const input = document.querySelector("#temp-input");
            if (input) {
                input.remove();
            }
        });

        await page.waitForTimeout(100);

        // Mode indicator should now be hidden or show no mode
        const indicatorAfter = await page.locator("#vim-mode-indicator");
        const isVisible = await indicatorAfter.isVisible();

        if (isVisible) {
            // If visible, it should show no active mode
            const modeAfter = await indicatorAfter.textContent();
            // The indicator might be visible but empty/hidden via CSS
            // We check that it doesn't still show "NORMAL"
            expect(modeAfter).not.toContain("NORMAL");
            expect(modeAfter).not.toContain("INSERT");
        } else {
            // Indicator should be hidden
            expect(isVisible).toBe(false);
        }
    });

    test("mode indicator should disappear when focused input is removed while in insert mode", async ({
        page,
    }) => {
        // Create a new input element
        await page.evaluate(() => {
            const input = document.createElement("textarea");
            input.id = "temp-input-insert";
            input.value = "test content";
            document.body.appendChild(input);
        });

        // Focus the input and verify mode indicator appears
        await page.focus("#temp-input-insert");
        await page.waitForTimeout(100);

        // Check that mode indicator is visible (should show "INSERT")
        const indicator = await page.locator("#vim-mode-indicator");
        await expect(indicator).toBeVisible();
        const modeBefore = await indicator.textContent();
        expect(modeBefore).toContain("INSERT");

        // Remove the input from DOM while still in insert mode
        await page.evaluate(() => {
            const input = document.querySelector("#temp-input-insert");
            if (input) {
                input.remove();
            }
        });

        await page.waitForTimeout(100);

        // Mode indicator should now be hidden or show no mode
        const isVisible = await indicator.isVisible();

        if (isVisible) {
            const modeAfter = await indicator.textContent();
            expect(modeAfter).not.toContain("NORMAL");
            expect(modeAfter).not.toContain("INSERT");
        } else {
            expect(isVisible).toBe(false);
        }
    });

    test("mode should reset when input is removed after setTimeout", async ({
        page,
    }) => {
        // Create a temporary input that will be removed after a timeout
        await page.evaluate(() => {
            const input = document.createElement("textarea");
            input.id = "timeout-input";
            input.value = "temporary content";
            document.body.appendChild(input);

            // Remove the input after 1 second
            setTimeout(() => {
                const el = document.querySelector("#timeout-input");
                if (el) {
                    el.remove();
                }
            }, 1000);
        });

        // Focus the input
        await page.focus("#timeout-input");
        await page.waitForTimeout(100);

        // Enter normal mode
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);

        // Verify we're in normal mode
        const indicator = await page.locator("#vim-mode-indicator");
        const modeBefore = await indicator.textContent();
        expect(modeBefore).toContain("NORMAL");

        // Wait for the timeout to trigger and remove the input
        await page.waitForTimeout(1200);

        // Mode indicator should now be hidden or show no mode
        const isVisible = await indicator.isVisible();

        if (isVisible) {
            const modeAfter = await indicator.textContent();
            expect(modeAfter).not.toContain("NORMAL");
            expect(modeAfter).not.toContain("INSERT");
        } else {
            expect(isVisible).toBe(false);
        }
    });
});
