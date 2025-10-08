import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("Visual Line Selection on Wrapped Lines", () => {
    test.beforeEach(async ({ page }) => {
        // Use a wider viewport to match user's browser where line 10 wraps to multiple lines
        await page.setViewportSize({ width: 1920, height: 1080 });
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });

    test("should select entire wrapped line including last wrapped part with Shift+V", async ({
        page,
    }) => {
        // Use the performance textarea which has line 10 as a very long wrapped line
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Get the full text to examine line 10
        const fullText = await textarea.inputValue();
        const lines = fullText.split("\n");
        const line10 = lines[9]; // 0-indexed
        const line10Start =
            lines.slice(0, 9).join("\n").length + (lines.length > 1 ? 1 : 0);
        const line10End = line10Start + line10.length;

        console.log("Line 10 content:", line10.substring(0, 50) + "...");
        console.log(
            "Line 10 ends with 'nesciunt.':",
            line10.endsWith("nesciunt."),
        );
        console.log("Line 10 length:", line10.length);

        // Navigate to line 10 (which is a long wrapped line)
        await page.keyboard.press("g");
        await page.keyboard.press("g");
        await page.keyboard.press("9");
        await page.keyboard.press("j"); // Move to line 10

        // Enter visual line mode with Shift+V
        await page.keyboard.press("Shift+V");

        // Wait for visual selection overlay to be applied
        await page.waitForTimeout(200);

        // Check the visual selection overlay element (the virtual selection)
        const overlayInfo = await page.evaluate(
            ([lineStart, lineEnd]) => {
                const textarea = document.querySelector(
                    "#performance-textarea",
                ) as HTMLTextAreaElement;
                if (!textarea) return { error: "textarea not found" };

                // Find all visual selection overlay divs
                const overlays = Array.from(
                    document.querySelectorAll(
                        'div[style*="rgba(80, 120, 255"]',
                    ),
                ) as HTMLElement[];

                if (overlays.length === 0) {
                    return { exists: false, count: 0, overlays: [] };
                }

                // Get textarea dimensions
                const textareaRect = textarea.getBoundingClientRect();
                const textareaStyles = window.getComputedStyle(textarea);

                // Measure the actual line dimensions using a temporary element
                // This matches how calculateVisualRows measures lines
                const line10Text = textarea.value.substring(lineStart, lineEnd);

                const mirror = document.createElement("div");
                mirror.style.position = "absolute";
                mirror.style.visibility = "hidden";
                mirror.style.whiteSpace = "pre-wrap";
                mirror.style.wordWrap = "break-word";

                const paddingLeft = parseFloat(textareaStyles.paddingLeft);
                const paddingRight = parseFloat(textareaStyles.paddingRight);
                const contentWidth =
                    textarea.clientWidth - paddingLeft - paddingRight;
                mirror.style.width = `${contentWidth}px`;

                const stylesToCopy = [
                    "font-family",
                    "font-size",
                    "font-weight",
                    "font-style",
                    "letter-spacing",
                    "text-transform",
                    "word-spacing",
                    "text-indent",
                    "line-height",
                ];

                stylesToCopy.forEach((prop) => {
                    mirror.style.setProperty(
                        prop,
                        textareaStyles.getPropertyValue(prop),
                    );
                });

                document.body.appendChild(mirror);
                mirror.textContent = line10Text;
                const actualHeight = mirror.offsetHeight;
                document.body.removeChild(mirror);

                const fontSize = parseFloat(textareaStyles.fontSize);
                const lineHeight =
                    parseFloat(textareaStyles.lineHeight) || fontSize * 1.2;
                const visualLines = Math.round(actualHeight / lineHeight);

                // Sum the height of all overlays
                const totalOverlayHeight = overlays.reduce((sum, overlay) => {
                    return sum + parseFloat(overlay.style.height);
                }, 0);

                return {
                    exists: true,
                    count: overlays.length,
                    textareaWidth: textareaRect.width,
                    fontSize: fontSize,
                    lineHeight: lineHeight,
                    actualLineHeight: actualHeight,
                    visualWrappedLines: visualLines,
                    totalOverlayHeight: totalOverlayHeight,
                    overlayVisualLines: Math.round(
                        totalOverlayHeight / lineHeight,
                    ),
                    heightMatch:
                        Math.abs(totalOverlayHeight - actualHeight) <
                        lineHeight,
                };
            },
            [line10Start, line10End],
        );

        console.log(
            "Visual overlay info:",
            JSON.stringify(overlayInfo, null, 2),
        );

        // The overlay should exist
        expect(overlayInfo.exists).toBe(true);
        expect(overlayInfo.count).toBeGreaterThan(0);

        // The total overlay height should match the actual line height (including all wrapped parts)
        console.log(
            `Overlay covers ${overlayInfo.overlayVisualLines} visual lines, Actual: ${overlayInfo.visualWrappedLines} visual lines`,
        );
        console.log(
            `Total overlay height: ${overlayInfo.totalOverlayHeight}px, Actual line height: ${overlayInfo.actualLineHeight}px`,
        );

        // The overlay should cover the same number of visual wrapped lines as the actual content
        expect(overlayInfo.heightMatch).toBe(true);

        // Delete the selection to verify it captures the entire line
        await page.keyboard.press("d");

        // Get the text after deletion
        const newText = await textarea.inputValue();
        const newLines = newText.split("\n");

        // Line 10 should be completely removed including "sequi nesciunt."
        // Line 9 should still be there, and what was line 11 should now be line 10
        expect(newLines[8]).toBe(lines[8]); // Line 9 unchanged
        expect(newLines[9]).toBe(lines[10]); // What was line 11 is now line 10

        // The deleted content should not appear in the new text
        expect(newText).not.toContain(line10);
    });

    test("should delete entire wrapped line including last wrapped part with Vd", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Get the original text
        const originalText = await textarea.inputValue();
        const lines = originalText.split("\n");
        const line10 = lines[9]; // 0-indexed, so line 10 is at index 9

        // Verify line 10 ends with "nesciunt."
        expect(line10).toContain("sequi nesciunt.");

        // Navigate to line 10
        await page.keyboard.press("g");
        await page.keyboard.press("g");
        await page.keyboard.press("9");
        await page.keyboard.press("j");

        // Visual line mode and delete
        await page.keyboard.press("Shift+V");
        await page.waitForTimeout(100);
        await page.keyboard.press("d");

        // Get the text after deletion
        const newText = await textarea.inputValue();
        const newLines = newText.split("\n");

        // Line 10 should be completely removed
        // Line 9 should still be there, and what was line 11 should now be line 10
        expect(newLines[8]).toBe(lines[8]); // Line 9 unchanged
        expect(newLines[9]).toBe(lines[10]); // What was line 11 is now line 10

        // The specific line 10 content should not appear in the new text
        // (Note: other lines like 20, 30, etc. still have "sequi nesciunt."
        // because every 10th line is long)
        expect(newText).not.toContain(line10);
    });

    test("should yank entire wrapped line including last wrapped part with Vy", async ({
        page,
    }) => {
        const textarea = page.locator("#performance-textarea");
        await textarea.click();
        await page.keyboard.press("Escape");

        // Get the original text
        const originalText = await textarea.inputValue();
        const lines = originalText.split("\n");
        const line10 = lines[9];

        // Navigate to line 10
        await page.keyboard.press("g");
        await page.keyboard.press("g");
        await page.keyboard.press("9");
        await page.keyboard.press("j");

        // Visual line mode and yank
        await page.keyboard.press("Shift+V");
        await page.waitForTimeout(100);
        await page.keyboard.press("y");

        // Navigate to a different line and paste
        await page.keyboard.press("j"); // Move to line 11
        await page.keyboard.press("p"); // Paste below line 11

        // Get the text after pasting
        const newText = await textarea.inputValue();
        const newLines = newText.split("\n");

        // After pasting below line 11, the yanked line 10 should now be at line 12 (index 11)
        expect(newLines[11]).toBe(line10);
        expect(newLines[11]).toContain("sequi nesciunt.");
    });
});
