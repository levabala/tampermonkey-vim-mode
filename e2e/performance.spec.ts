import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Performance benchmarks", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("j/k motions should be fast on large textareas (100+ lines)", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");

        // Enter normal mode
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        // Measure time for 50 j presses
        const startTime = performance.now();
        for (let i = 0; i < 50; i++) {
            await textarea.press("j");
        }
        const jTime = performance.now() - startTime;

        // Move back up with k
        const startTimeK = performance.now();
        for (let i = 0; i < 50; i++) {
            await textarea.press("k");
        }
        const kTime = performance.now() - startTimeK;

        console.log(`j motion time (50 presses): ${jTime}ms`);
        console.log(`k motion time (50 presses): ${kTime}ms`);
        console.log(
            `Average per motion: ${((jTime + kTime) / 100).toFixed(2)}ms`,
        );

        // Performance target: average should be under 30ms per motion
        // With 1500 lines (10x original test size), this is acceptable
        // and still provides smooth 30+ FPS navigation
        const avgTime = (jTime + kTime) / 100;
        expect(avgTime).toBeLessThan(30);
    });

    test("10j and 10k should be fast on large textareas", async ({ page }) => {
        const textarea = page.locator("#performance-textarea");

        // Enter normal mode
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        // Measure time for count-prefixed motions
        const startTime = performance.now();
        for (let i = 0; i < 5; i++) {
            await textarea.press("1");
            await textarea.press("0");
            await textarea.press("j");
        }
        const countJTime = performance.now() - startTime;

        const startTimeK = performance.now();
        for (let i = 0; i < 5; i++) {
            await textarea.press("1");
            await textarea.press("0");
            await textarea.press("k");
        }
        const countKTime = performance.now() - startTimeK;

        console.log(`10j motion time (5 times): ${countJTime}ms`);
        console.log(`10k motion time (5 times): ${countKTime}ms`);
        console.log(
            `Average per 10-count motion: ${((countJTime + countKTime) / 10).toFixed(2)}ms`,
        );

        // Count motions should also be reasonably fast
        // With 1500 lines, 60ms target is reasonable for 10-line jumps
        const avgTime = (countJTime + countKTime) / 10;
        expect(avgTime).toBeLessThan(60);
    });

    test("gg and G should be fast on large textareas", async ({ page }) => {
        const textarea = page.locator("#performance-textarea");

        // Enter normal mode
        await textarea.press("Escape");
        await page.waitForTimeout(100);

        // Measure time for jumping to start/end
        const startTime = performance.now();
        for (let i = 0; i < 20; i++) {
            await textarea.press("G");
            await textarea.press("g");
            await textarea.press("g");
        }
        const jumpTime = performance.now() - startTime;

        console.log(`gg/G motion time (20 round trips): ${jumpTime}ms`);
        console.log(`Average per jump: ${(jumpTime / 40).toFixed(2)}ms`);

        // Jump motions should be fast
        const avgTime = jumpTime / 40;
        expect(avgTime).toBeLessThan(30);
    });
});
