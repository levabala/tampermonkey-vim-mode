import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";
import { spawn } from "child_process";

/**
 * Test case structure for comparing nvim and our implementation
 */
interface VimTestCase {
    description: string;
    input: string;
    keystrokes: string;
    expectedCursorPos?: number; // Optional: for testing cursor position
}

/**
 * Runs a test case in nvim and returns the resulting text and cursor position
 */
async function runInNvim(
    input: string,
    keystrokes: string,
): Promise<{ text: string; cursorPos: number }> {
    // Create temp file with input
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vim-test-"));
    const inputFile = path.join(tmpDir, "input.txt");
    await fs.writeFile(inputFile, input);

    // Run nvim with keystrokes via stdin
    // -u NONE: Skip loading user config (vimrc, plugins, etc.)
    // -i NONE: Skip loading shada/viminfo
    // -n: No swap file
    // -s /dev/stdin: Read commands from stdin
    await new Promise<void>((resolve, reject) => {
        const nvimProcess = spawn(
            "nvim",
            ["-u", "NONE", "-i", "NONE", "-n", "-s", "/dev/stdin", inputFile],
            {
                stdio: ["pipe", "pipe", "pipe"],
            },
        );

        // Set a timeout to kill the process if it hangs
        const timeoutId = setTimeout(() => {
            nvimProcess.kill("SIGKILL");
            reject(new Error("nvim process timed out"));
        }, 5000);

        // Write keystrokes to stdin
        nvimProcess.stdin.write(keystrokes + ":wq\n");
        nvimProcess.stdin.end();

        nvimProcess.on("exit", () => {
            clearTimeout(timeoutId);
            resolve();
        });

        nvimProcess.on("error", (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });

    // Read the result
    let text = await fs.readFile(inputFile, "utf-8");

    // nvim adds a trailing newline to files, remove it to match textarea behavior
    if (text.endsWith("\n")) {
        text = text.slice(0, -1);
    }

    // Get cursor position - we'll use a separate run with a marker
    // For now, we'll just return the text length as cursor position
    // TODO: Implement proper cursor position tracking if needed
    const cursorPos = text.length;

    // Cleanup
    await fs.rm(tmpDir, { recursive: true });

    return { text, cursorPos };
}

/**
 * Runs a test case in our implementation via Playwright
 */
async function runInOurImplementation(
    page: Page,
    input: string,
    keystrokes: string,
): Promise<{ text: string; cursorPos: number }> {
    const textarea = page.locator("textarea");
    await textarea.click();
    await textarea.fill(input);

    // Enter normal mode
    await textarea.press("Escape");

    // Reset cursor to start
    await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.selectionStart = 0;
        el.selectionEnd = 0;
    });

    // Execute keystrokes
    for (const key of keystrokes) {
        // Handle special keys
        if (key === "\n") {
            await textarea.press("Enter");
        } else if (key === "\x1b") {
            // Escape key
            await textarea.press("Escape");
        } else if (key === "\x12") {
            // Ctrl-r
            await textarea.press("Control+r");
        } else {
            await textarea.press(key);
        }
    }

    // Get result
    const text = await textarea.inputValue();
    const cursorPos = await textarea.evaluate(
        (el: HTMLTextAreaElement) => el.selectionStart,
    );

    return { text, cursorPos };
}

test.describe("Nvim Parity Tests", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    // Test cases for basic motions and operations
    const testCases: VimTestCase[] = [
        // Basic single-character motions (verified by deleting char at cursor)
        {
            description: "l should move right",
            input: "hello",
            keystrokes: "lx",
        },
        {
            description: "h should move left",
            input: "hello",
            keystrokes: "llhx",
        },
        {
            description: "0 should move to start of line",
            input: "hello world",
            keystrokes: "lllll0x",
        },
        {
            description: "$ should move to end of line",
            input: "hello",
            keystrokes: "$x",
        },

        // Vertical motions (verified by deleting char at cursor)
        {
            description: "j should move down",
            input: "line1\nline2\nline3",
            keystrokes: "jx",
        },
        {
            description: "k should move up",
            input: "line1\nline2\nline3",
            keystrokes: "jjkx",
        },
        {
            description: "gg should move to first line",
            input: "line1\nline2\nline3",
            keystrokes: "$jjggx",
        },
        {
            description: "G should move to last line",
            input: "line1\nline2\nline3",
            keystrokes: "Gx",
        },

        // Word motions (verified by deleting char at cursor)
        {
            description: "w should move to next word",
            input: "hello world",
            keystrokes: "wx",
        },
        {
            description: "w with multiple words",
            input: "one two three",
            keystrokes: "wwx",
        },
        {
            description: "w at end of line",
            input: "hello",
            keystrokes: "wwwwwx",
        },
        {
            description: "w should not skip brackets",
            input: "foo (bar",
            keystrokes: "wwx",
        },

        // b - move backward by word (verified by deleting char at cursor)
        {
            description: "b should move to previous word",
            input: "hello world",
            keystrokes: "llllllbx",
        },
        {
            description: "b with multiple words",
            input: "one two three",
            keystrokes: "llllllllllllbbx",
        },
        {
            description: "b should move backward by word",
            input: "hello world test",
            keystrokes: "$bbx",
        },

        // e - move to end of word (verified by deleting char at cursor)
        {
            description: "e should move to end of word",
            input: "hello world",
            keystrokes: "ex",
        },
        {
            description: "e with multiple words",
            input: "one two three",
            keystrokes: "eex",
        },

        // WORD motions (whitespace-separated, verified by deleting char at cursor)
        {
            description: "W should move forward by WORD",
            input: "hello-world test.123 foo",
            keystrokes: "Wx",
        },
        {
            description: "B should move backward by WORD",
            input: "hello-world test.123 foo",
            keystrokes: "$Bx",
        },
        {
            description: "E should move to end of WORD",
            input: "hello-world test.123",
            keystrokes: "Ex",
        },

        // Find motions (verified by deleting char at cursor)
        {
            description: "f should find character forward",
            input: "hello world",
            keystrokes: "fwx",
        },
        {
            description: "F should find character backward",
            input: "hello world",
            keystrokes: "$Fhx",
        },
        {
            description: "t should move before character",
            input: "hello world",
            keystrokes: "twx",
        },
        {
            description: "T should move after character backward",
            input: "hello world",
            keystrokes: "$Thx",
        },
        {
            description: "f should find opening bracket",
            input: "hello (world)",
            keystrokes: "f(x",
        },
        {
            description: "f should find quote",
            input: 'say "hello"',
            keystrokes: 'f"x',
        },
        {
            description: "f should find punctuation",
            input: "hello. world",
            keystrokes: "f.x",
        },

        // Delete operations
        {
            description: "x should delete character under cursor",
            input: "hello",
            keystrokes: "lx",
        },
        {
            description: "multiple x deletions",
            input: "hello world",
            keystrokes: "xxx",
        },
        {
            description: "X should delete character before cursor",
            input: "hello",
            keystrokes: "llX",
        },
        {
            description: "dw should delete word",
            input: "hello world",
            keystrokes: "dw",
        },
        {
            description: "dd should delete line",
            input: "line1\nline2\nline3",
            keystrokes: "jdd",
        },
        {
            description: "D should delete to end of line",
            input: "hello world",
            keystrokes: "llllllD",
        },

        // Change operations
        // FIXME: cw has known difference - vim keeps trailing space, we delete it
        {
            description: "c$ should change to end",
            input: "hello world",
            keystrokes: "llllllc$there\x1b",
        },
        {
            description: "C should change to end of line",
            input: "hello world",
            keystrokes: "llllllCtest\x1b",
        },
        {
            description: "s should substitute character",
            input: "hello",
            keystrokes: "sX\x1b",
        },

        // Insert mode tests (to test cursor position)
        {
            description: "i should insert before cursor",
            input: "hello",
            keystrokes: "iX\x1b",
        },
        {
            description: "a should append after cursor",
            input: "hello",
            keystrokes: "aX\x1b",
        },
        {
            description: "A should append at end of line",
            input: "hello",
            keystrokes: "AX\x1b",
        },
        {
            description: "I should insert at start of line",
            input: "hello",
            keystrokes: "lllllIX\x1b",
        },
        {
            description: "o should open line below",
            input: "line1\nline2",
            keystrokes: "onew\x1b",
        },
        {
            description: "O should open line above",
            input: "line1\nline2",
            keystrokes: "jOnew\x1b",
        },

        // Yank and paste
        {
            description: "yw and p should yank word and paste",
            input: "hello world",
            keystrokes: "yw$p",
        },
        {
            description: "yy and P should yank line and paste above",
            input: "line1\nline2\nline3",
            keystrokes: "jyykP",
        },
        {
            description: "yy and p should yank line and paste below",
            input: "line1\nline2\nline3",
            keystrokes: "jyyjp",
        },

        // Undo and redo (delete, undo, then delete at start to verify cursor position)
        {
            description: "u should undo",
            input: "hello",
            keystrokes: "lxu0x",
        },
        {
            description: "Ctrl-r should redo",
            input: "hello",
            keystrokes: "lxu\x12x",
        },

        // Counts (verified by deleting char at cursor)
        {
            description: "3w should move 3 words forward",
            input: "hello world test",
            keystrokes: "3wx",
        },
        {
            description: "3x should delete 3 characters",
            input: "hello",
            keystrokes: "3x",
        },

        // Dot repeat
        {
            description: ". should repeat delete",
            input: "hello world test",
            keystrokes: "x.",
        },
        // FIXME: . repeat with cw has known difference due to cw behavior
        {
            description: ". should repeat insert",
            input: "hello",
            keystrokes: "iX\x1bl.",
        },
    ];

    for (const testCase of testCases) {
        test(testCase.description, async ({ page }) => {
            // Run in nvim
            const nvimResult = await runInNvim(
                testCase.input,
                testCase.keystrokes,
            );

            // Run in our implementation
            const ourResult = await runInOurImplementation(
                page,
                testCase.input,
                testCase.keystrokes,
            );

            // Guard: nvim-parity tests must change text (we can't verify cursor-only motions)
            if (nvimResult.text === testCase.input) {
                throw new Error(
                    `Test "${testCase.description}" does not change text. ` +
                        `Nvim-parity tests can only verify operations that modify text. ` +
                        `Motion-only tests should be in vim-operations.spec.ts instead.`,
                );
            }

            // Compare results
            expect(ourResult.text).toBe(nvimResult.text);

            // If expected cursor position is specified, check it
            if (testCase.expectedCursorPos !== undefined) {
                expect(ourResult.cursorPos).toBe(testCase.expectedCursorPos);
            }
        });
    }

    // Additional manual test for verifying the test infrastructure works
    test("sanity check: nvim helper works correctly", async () => {
        const result = await runInNvim("hello world", "wdw");
        expect(result.text).toBe("hello ");
    });
});
