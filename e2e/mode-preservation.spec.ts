import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Mode Preservation on Blur/Refocus", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should preserve normal mode when losing and regaining focus", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        const otherTextarea = page.locator("#small-textarea");

        // Focus textarea, enter normal mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");

        // Verify we're in normal mode (wide caret exists)
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
        expect(caretStyle).not.toBeNull();
        expect(parseFloat(caretStyle?.width || "0")).toBeGreaterThan(5);

        // Click on another textarea (lose focus)
        await otherTextarea.click();
        await page.waitForTimeout(100);

        // Click back to original textarea (regain focus)
        await textarea.click();
        await page.waitForTimeout(100);

        // Try pressing 'l' to see if we're in normal mode (should move cursor without inserting text)
        await textarea.press("l");
        await page.waitForTimeout(50);

        // Verify we're still in normal mode
        const value = await textarea.inputValue();
        expect(value).toBe("hello world"); // Text should not contain 'l'

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
        expect(caretStyle).not.toBeNull();
        expect(parseFloat(caretStyle?.width || "0")).toBeGreaterThan(5);
    });

    test("should preserve insert mode when losing and regaining focus", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        const otherTextarea = page.locator("#small-textarea");

        // Focus textarea (starts in insert mode)
        await textarea.click();
        await textarea.fill("hello");

        // Verify we're in insert mode (no wide caret, normal browser caret)
        let caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
            };
        });
        expect(caretStyle).toBeNull(); // No custom caret in insert mode

        // Click on another textarea (lose focus)
        await otherTextarea.click();
        await page.waitForTimeout(100);

        // Click back to original textarea (regain focus)
        await textarea.click();
        await page.waitForTimeout(100);

        // Verify we're still in insert mode (no wide caret)
        caretStyle = await page.evaluate(() => {
            const caretEl = document.querySelector(
                'div[style*="position: absolute"][style*="pointer-events: none"][style*="z-index: 9999"]',
            );
            if (!caretEl) return null;
            const computed = window.getComputedStyle(caretEl);
            return {
                display: computed.display,
            };
        });
        expect(caretStyle).toBeNull(); // No custom caret in insert mode

        // Type text to verify we're still in insert mode
        await textarea.press("w");
        const value = await textarea.inputValue();
        expect(value).toBe("hellow"); // Text was inserted, not a vim command
    });

    test("should preserve visual mode when losing and regaining focus", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");
        const otherTextarea = page.locator("#small-textarea");

        // Focus textarea, enter visual mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");
        await textarea.press("0"); // Move to start
        await textarea.press("v"); // Enter visual mode

        // Move to select "hello"
        await textarea.press("e");

        // Verify we're in visual mode (visual selection exists)
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

        // Click on another textarea (lose focus)
        await otherTextarea.click();
        await page.waitForTimeout(100);

        // Click back to original textarea (regain focus)
        await textarea.click();
        await page.waitForTimeout(100);

        // Verify we're still in visual mode (visual selection should appear)
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

    test("should preserve normal mode when clicking outside to body", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus textarea, enter normal mode
        await textarea.click();
        await textarea.fill("hello world");
        await textarea.press("Escape");

        // Verify we're in normal mode (wide caret exists)
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
        expect(caretStyle).not.toBeNull();
        expect(parseFloat(caretStyle?.width || "0")).toBeGreaterThan(5);

        // Click on body (lose focus to non-input element)
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(100);

        // Check if textarea actually lost focus
        const isStillFocused = await page.evaluate(() => {
            const textarea = document.getElementById("large-textarea");
            return document.activeElement === textarea;
        });
        console.log(
            "After body click, textarea still focused:",
            isStillFocused,
        );

        // Click back to original textarea (regain focus)
        await textarea.click();
        await page.waitForTimeout(100);

        // Verify we're still in normal mode (wide caret should appear immediately)
        // Check if we can use vim commands like 'l' to move right
        await textarea.press("l");
        await page.waitForTimeout(50);

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

        // If we're in normal mode, 'l' should have moved cursor but not added 'l' to text
        const value = await textarea.inputValue();
        expect(value).toBe("hello world"); // Text unchanged
        expect(caretStyle).not.toBeNull();
        expect(parseFloat(caretStyle?.width || "0")).toBeGreaterThan(5);
    });
});
