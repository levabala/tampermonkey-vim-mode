import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Scrolling Commands", () => {
    test.beforeEach(async ({ page }) => {
        // Load the HTML file directly
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        // Wait for the script to load
        await page.waitForTimeout(500);
    });

    test("should scroll down one line with Ctrl-e in insert mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // Get initial scroll position
        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+e
        await page.keyboard.press("Control+e");
        await page.waitForTimeout(50);

        // Get new scroll position
        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled down
        expect(newScrollTop).toBeGreaterThan(initialScrollTop);
    });

    test("should scroll up one line with Ctrl-y in insert mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // First scroll down to have room to scroll up
        await textarea.evaluate(
            (el) => ((el as HTMLTextAreaElement).scrollTop = 100),
        );
        await page.waitForTimeout(50);

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+y
        await page.keyboard.press("Control+y");
        await page.waitForTimeout(50);

        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled up
        expect(newScrollTop).toBeLessThan(initialScrollTop);
    });

    test("should scroll down half page with Ctrl-d in insert mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+d
        await page.keyboard.press("Control+d");
        await page.waitForTimeout(50);

        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled down significantly (half page)
        expect(newScrollTop).toBeGreaterThan(initialScrollTop + 50);
    });

    test("should scroll up half page with Ctrl-u in insert mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // First scroll down to have room to scroll up
        await textarea.evaluate(
            (el) => ((el as HTMLTextAreaElement).scrollTop = 200),
        );
        await page.waitForTimeout(50);

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+u
        await page.keyboard.press("Control+u");
        await page.waitForTimeout(50);

        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled up significantly (half page)
        expect(newScrollTop).toBeLessThan(initialScrollTop - 50);
    });

    test("should scroll down one line with Ctrl-e in normal mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // Enter normal mode
        await page.keyboard.press("Escape");
        await page.waitForTimeout(50);

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+e
        await page.keyboard.press("Control+e");
        await page.waitForTimeout(50);

        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled down
        expect(newScrollTop).toBeGreaterThan(initialScrollTop);
    });

    test("should scroll down half page with Ctrl-d in normal mode", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // Enter normal mode
        await page.keyboard.press("Escape");
        await page.waitForTimeout(50);

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Press Ctrl+d
        await page.keyboard.press("Control+d");
        await page.waitForTimeout(50);

        const newScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Should have scrolled down significantly
        expect(newScrollTop).toBeGreaterThan(initialScrollTop + 50);
    });

    test("should scroll window when textarea reaches bottom", async ({
        page,
    }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // Scroll textarea to bottom
        await textarea.evaluate((el) => {
            const ta = el as HTMLTextAreaElement;
            ta.scrollTop = ta.scrollHeight - ta.clientHeight;
        });
        await page.waitForTimeout(50);

        const initialScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );

        // Get initial window scroll position
        const initialWindowScrollY = await page.evaluate(() => window.scrollY);

        // Press Ctrl+e (should scroll window instead)
        await page.keyboard.press("Control+e");
        await page.waitForTimeout(50);

        const finalScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );
        const finalWindowScrollY = await page.evaluate(() => window.scrollY);

        // Textarea scroll should not have changed (already at bottom)
        expect(finalScrollTop).toBe(initialScrollTop);

        // Window should have scrolled instead
        expect(finalWindowScrollY).toBeGreaterThanOrEqual(initialWindowScrollY);
    });

    test("should scroll window when textarea reaches top", async ({ page }) => {
        const textarea = page.locator("textarea");

        // Click to focus
        await textarea.click();

        // Ensure textarea is at top (scrollTop = 0)
        await textarea.evaluate((el) => {
            (el as HTMLTextAreaElement).scrollTop = 0;
        });
        await page.waitForTimeout(50);

        // Scroll window down first to have room to scroll up
        await page.evaluate(() => window.scrollTo(0, 100));
        await page.waitForTimeout(50);

        const initialWindowScrollY = await page.evaluate(() => window.scrollY);

        // Press Ctrl+y (should scroll window instead)
        await page.keyboard.press("Control+y");
        await page.waitForTimeout(50);

        const finalScrollTop = await textarea.evaluate(
            (el) => (el as HTMLTextAreaElement).scrollTop,
        );
        const finalWindowScrollY = await page.evaluate(() => window.scrollY);

        // Textarea scroll should still be 0 (already at top)
        expect(finalScrollTop).toBe(0);

        // Window should have scrolled up
        expect(finalWindowScrollY).toBeLessThan(initialWindowScrollY);
    });
});
