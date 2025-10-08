import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Line Numbers - Ctrl-E Scrolling Debug", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("debug: show line numbers at each scroll step", async ({ page }) => {
        const textarea = page.locator("#performance-textarea");

        await textarea.click();
        await textarea.press("Escape");
        await page.waitForTimeout(1000);

        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');

        console.log("\n=== Starting Ctrl-E scroll test ===\n");

        // Check initial state
        let lineNumbersText = await lineNumbers.textContent();
        console.log("Initial line numbers visible:");
        console.log(
            lineNumbersText
                ?.split("\n")
                .filter((l) => l.trim())
                .slice(0, 10)
                .join(", "),
        );

        // Scroll 5 times and check each time
        for (let step = 1; step <= 10; step++) {
            // Do 5 Ctrl-E presses
            for (let i = 0; i < 5; i++) {
                await textarea.press("Control+e");
            }

            // Check immediately (no wait)
            lineNumbersText = await lineNumbers.textContent();
            const lines =
                lineNumbersText?.split("\n").filter((l) => l.trim()) || [];

            // Get cursor position
            const cursorLine = await textarea.evaluate(
                (el: HTMLTextAreaElement) => {
                    const text = el.value.substring(0, el.selectionStart);
                    return text.split("\n").length;
                },
            );

            console.log(
                `After ${step * 5} Ctrl-E (cursor at line ${cursorLine}):`,
            );
            console.log(
                `  Visible line numbers: ${lines.slice(0, 5).join(", ")} ... ${lines.slice(-5).join(", ")}`,
            );
            console.log(`  Total line number entries: ${lines.length}`);
            console.log(
                `  Max line number: ${Math.max(...lines.map((l) => parseInt(l.trim())).filter((n) => !isNaN(n)))}`,
            );

            // Wait a bit before next batch
            await page.waitForTimeout(100);
        }

        console.log("\n=== Checking if line numbers go beyond 30 ===\n");

        // Final check
        lineNumbersText = await lineNumbers.textContent();
        const allNumbers = (lineNumbersText?.match(/\d+/g) || []).map((n) =>
            parseInt(n),
        );
        const maxLineNumber = Math.max(...allNumbers);

        console.log(`Maximum line number found: ${maxLineNumber}`);
        console.log(
            `All unique line numbers: ${[...new Set(allNumbers)].sort((a, b) => a - b).join(", ")}`,
        );

        expect(maxLineNumber).toBeGreaterThan(30);
    });

    test("debug: check line numbers are rendered for current viewport", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        await textarea.click();
        await textarea.press("Escape");
        await page.waitForTimeout(1000);

        console.log("\n=== Checking viewport and line number rendering ===\n");

        // Get textarea dimensions
        const textareaInfo = await textarea.evaluate(
            (el: HTMLTextAreaElement) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return {
                    height: rect.height,
                    scrollTop: el.scrollTop,
                    scrollHeight: el.scrollHeight,
                    lineHeight: parseFloat(style.lineHeight),
                    visibleLines: Math.floor(
                        rect.height / parseFloat(style.lineHeight),
                    ),
                };
            },
        );

        console.log("Textarea info:", textareaInfo);

        // Scroll to line 50
        await textarea.press("5");
        await textarea.press("0");
        await textarea.press("G");
        await page.waitForTimeout(200);

        const lineNumbers = page.locator('[data-vim-line-numbers="true"]');
        const lineNumbersText = await lineNumbers.textContent();
        const visibleNumbers = (lineNumbersText?.match(/\d+/g) || []).map((n) =>
            parseInt(n),
        );

        console.log(
            `At line 50, visible line numbers: ${[...new Set(visibleNumbers)].sort((a, b) => a - b).join(", ")}`,
        );

        const textareaInfo2 = await textarea.evaluate(
            (el: HTMLTextAreaElement) => {
                return {
                    scrollTop: el.scrollTop,
                    currentLine: el.value
                        .substring(0, el.selectionStart)
                        .split("\n").length,
                };
            },
        );

        console.log("Current state:", textareaInfo2);

        expect(visibleNumbers).toContain(50);
    });
});
