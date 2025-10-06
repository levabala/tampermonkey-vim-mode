import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Multi-Wrap Line Caret Position", () => {
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(1000); // Give script more time to initialize
    });

    test("should correctly position caret across multi-wrap lines", async ({
        page,
    }) => {
        const textarea = page.locator("#large-textarea");

        // Click into textarea and enter normal mode
        await textarea.click();
        await page.keyboard.press("Escape");

        // Go to beginning of document
        await page.keyboard.press("g");
        await page.keyboard.press("g");

        // Get the content and find line 2 (which wraps multiple times)
        const fullContent = await textarea.inputValue();
        const lines = fullContent.split("\n");

        // Line 2: "Simple: foo(bar)baz and [hello] and {world} and <test> and "quotes" and 'single' and `backticks`"
        const line2Index = lines[0].length + 1; // After line 1 + newline
        const line2 = lines[1];

        console.log(`\n=== Testing Line 2 (wraps multiple times) ===`);
        console.log(`Line 2: "${line2}"`);
        console.log(`Length: ${line2.length} characters\n`);

        // Helper function to create mirror element and measure position
        const getMirrorPosition = async (charIndex: number) => {
            return await page.evaluate(
                ({ textareaSelector, index }) => {
                    const textarea = document.querySelector(
                        textareaSelector,
                    ) as HTMLTextAreaElement;
                    if (!textarea) throw new Error("Textarea not found");

                    const mirror = document.createElement("div");
                    const computed = window.getComputedStyle(textarea);

                    mirror.style.cssText = `
                        position: absolute;
                        top: -9999px;
                        left: -9999px;
                        width: ${computed.width};
                        height: ${computed.height};
                        font-family: ${computed.fontFamily};
                        font-size: ${computed.fontSize};
                        font-weight: ${computed.fontWeight};
                        line-height: ${computed.lineHeight};
                        letter-spacing: ${computed.letterSpacing};
                        padding: ${computed.padding};
                        border: ${computed.border};
                        box-sizing: ${computed.boxSizing};
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        overflow: hidden;
                    `;

                    document.body.appendChild(mirror);

                    try {
                        const text = textarea.value;
                        const beforeText = text.substring(0, index);
                        const charAtIndex = text[index] || "";

                        mirror.textContent = beforeText;
                        const span = document.createElement("span");
                        span.textContent = charAtIndex || "X";
                        span.style.position = "relative";
                        mirror.appendChild(span);

                        const afterSpan = document.createTextNode(
                            text.substring(index + 1),
                        );
                        mirror.appendChild(afterSpan);

                        const rect = span.getBoundingClientRect();
                        const mirrorRect = mirror.getBoundingClientRect();

                        const position = {
                            x: rect.left - mirrorRect.left,
                            y: rect.top - mirrorRect.top,
                            width: rect.width,
                            height: rect.height,
                        };

                        return position;
                    } finally {
                        document.body.removeChild(mirror);
                    }
                },
                { textareaSelector: "#large-textarea", index: charIndex },
            );
        };

        // Helper to get custom caret position
        const getCaretPosition = async () => {
            return await page.evaluate(() => {
                const textarea = document.querySelector(
                    "#large-textarea",
                ) as HTMLTextAreaElement;
                const caret = document.querySelector(
                    'div[style*="mix-blend-mode: difference"][style*="position: absolute"]',
                ) as HTMLElement;
                if (!caret || !textarea) return null;

                const caretRect = caret.getBoundingClientRect();
                const textareaRect = textarea.getBoundingClientRect();

                const computed = window.getComputedStyle(textarea);
                const paddingLeft = parseFloat(computed.paddingLeft || "0");
                const paddingTop = parseFloat(computed.paddingTop || "0");

                return {
                    left: caretRect.left - textareaRect.left - paddingLeft,
                    top: caretRect.top - textareaRect.top - paddingTop,
                };
            });
        };

        // Navigate to line 2 start using vim commands
        await page.keyboard.press("j"); // Move to line 2
        await page.keyboard.press("0"); // Go to start of line
        await page.waitForTimeout(100);

        // Walk through every character in line 2 using vim motions
        const positions: {
            charIndex: number;
            char: string;
            mirrorX: number;
            mirrorY: number;
            caretX: number;
            caretY: number;
        }[] = [];

        // Get padding once to adjust mirror coordinates
        const padding = await page.evaluate(() => {
            const textarea = document.querySelector(
                "#large-textarea",
            ) as HTMLTextAreaElement;
            const computed = window.getComputedStyle(textarea);
            return {
                left: parseFloat(computed.paddingLeft || "0"),
                top: parseFloat(computed.paddingTop || "0"),
            };
        });

        for (let i = 0; i < line2.length; i++) {
            const globalIndex = line2Index + i;
            const char = line2[i];

            // Use 'l' to move right in normal mode (except for first position)
            if (i > 0) {
                await page.keyboard.press("l");
                await page.waitForTimeout(50); // Give caret time to update
            }

            // Verify cursor position matches expected
            const actualPos = await textarea.evaluate(
                (el) => (el as HTMLTextAreaElement).selectionStart,
            );

            if (actualPos !== globalIndex) {
                console.log(
                    `Warning: Expected cursor at ${globalIndex}, but got ${actualPos} (char ${i})`,
                );
            }

            const mirrorPos = await getMirrorPosition(globalIndex);
            const caretPos = await getCaretPosition();

            if (mirrorPos && caretPos) {
                // Adjust mirror position to be relative to content area (same as caret)
                // Mirror measures from border box, so subtract padding to get content-relative
                positions.push({
                    charIndex: i,
                    char: char,
                    mirrorX: mirrorPos.x - padding.left,
                    mirrorY: mirrorPos.y - padding.top,
                    caretX: caretPos.left,
                    caretY: caretPos.top,
                });
            }
        }

        // Detect wrap points (mirror-based = actual text wraps)
        console.log("=== Mirror Wrap Points (Actual Text Wraps) ===");
        const mirrorWrapPoints: number[] = [];
        let currentMirrorY = positions[0]?.mirrorY;

        for (let i = 1; i < positions.length; i++) {
            if (Math.abs(positions[i].mirrorY - currentMirrorY) > 5) {
                mirrorWrapPoints.push(i);
                currentMirrorY = positions[i].mirrorY;

                // Show context around wrap
                const beforeIdx = Math.max(0, i - 10);
                const afterIdx = Math.min(positions.length - 1, i + 5);

                console.log(`\nMirror wrap at character ${i}:`);
                console.log(`  Before wrap (chars ${beforeIdx}-${i - 1}):`);
                for (let j = beforeIdx; j < i; j++) {
                    const p = positions[j];
                    const charDisplay =
                        p.char === " "
                            ? "SPACE"
                            : p.char === "\n"
                              ? "\\n"
                              : p.char;
                    console.log(
                        `    [${j}] '${charDisplay}': mirror=(${p.mirrorX.toFixed(1)}, ${p.mirrorY.toFixed(1)}) caret=(${p.caretX.toFixed(1)}, ${p.caretY.toFixed(1)})`,
                    );
                }

                console.log(`  After wrap (chars ${i}-${afterIdx}):`);
                for (let j = i; j <= afterIdx; j++) {
                    const p = positions[j];
                    const charDisplay =
                        p.char === " "
                            ? "SPACE"
                            : p.char === "\n"
                              ? "\\n"
                              : p.char;
                    console.log(
                        `    [${j}] '${charDisplay}': mirror=(${p.mirrorX.toFixed(1)}, ${p.mirrorY.toFixed(1)}) caret=(${p.caretX.toFixed(1)}, ${p.caretY.toFixed(1)})`,
                    );
                }
            }
        }

        // Detect when caret Y position changes
        console.log(
            "\n=== Caret Wrap Points (When Caret Jumps to Next Line) ===",
        );
        const caretWrapPoints: number[] = [];
        let currentCaretY = positions[0]?.caretY;

        for (let i = 1; i < positions.length; i++) {
            if (Math.abs(positions[i].caretY - currentCaretY) > 5) {
                caretWrapPoints.push(i);
                currentCaretY = positions[i].caretY;

                const beforeIdx = Math.max(0, i - 10);
                const afterIdx = Math.min(positions.length - 1, i + 5);

                console.log(`\nCaret wrap at character ${i}:`);
                console.log(
                    `  Before caret wrap (chars ${beforeIdx}-${i - 1}):`,
                );
                for (let j = beforeIdx; j < i; j++) {
                    const p = positions[j];
                    const charDisplay =
                        p.char === " "
                            ? "SPACE"
                            : p.char === "\n"
                              ? "\\n"
                              : p.char;
                    console.log(
                        `    [${j}] '${charDisplay}': mirror=(${p.mirrorX.toFixed(1)}, ${p.mirrorY.toFixed(1)}) caret=(${p.caretX.toFixed(1)}, ${p.caretY.toFixed(1)})`,
                    );
                }

                console.log(`  After caret wrap (chars ${i}-${afterIdx}):`);
                for (let j = i; j <= afterIdx; j++) {
                    const p = positions[j];
                    const charDisplay =
                        p.char === " "
                            ? "SPACE"
                            : p.char === "\n"
                              ? "\\n"
                              : p.char;
                    console.log(
                        `    [${j}] '${charDisplay}': mirror=(${p.mirrorX.toFixed(1)}, ${p.mirrorY.toFixed(1)}) caret=(${p.caretX.toFixed(1)}, ${p.caretY.toFixed(1)})`,
                    );
                }
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(
            `Mirror wraps at character indices: [${mirrorWrapPoints.join(", ")}]`,
        );
        console.log(
            `Caret wraps at character indices: [${caretWrapPoints.join(", ")}]`,
        );

        // Calculate lag
        if (mirrorWrapPoints.length > 0 && caretWrapPoints.length > 0) {
            console.log(`\n=== Wrap Lag Analysis ===`);
            for (
                let i = 0;
                i < Math.min(mirrorWrapPoints.length, caretWrapPoints.length);
                i++
            ) {
                const mirrorWrap = mirrorWrapPoints[i];
                const caretWrap = caretWrapPoints[i];
                const lag = caretWrap - mirrorWrap;
                console.log(
                    `Wrap ${i + 1}: Text wraps at char ${mirrorWrap}, caret wraps at char ${caretWrap} (lag: ${lag} characters)`,
                );
            }
        }

        // Check for the specific bug: caret moving several characters after 'single' before jumping
        // Find 'single' in the line
        const singleIndex = line2.indexOf("'single'");
        expect(singleIndex).toBeGreaterThan(-1);

        const singleEndIndex = singleIndex + "'single'".length;
        console.log(
            `\n=== Checking area around 'single' (ends at char ${singleEndIndex}) ===`,
        );

        // Check 20 characters after 'single'
        const checkStart = singleEndIndex;
        const checkEnd = Math.min(line2.length - 1, singleEndIndex + 20);

        for (let i = checkStart; i <= checkEnd; i++) {
            const p = positions[i];
            if (!p) continue;

            const charDisplay =
                p.char === " " ? "SPACE" : p.char === "\n" ? "\\n" : p.char;
            const deltaY = Math.abs(p.caretY - p.mirrorY);
            const mismatch = deltaY > 5 ? " ❌ MISMATCH" : "";

            console.log(
                `  [${i}] '${charDisplay}': mirror=(${p.mirrorX.toFixed(1)}, ${p.mirrorY.toFixed(1)}) caret=(${p.caretX.toFixed(1)}, ${p.caretY.toFixed(1)})${mismatch}`,
            );
        }

        // Verify that caret Y matches mirror Y at each position (with tolerance)
        const tolerance = 2;
        const yMismatches: {
            idx: number;
            char: string;
            mirrorY: number;
            caretY: number;
        }[] = [];

        for (const pos of positions) {
            if (Math.abs(pos.caretY - pos.mirrorY) > tolerance) {
                yMismatches.push({
                    idx: pos.charIndex,
                    char: pos.char,
                    mirrorY: pos.mirrorY,
                    caretY: pos.caretY,
                });
            }
        }

        if (yMismatches.length > 0) {
            console.log(
                `\n=== Found ${yMismatches.length} Y-position mismatches ===`,
            );
            // Show first 10 mismatches
            yMismatches.slice(0, 10).forEach((m) => {
                const charDisplay = m.char === " " ? "SPACE" : m.char;
                console.log(
                    `  Char ${m.idx} '${charDisplay}': expected Y=${m.mirrorY.toFixed(1)}, got Y=${m.caretY.toFixed(1)}`,
                );
            });
        }

        // Assert that there should be no Y mismatches (caret should jump to next line at wrap point)
        expect(
            yMismatches.length,
            `Caret Y-position should match mirror at all positions. Found ${yMismatches.length} mismatches.`,
        ).toBe(0);
    });
});
