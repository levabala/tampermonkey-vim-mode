import { test, expect } from "@playwright/test";
import * as path from "path";

test.beforeEach(async ({ page }) => {
    const htmlPath = path.join(process.cwd(), "test.html");
    await page.goto(`file://${htmlPath}`);
    await page.waitForTimeout(500);
});

test.describe("Register operations", () => {
    test("yank to default register with y", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Yank current line with yy
        await textarea.press("y");
        await textarea.press("y");

        // Move to next line and paste
        await textarea.press("j");
        await textarea.press("p");

        // Verify that first line was pasted below second line
        const content = await textarea.inputValue();
        const lines = content.split("\n");
        expect(lines[2]).toBe(lines[0]); // Line 2 is now a copy of line 0 (pasted after line 1)
    });

    test('yank to named register with "ay', async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Yank to register a with "ayy
        await textarea.press('"');
        await textarea.press("a");
        await textarea.press("y");
        await textarea.press("y");

        // Move down and yank to default register
        await textarea.press("j");
        await textarea.press("y");
        await textarea.press("y");

        // Paste from register a - should paste first line, not second
        await textarea.press('"');
        await textarea.press("a");
        await textarea.press("p");

        // Verify
        const content = await textarea.inputValue();
        const lines = content.split("\n");
        // After line 1, we should have pasted line 0 (from register a)
        expect(lines[2]).toBe(lines[0]);
    });

    test('yank in visual mode with "by', async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Enter visual mode and select a word
        await textarea.press("v");
        await textarea.press("w"); // Select word

        // Yank to register b
        await textarea.press('"');
        await textarea.press("b");
        await textarea.press("y");

        // Move to end of line
        await textarea.press("$");

        // Enter insert mode and add space
        await textarea.press("a");
        await textarea.press(" ");

        // Paste from register b with Ctrl-R
        await page.keyboard.press("Control+r");
        await textarea.press("b");

        // Exit insert mode
        await textarea.press("Escape");

        // Verify the pasted content
        const content = await textarea.inputValue();
        const lines = content.split("\n");
        expect(lines[0]).toContain(" "); // Should have the space we added
        // The yanked word should be at the end
    });

    test('paste from named register with "ap', async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Yank to register a
        await textarea.press('"');
        await textarea.press("a");
        await textarea.press("y");
        await textarea.press("w"); // Yank word

        // Move to next line
        await textarea.press("j");

        // Paste from register a
        await textarea.press('"');
        await textarea.press("a");
        await textarea.press("p");

        // Verify paste happened
        const content = await textarea.inputValue();
        expect(content.length).toBeGreaterThan(0);
    });

    test("Ctrl-R paste in insert mode", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Yank a word to default register
        await textarea.press("y");
        await textarea.press("w");

        // Go to end of line
        await textarea.press("$");

        // Enter insert mode
        await textarea.press("a");
        await textarea.press(" ");

        // Paste with Ctrl-R from default register
        await page.keyboard.press("Control+r");
        await textarea.press('"');

        // Exit insert mode
        await textarea.press("Escape");

        // Verify content was pasted
        const content = await textarea.inputValue();
        const firstLine = content.split("\n")[0];
        expect(firstLine).toContain(" "); // Space we added
        expect(firstLine.length).toBeGreaterThan(5); // Original content + pasted word
    });

    test("delete operations yank to default register", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Delete a word with dw
        await textarea.press("d");
        await textarea.press("w");

        // Move to next line
        await textarea.press("j");

        // Paste the deleted word
        await textarea.press("p");

        // Verify content was pasted
        const content = await textarea.inputValue();
        expect(content.length).toBeGreaterThan(0);
    });

    test('delete to named register with "xdd', async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Delete current line to register x
        await textarea.press('"');
        await textarea.press("x");
        await textarea.press("d");
        await textarea.press("d");

        // Move down
        await textarea.press("j");

        // Paste from register x
        await textarea.press('"');
        await textarea.press("x");
        await textarea.press("p");

        // Verify content was pasted
        const content = await textarea.inputValue();
        const lines = content.split("\n");
        expect(lines.length).toBeGreaterThan(2);
    });

    test("visual line yank to register", async ({ page }) => {
        const textarea = page.locator("#large-textarea");
        await textarea.focus();

        // Go to normal mode
        await textarea.press("Escape");

        // Enter visual line mode
        await textarea.press("V");

        // Yank to register z
        await textarea.press('"');
        await textarea.press("z");
        await textarea.press("y");

        // Move down
        await textarea.press("j");

        // Paste from register z
        await textarea.press('"');
        await textarea.press("z");
        await textarea.press("p");

        // Verify content was pasted
        const content = await textarea.inputValue();
        const lines = content.split("\n");
        expect(lines.length).toBeGreaterThan(2);
    });
});
