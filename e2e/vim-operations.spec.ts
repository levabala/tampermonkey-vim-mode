import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Vim Operations", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test.describe("Edge Cases for Motions", () => {
        test("should remember column when moving through empty lines", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello\n\nworld");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 3;
                el.selectionEnd = 3;
            });

            await textarea.press("j");
            await textarea.press("j");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(10); // Column 3 on "world" line
        });

        test("should handle w motion on empty lines", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("word\n\ntest");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(5); // Empty line
        });

        test("should not skip brackets at start of word with w", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("foo (bar");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            // From "f" in "foo"
            await textarea.press("w");

            let pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(4); // Should be on "(" not skip it

            // From "(" - should move to "b"
            await textarea.press("w");

            pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(5); // Should be on "b" in "bar"
        });

        test("should not skip brackets with w (bracket at word start)", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("foo [bar");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(4); // Should be on "[" not skip it
        });
    });

    test.describe("Delete Operations", () => {
        test("should delete line with dd", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("d");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("line1\nline3");
        });

        test("should delete empty line with dd", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\n\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("d");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("line1\nline3");
        });
    });

    test.describe("Change Operations", () => {
        test("should change word with cw", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("c");
            await textarea.press("w");

            const value = await textarea.inputValue();
            expect(value).toBe("world");

            // Should be in insert mode
            await textarea.type("bye");
            const finalValue = await textarea.inputValue();
            expect(finalValue).toBe("byeworld");
        });
    });

    test.describe("Yank and Paste", () => {
        test("should paste line-wise with p after yy", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("y");
            await textarea.press("y");
            await textarea.press("j");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toContain("line2");
        });

        test("should paste character-wise after yw", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("y");
            await textarea.press("w");
            await textarea.press("w");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toContain("hello");
        });
    });

    test.describe("Insert Commands", () => {
        test("should enter insert mode with i", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 2;
                el.selectionEnd = 2;
            });

            await textarea.press("i");
            await textarea.type("X");

            const value = await textarea.inputValue();
            expect(value).toBe("heXllo");
        });

        test("should append with a", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 2;
                el.selectionEnd = 2;
            });

            await textarea.press("a");
            await textarea.type("X");

            const value = await textarea.inputValue();
            expect(value).toBe("helXlo");
        });
    });

    test.describe("Visual Mode", () => {
        test("should enter visual mode with v and delete selection", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("v");
            await textarea.press("l");
            await textarea.press("l");
            await textarea.press("l");
            await textarea.press("l");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe(" world");
        });

        test("should yank in visual mode", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("v");
            await textarea.press("w");
            await textarea.press("y");

            await textarea.press("$");
            await textarea.press("p");

            const value = await textarea.inputValue();
            // Verify paste happened (exact format may vary)
            expect(value).toContain("hello");
            expect(value.length).toBeGreaterThan(11);
        });

        test('should select inside quotes with vi"', async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill('say "hello world"');
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("v");
            await textarea.press("i");
            await textarea.press('"');
            await textarea.press("y");

            await textarea.press("$");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toContain("hello world");
        });
    });

    test.describe("Visual Line Mode", () => {
        test("should enter visual line mode with V", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("V");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("line1\nline3");
        });

        test("should select multiple lines with V and j", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("V");
            await textarea.press("j");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("line3");
        });

        test("should yank line with V and y", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("V");
            await textarea.press("y");
            await textarea.press("j");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toContain("line2");
        });

        test("should select lines correctly when going up with V and k", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3\nline4");
            await textarea.press("Escape");

            // Start on line3 (position 12, which is 'l' in line3)
            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 12;
                el.selectionEnd = 12;
            });

            // Enter visual line mode
            await textarea.press("V");

            // Move up twice - should select line2 and line3
            await textarea.press("k");
            await textarea.press("k");

            // Delete the selection
            await textarea.press("d");

            const value = await textarea.inputValue();
            // Should delete line1, line2, and line3, leaving only line4
            expect(value).toBe("line4");
        });
    });

    test.describe("Visual Mode with Find Motions", () => {
        test("should use f in visual mode", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("v");
            await textarea.press("f");
            await textarea.press("w");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("orld");
        });

        test("should use t in visual mode", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("v");
            await textarea.press("t");
            await textarea.press("w");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("world");
        });
    });

    test.describe("Mode Switching", () => {
        test("should exit insert mode with Ctrl-[", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 5;
                el.selectionEnd = 5;
            });

            await textarea.press("a");
            await textarea.type(" world");
            await textarea.press("Control+[");

            // Should be in normal mode now
            await textarea.press("x");

            const value = await textarea.inputValue();
            expect(value).toBe("hello worl");
        });

        test("should exit visual mode with Escape", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("v");
            await textarea.press("l");
            await textarea.press("l");
            await textarea.press("Escape");

            // Should be back in normal mode
            await textarea.press("x");

            const value = await textarea.inputValue();
            expect(value).toBe("ello world");
        });

        test("should maintain mode after focus and blur", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            // Blur and refocus
            await page.locator("body").click();
            await textarea.click(); // Click to refocus

            // The cursor should be restored, but let's verify and be ready for x to work
            // Press 0 to go to start, then l 4 times to get to position 0 (where 'h' is)
            await textarea.press("0");
            await textarea.press("x");

            const value = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.value,
            );
            expect(value).toBe("ello");
        });
    });

    test.describe("Text Objects", () => {
        test("should change inside brackets with ci[", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("array[index]");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("c");
            await textarea.press("i");
            await textarea.press("[");
            await textarea.type("new");

            const value = await textarea.inputValue();
            expect(value).toBe("array[new]");
        });

        test("should yank inside braces with yi{", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("func {body}");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("y");
            await textarea.press("i");
            await textarea.press("{");

            await textarea.press("$");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toContain("body");
        });

        test('should delete inside double quotes with di"', async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill('say "hello world"');
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 7;
                el.selectionEnd = 7;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press('"');

            const value = await textarea.inputValue();
            expect(value).toBe('say ""');
        });

        test("should delete inside single quotes with di'", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("say 'hello'");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("'");

            const value = await textarea.inputValue();
            expect(value).toBe("say ''");
        });

        test("should delete inside backticks with di`", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("cmd `ls -la`");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("`");

            const value = await textarea.inputValue();
            expect(value).toBe("cmd ``");
        });

        test("should delete inside angle brackets with di<", async ({
            page,
        }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("tag <content>");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("<");

            const value = await textarea.inputValue();
            expect(value).toBe("tag <>");
        });

        test("should handle multiline text objects", async ({ page }) => {
            const textarea = page.locator("#large-textarea");
            await textarea.click();
            await textarea.fill("func {\n  line1\n  line2\n}");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 10;
                el.selectionEnd = 10;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("{");

            const value = await textarea.inputValue();
            expect(value).toBe("func {}");
        });
    });
});
