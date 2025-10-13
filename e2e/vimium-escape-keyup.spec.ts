import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Vimium Escape Key Compatibility", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should handle Escape via keyup when keydown is blocked (Vimium simulation)", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Clear textarea and set up
        await textarea.fill("");
        await textarea.click();
        await textarea.press("Escape"); // Ensure we're in normal mode

        // Simulate Vimium by blocking keydown for Escape but allowing keyup
        await page.evaluate(() => {
            // Add a capture-phase listener that prevents Escape keydown (like Vimium does)
            window.addEventListener(
                "keydown",
                (e: KeyboardEvent) => {
                    if (e.key === "Escape") {
                        console.log(
                            "Simulated Vimium: blocking Escape keydown",
                        );
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }
                },
                true, // capture phase - runs before any other handlers
            );
        });

        // Enter insert mode and type
        await textarea.press("i");
        await page.waitForTimeout(50);
        await textarea.type("hello world");

        // Verify we're in insert mode
        const indicator = page.locator("#vim-mode-indicator");
        await expect(indicator).toContainText("-- INSERT --");

        // Press Escape - keydown will be blocked, but keyup should work
        await textarea.press("Escape");

        // Wait a bit for the mode change
        await page.waitForTimeout(100);

        // Verify we switched to normal mode by checking the indicator
        await expect(indicator).toContainText("-- NORMAL --");

        // Execute a normal mode command to confirm we're actually in normal mode
        await textarea.press("x");

        const value = await textarea.inputValue();
        expect(value).toBe("hello worl"); // Last character deleted by 'x'
    });

    test("should handle Ctrl-[ via keyup when keydown is blocked", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        await textarea.fill("");
        await textarea.click();
        await textarea.press("Escape"); // Ensure we're in normal mode

        // Simulate Vimium blocking Ctrl-[ keydown
        await page.evaluate(() => {
            window.addEventListener(
                "keydown",
                (e: KeyboardEvent) => {
                    if (e.ctrlKey && e.key === "[") {
                        console.log(
                            "Simulated Vimium: blocking Ctrl-[ keydown",
                        );
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }
                },
                true,
            );
        });

        await textarea.press("i");
        await page.waitForTimeout(50);
        await textarea.type("test text");

        const indicator = page.locator("#vim-mode-indicator");
        await expect(indicator).toContainText("-- INSERT --");

        // Press Ctrl-[
        await textarea.press("Control+[");

        await page.waitForTimeout(100);

        // Should be in normal mode
        await expect(indicator).toContainText("-- NORMAL --");

        // Confirm with normal mode command
        await textarea.press("x");

        const value = await textarea.inputValue();
        expect(value).toBe("test tex");
    });

    test("should still work with normal Escape when keydown is not blocked", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        await textarea.fill("");
        await textarea.click();
        await textarea.press("Escape"); // Ensure we're in normal mode

        await textarea.press("i");
        await page.waitForTimeout(50);
        await textarea.type("normal test");

        const indicator = page.locator("#vim-mode-indicator");
        await expect(indicator).toContainText("-- INSERT --");

        // Normal Escape press (no blocking)
        await textarea.press("Escape");

        await expect(indicator).toContainText("-- NORMAL --");

        await textarea.press("x");

        const value = await textarea.inputValue();
        expect(value).toBe("normal tes");
    });
});
