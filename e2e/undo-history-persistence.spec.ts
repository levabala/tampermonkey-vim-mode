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

        // Type some text
        await textarea.fill("first line");

        // Enter normal mode
        await textarea.press("Escape");

        // Make a change in normal mode (delete word)
        await textarea.press("d");
        await textarea.press("w");

        // Verify text changed
        let content = await textarea.inputValue();
        expect(content).toBe("line");

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
        expect(content).toBe("first line");
    });

    test("should preserve undo history across multiple blur/refocus cycles", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Make first change
        await textarea.click();
        await textarea.fill("change1");
        await textarea.press("Escape");

        // Blur and refocus
        await page.locator("body").click();
        await page.waitForTimeout(100);
        await textarea.click();
        await textarea.press("Escape");

        // Make second change
        await textarea.press("A"); // Append at end
        await textarea.type(" change2");
        await textarea.press("Escape");

        // Verify current state
        let content = await textarea.inputValue();
        expect(content).toBe("change1 change2");

        // Blur and refocus again
        await page.locator("body").click();
        await page.waitForTimeout(100);
        await textarea.click();
        await textarea.press("Escape");

        // Undo should work for both changes
        await textarea.press("u");
        content = await textarea.inputValue();
        expect(content).toBe("change1");

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
        await textarea1.fill("textarea1");
        await textarea1.press("Escape");
        await textarea1.press("d");
        await textarea1.press("w");

        let content1 = await textarea1.inputValue();
        expect(content1).toBe("");

        // Switch to second textarea and make change
        await textarea2.click();
        await textarea2.fill("textarea2");
        await textarea2.press("Escape");
        await textarea2.press("d");
        await textarea2.press("w");

        let content2 = await textarea2.inputValue();
        expect(content2).toBe("");

        // Undo in textarea2
        await textarea2.press("u");
        content2 = await textarea2.inputValue();
        expect(content2).toBe("textarea2");

        // Switch back to textarea1 and undo
        await textarea1.click();
        await textarea1.press("Escape");
        await textarea1.press("u");

        content1 = await textarea1.inputValue();
        expect(content1).toBe("textarea1");

        // Verify textarea2 is still at "textarea2"
        content2 = await textarea2.inputValue();
        expect(content2).toBe("textarea2");
    });
});
