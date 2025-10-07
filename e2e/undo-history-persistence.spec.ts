import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Undo History Persistence", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should preserve undo history after blur and refocus", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Focus textarea (starts in insert mode)
        await textarea.click();

        // Clear and type some text
        await textarea.fill("hello world");

        // Enter normal mode
        await textarea.press("Escape");

        // Position at start
        await textarea.press("0");

        // Delete first word (dw)
        await textarea.press("d");
        await textarea.press("w");

        // Verify text changed (should be "world" with cursor at 'w')
        let content = await textarea.inputValue();
        expect(content).toBe("world");

        // Blur the textarea (focus something else)
        await page.locator("body").click();
        await page.waitForTimeout(100);

        // Refocus the textarea
        await textarea.click();
        await page.waitForTimeout(100);

        // Should be in insert mode after refocus, go to normal mode
        await textarea.press("Escape");

        // Now undo - should restore the deleted word
        await textarea.press("u");

        // Verify undo worked
        content = await textarea.inputValue();
        expect(content).toBe("hello world");
    });

    test("should preserve undo history across multiple blur/refocus cycles", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Start fresh - use fill to clear and create baseline
        await textarea.click();
        await textarea.fill("base");
        await textarea.press("Escape");

        // Delete everything to create an undo point
        await textarea.press("0");
        await textarea.press("d");
        await textarea.press("$");

        // Verify empty
        let content = await textarea.inputValue();
        expect(content).toBe("");

        // Blur and refocus
        await page.locator("body").click();
        await page.waitForTimeout(100);
        await textarea.click();
        await textarea.press("Escape");

        // Make first change - insert "one"
        await textarea.press("i");
        await textarea.type("one");
        await textarea.press("Escape");

        // Verify first change
        content = await textarea.inputValue();
        expect(content).toBe("one");

        // Blur and refocus
        await page.locator("body").click();
        await page.waitForTimeout(100);
        await textarea.click();
        await textarea.press("Escape");

        // Make second change - append " two"
        await textarea.press("$"); // Go to end
        await textarea.press("a"); // Append after cursor
        await textarea.type(" two");
        await textarea.press("Escape");

        // Verify current state
        content = await textarea.inputValue();
        expect(content).toBe("one two");

        // Blur and refocus again
        await page.locator("body").click();
        await page.waitForTimeout(100);
        await textarea.click();
        await textarea.press("Escape");

        // Undo should work for the second change
        await textarea.press("u");
        content = await textarea.inputValue();
        expect(content).toBe("one");

        // Undo should work for the first change
        await textarea.press("u");
        content = await textarea.inputValue();
        expect(content).toBe("");
    });

    test("should maintain separate undo history for different inputs", async ({
        page,
    }) => {
        const textarea1 = page.locator("#large-textarea");
        const textarea2 = page.locator("#small-textarea");

        // Make change in first textarea
        await textarea1.click();
        await textarea1.fill("alpha beta");
        await textarea1.press("Escape");
        await textarea1.press("0"); // Go to start
        await textarea1.press("d");
        await textarea1.press("w");

        let content1 = await textarea1.inputValue();
        expect(content1).toBe("beta");

        // Switch to second textarea and make change
        await textarea2.click();
        await textarea2.fill("gamma delta");
        await textarea2.press("Escape");
        await textarea2.press("0"); // Go to start
        await textarea2.press("d");
        await textarea2.press("w");

        let content2 = await textarea2.inputValue();
        expect(content2).toBe("delta");

        // Undo in textarea2
        await textarea2.press("u");
        content2 = await textarea2.inputValue();
        expect(content2).toBe("gamma delta");

        // Switch back to textarea1 and undo
        await textarea1.click();
        await textarea1.press("Escape");
        await textarea1.press("u");

        content1 = await textarea1.inputValue();
        expect(content1).toBe("alpha beta");

        // Verify textarea2 is still at "gamma delta"
        content2 = await textarea2.inputValue();
        expect(content2).toBe("gamma delta");
    });
});
