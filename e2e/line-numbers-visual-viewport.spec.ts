import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Visual Viewport", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should show line numbers in visible viewport when scrolling with Ctrl-E", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        await textarea.click();
        await textarea.press("Escape");
        await page.waitForTimeout(1000);

        // Get initial viewport info
        const initialInfo = await page.evaluate(() => {
            const container = document.querySelector(
                '[data-vim-line-numbers="true"]',
            ) as HTMLElement;
            const textarea = document.querySelector(
                "#performance-textarea",
            ) as HTMLTextAreaElement;

            if (!container || !textarea) return null;

            const containerRect = container.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(container);

            return {
                containerHeight: containerRect.height,
                containerTop: containerRect.top,
                containerTransform: computedStyle.transform,
                textareaScrollTop: textarea.scrollTop,
                overflow: computedStyle.overflow,
            };
        });

        console.log("Initial state:", initialInfo);

        // Scroll with Ctrl-E
        for (let i = 0; i < 40; i++) {
            await textarea.press("Control+e");
        }

        await page.waitForTimeout(200);

        // Check viewport info after scrolling
        const afterScrollInfo = await page.evaluate(() => {
            const container = document.querySelector(
                '[data-vim-line-numbers="true"]',
            ) as HTMLElement;
            const textarea = document.querySelector(
                "#performance-textarea",
            ) as HTMLTextAreaElement;

            if (!container || !textarea) return null;

            const containerRect = container.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(container);

            // Get all the chunk divs
            const chunks = Array.from(container.children) as HTMLElement[];

            // Get visible line numbers (check which elements are in viewport)
            const visibleLineNumbers: number[] = [];

            chunks.forEach((chunk) => {
                const chunkText = chunk.textContent || "";
                const numbers = chunkText
                    .match(/\d+/g)
                    ?.map((n) => parseInt(n));
                if (numbers) {
                    visibleLineNumbers.push(...numbers);
                }
            });

            return {
                containerHeight: containerRect.height,
                containerTop: containerRect.top,
                containerTransform: computedStyle.transform,
                textareaScrollTop: textarea.scrollTop,
                overflow: computedStyle.overflow,
                totalChunks: chunks.length,
                visibleLineNumbersCount: visibleLineNumbers.length,
                minVisibleLine: Math.min(...visibleLineNumbers),
                maxVisibleLine: Math.max(...visibleLineNumbers),
                currentLine: textarea.value
                    .substring(0, textarea.selectionStart)
                    .split("\n").length,
            };
        });

        console.log("After 40 Ctrl-E:", afterScrollInfo);

        expect(afterScrollInfo).not.toBeNull();
        expect(afterScrollInfo!.maxVisibleLine).toBeGreaterThan(30);
        expect(afterScrollInfo!.textareaScrollTop).toBeGreaterThan(0);

        // The transform should match the scrollTop (to keep numbers in sync)
        const transformMatch = afterScrollInfo!.containerTransform.match(
            /translateY\((-?\d+(?:\.\d+)?)px\)/,
        );
        if (transformMatch) {
            const transformY = Math.abs(parseFloat(transformMatch[1]));
            console.log(
                `Transform translateY: -${transformY}px, textarea scrollTop: ${afterScrollInfo!.textareaScrollTop}px`,
            );
            expect(transformY).toBeCloseTo(
                afterScrollInfo!.textareaScrollTop,
                0,
            );
        }
    });

    test("check what's actually painted in the viewport", async ({ page }) => {
        const textarea = page.locator("#performance-textarea");

        await textarea.click();
        await textarea.press("Escape");
        await page.waitForTimeout(1000);

        // Scroll to line 50
        await textarea.press("5");
        await textarea.press("0");
        await textarea.press("G");
        await page.waitForTimeout(300);

        // Take a screenshot of just the line numbers area
        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        const screenshot = await lineNumbers.screenshot();

        console.log(
            `Screenshot taken, size: ${screenshot.length} bytes (should contain line 50)`,
        );

        // Check the text content is actually there
        const content = await lineNumbers.textContent();
        const numbers = (content?.match(/\d+/g) || []).map((n) => parseInt(n));

        console.log(
            `Line numbers present: ${Math.min(...numbers)} to ${Math.max(...numbers)}`,
        );
        console.log(`Contains line 50: ${numbers.includes(50)}`);

        expect(numbers.includes(50)).toBe(true);
    });
});
