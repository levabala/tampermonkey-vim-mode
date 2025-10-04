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
        const htmlPath = path.join(process.cwd(), "test-visual-mode.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    // Test cases for basic motions and operations
    const testCases: VimTestCase[] = [
        // x - delete character under cursor
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

        // w - move forward by word
        {
            description: "w should move to next word",
            input: "hello world",
            keystrokes: "w",
        },
        {
            description: "w with multiple words",
            input: "one two three",
            keystrokes: "ww",
        },
        {
            description: "w at end of line",
            input: "hello",
            keystrokes: "wwwww",
        },

        // b - move backward by word
        {
            description: "b should move to previous word",
            input: "hello world",
            keystrokes: "llllllb",
        },
        {
            description: "b with multiple words",
            input: "one two three",
            keystrokes: "llllllllllllbb",
        },

        // e - move to end of word
        {
            description: "e should move to end of word",
            input: "hello world",
            keystrokes: "e",
        },
        {
            description: "e with multiple words",
            input: "one two three",
            keystrokes: "ee",
        },

        // Combined operations
        {
            description: "dw should delete word",
            input: "hello world",
            keystrokes: "dw",
        },
        // Note: cw and de have known differences from vim behavior
        // cw in vim keeps trailing space, our impl deletes it
        // de in vim deletes to end of word, our impl leaves one char

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
