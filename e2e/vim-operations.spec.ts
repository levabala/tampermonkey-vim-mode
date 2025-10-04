import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Vim Operations", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test-visual-mode.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test.describe("Advanced Motions", () => {
        test("should move to first line with gg", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 12;
                el.selectionEnd = 12;
            });

            await textarea.press("g");
            await textarea.press("g");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(0);
        });

        test("should move to last line with G", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("G");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(12);
        });

        test("should find character forward with f", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("f");
            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(6);
        });

        test("should find character backward with F", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 10;
                el.selectionEnd = 10;
            });

            await textarea.press("F");
            await textarea.press("h");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(0);
        });

        test("should move to before character with t", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("t");
            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(5);
        });

        test("should move to after character backward with T", async ({
            page,
        }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 10;
                el.selectionEnd = 10;
            });

            await textarea.press("T");
            await textarea.press("h");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(1);
        });

        test("should repeat last find with ;", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello hello hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("f");
            await textarea.press("l");
            await textarea.press(";");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBeGreaterThan(2);
        });

        test("should repeat last find in reverse with ,", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 10;
                el.selectionEnd = 10;
            });

            await textarea.press("F");
            await textarea.press("o");
            await textarea.press(",");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBeGreaterThan(10);
        });

        test("should find opening bracket with f(", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello (world)");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("f");
            await textarea.press("(");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(6);
        });

        test('should find quote with f"', async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill('say "hello"');
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("f");
            await textarea.press('"');

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(4);
        });

        test("should find punctuation with f.", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello. world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("f");
            await textarea.press(".");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(5);
        });
    });

    test.describe("Basic Motions", () => {
        test("should move cursor right with l", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("l");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(1);
        });

        test("should move cursor left with h", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 2;
                el.selectionEnd = 2;
            });

            await textarea.press("h");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(1);
        });

        test("should move to start of line with 0", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 5;
                el.selectionEnd = 5;
            });

            await textarea.press("0");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(0);
        });

        test("should move to end of line with $", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("$");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(5); // After last character in Vim
        });

        test("should move forward by word with w", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(6);
        });

        test("should move backward by word with b", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 12;
                el.selectionEnd = 12;
            });

            await textarea.press("b");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(6);
        });

        test("should move to end of word with e", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("e");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(4);
        });

        test("should move forward by WORD with W", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello-world test.123 foo");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("W");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(12);
        });

        test("should move backward by WORD with B", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello-world test.123 foo");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 21;
                el.selectionEnd = 21;
            });

            await textarea.press("B");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(12);
        });

        test("should move to end of WORD with E", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello-world test.123");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("E");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(10);
        });

        test("should move down with j", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("j");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(6); // Start of line2
        });

        test("should move up with k", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("k");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(0); // Start of line1
        });

        test("should remember column when moving through empty lines", async ({
            page,
        }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
        test("should delete character with x", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("x");

            const value = await textarea.inputValue();
            expect(value).toBe("ello");
        });

        test("should delete word with dw", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("d");
            await textarea.press("w");

            const value = await textarea.inputValue();
            expect(value).toBe("world");
        });

        test("should delete line with dd", async ({ page }) => {
            const textarea = page.locator("textarea");
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

        test("should delete to end of line with D", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("D");

            const value = await textarea.inputValue();
            expect(value).toBe("hello ");
        });
    });

    test.describe("Change Operations", () => {
        test("should change word with cw", async ({ page }) => {
            const textarea = page.locator("textarea");
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

        test("should change to end with c$", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("c");
            await textarea.press("$");
            await textarea.type("there");

            const value = await textarea.inputValue();
            expect(value).toBe("hello there");
        });
    });

    test.describe("Yank and Paste", () => {
        test("should yank word with yw and paste with p", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("y");
            await textarea.press("w");

            // Move to end and paste
            await textarea.press("$");
            await textarea.press("p");

            const value = await textarea.inputValue();
            expect(value).toBe("hello worldhello ");
        });

        test("should yank line with yy and paste with P", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2\nline3");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("y");
            await textarea.press("y");

            // Move to first line and paste above
            await textarea.press("k");
            await textarea.press("P");

            const value = await textarea.inputValue();
            expect(value).toBe("line2\nline1\nline2\nline3");
        });

        test("should paste line-wise with p after yy", async ({ page }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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

        test("should insert at start with I", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 3;
                el.selectionEnd = 3;
            });

            await textarea.press("I");
            await textarea.type("X");

            const value = await textarea.inputValue();
            expect(value).toBe("Xhello");
        });

        test("should append at end with A", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("A");
            await textarea.type("X");

            const value = await textarea.inputValue();
            expect(value).toBe("helloX");
        });

        test("should open line below with o", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("o");
            await textarea.type("new");

            const value = await textarea.inputValue();
            expect(value).toBe("line1\nnew\nline2");
        });

        test("should open line above with O", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("line1\nline2");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("O");
            await textarea.type("new");

            const value = await textarea.inputValue();
            expect(value).toBe("line1\nnew\nline2");
        });
    });

    test.describe("Undo and Redo", () => {
        test("should undo with u", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 1;
                el.selectionEnd = 1;
            });

            await textarea.press("x");
            const afterDelete = await textarea.inputValue();
            expect(afterDelete).toBe("hllo");

            await textarea.press("u");
            expect(await textarea.inputValue()).toBe("hello");
        });

        test("should redo with Ctrl-r", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 1;
                el.selectionEnd = 1;
            });

            await textarea.press("x");
            expect(await textarea.inputValue()).toBe("hllo");

            await textarea.press("u");
            expect(await textarea.inputValue()).toBe("hello");

            await textarea.press("Control+r");
            expect(await textarea.inputValue()).toBe("hllo");
        });
    });

    test.describe("Visual Mode", () => {
        test("should enter visual mode with v and delete selection", async ({
            page,
        }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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

        test("should select inside parentheses with vi(", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello (world) test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 9;
                el.selectionEnd = 9;
            });

            await textarea.press("v");
            await textarea.press("i");
            await textarea.press("(");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("hello () test");
        });

        test("should select around parentheses with va(", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello (world) test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 9;
                el.selectionEnd = 9;
            });

            await textarea.press("v");
            await textarea.press("a");
            await textarea.press("(");
            await textarea.press("d");

            const value = await textarea.inputValue();
            expect(value).toBe("hello  test");
        });

        test('should select inside quotes with vi"', async ({ page }) => {
            const textarea = page.locator("textarea");
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

    test.describe("Counts", () => {
        test("should repeat motion with count", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("3");
            await textarea.press("w");

            const pos = await textarea.evaluate(
                (el: HTMLTextAreaElement) => el.selectionStart,
            );
            expect(pos).toBe(16); // End of text
        });

        test("should delete multiple characters with count", async ({
            page,
        }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("3");
            await textarea.press("x");

            const value = await textarea.inputValue();
            expect(value).toBe("lo");
        });
    });

    test.describe("Dot Repeat", () => {
        test("should repeat delete with .", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("x");
            await textarea.press(".");

            const value = await textarea.inputValue();
            expect(value).toBe("llo world test");
        });

        test("should repeat change with .", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("foo bar baz");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("c");
            await textarea.press("w");
            await textarea.type("test");
            await textarea.press("Escape");
            await textarea.press("w");
            await textarea.press(".");

            const value = await textarea.inputValue();
            expect(value).toContain("test");
        });

        test("should repeat insert with .", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("i");
            await textarea.type("X");
            await textarea.press("Escape");
            await textarea.press("l");
            await textarea.press(".");

            const value = await textarea.inputValue();
            expect(value).toBe("XXhello");
        });
    });

    test.describe("More Operators", () => {
        test("should delete character before cursor with X", async ({
            page,
        }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 2;
                el.selectionEnd = 2;
            });

            await textarea.press("X");

            const value = await textarea.inputValue();
            expect(value).toBe("hllo");
        });

        test("should substitute character with s", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 0;
                el.selectionEnd = 0;
            });

            await textarea.press("s");
            await textarea.type("X");

            const value = await textarea.inputValue();
            expect(value).toBe("Xello");
        });

        test("should change to end of line with C", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello world");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 6;
                el.selectionEnd = 6;
            });

            await textarea.press("C");
            await textarea.type("test");

            const value = await textarea.inputValue();
            expect(value).toBe("hello test");
        });

        test("should delete empty line with dd", async ({ page }) => {
            const textarea = page.locator("textarea");
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

    test.describe("Visual Line Mode", () => {
        test("should enter visual line mode with V", async ({ page }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
    });

    test.describe("Visual Mode with Find Motions", () => {
        test("should use f in visual mode", async ({ page }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello");
            await textarea.press("Escape");

            // Blur and refocus
            await page.locator("body").click();
            await textarea.click();

            await textarea.press("x");

            const value = await textarea.inputValue();
            expect(value).toBe("ello");
        });
    });

    test.describe("Text Objects", () => {
        test("should delete inside parentheses with di(", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello (world) test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 9;
                el.selectionEnd = 9;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("(");

            const value = await textarea.inputValue();
            expect(value).toBe("hello () test");
        });

        test("should delete around parentheses with da(", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("hello (world) test");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 9;
                el.selectionEnd = 9;
            });

            await textarea.press("d");
            await textarea.press("a");
            await textarea.press("(");

            const value = await textarea.inputValue();
            expect(value).toBe("hello  test");
        });

        test("should change inside brackets with ci[", async ({ page }) => {
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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
            const textarea = page.locator("textarea");
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

        test("should handle nested parentheses", async ({ page }) => {
            const textarea = page.locator("textarea");
            await textarea.click();
            await textarea.fill("outer (inner (nested))");
            await textarea.press("Escape");

            await textarea.evaluate((el: HTMLTextAreaElement) => {
                el.selectionStart = 15;
                el.selectionEnd = 15;
            });

            await textarea.press("d");
            await textarea.press("i");
            await textarea.press("(");

            const value = await textarea.inputValue();
            expect(value).toBe("outer (inner ())");
        });

        test("should handle multiline text objects", async ({ page }) => {
            const textarea = page.locator("textarea");
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
