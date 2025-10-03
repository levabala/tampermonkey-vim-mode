import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    updateVisualSelection,
    extendVisualSelection,
} from "../../src/visual.js";
import * as common from "../../src/common.js";

describe("Visual Mode Selection", () => {
    let input: HTMLInputElement;
    let updateVisualSelectionRenderSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        document.body.innerHTML = "";
        input = document.createElement("input");
        input.value = "hello world";
        input.style.cssText = `
            position: absolute;
            left: 100px;
            top: 100px;
            width: 200px;
            padding: 5px;
            font-size: 16px;
            font-family: monospace;
        `;
        document.body.appendChild(input);

        // Spy on the render function
        updateVisualSelectionRenderSpy = vi.spyOn(
            common,
            "updateVisualSelection",
        );
    });

    describe("updateVisualSelection", () => {
        it("should not normalize start/end with min/max when selecting forward", () => {
            // When visualStart=2 and visualEnd=7, we should pass them in that order
            // not as min/max which would always be (2, 7)
            const visualStart = 2;
            const visualEnd = 7;

            updateVisualSelection(input, "visual", visualStart, visualEnd);

            // The render function should be called with visualStart first
            // (it will be adjusted +1 for character-inclusive selection)
            expect(updateVisualSelectionRenderSpy).toHaveBeenCalledWith(
                input,
                visualStart,
                visualEnd + 1, // adjusted for inclusive selection
            );
        });

        it("should not normalize start/end with min/max when selecting backward", () => {
            // When visualStart=7 and visualEnd=2, we should pass them in that order
            // The render function will handle the min/max internally
            const visualStart = 7;
            const visualEnd = 2;

            updateVisualSelection(input, "visual", visualStart, visualEnd);

            // The render function should be called with visualStart first (7)
            // not with min(7,2)=2 first (which would lose direction information)
            expect(updateVisualSelectionRenderSpy).toHaveBeenCalledWith(
                input,
                visualStart,
                visualEnd + 1, // adjusted for inclusive selection
            );
        });

        it("should set native selection to visualEnd (cursor position)", () => {
            const visualStart = 2;
            const visualEnd = 7;

            updateVisualSelection(input, "visual", visualStart, visualEnd);

            // Native selection should be collapsed at cursor (visualEnd)
            expect(input.selectionStart).toBe(visualEnd);
            expect(input.selectionEnd).toBe(visualEnd);
        });
    });

    describe("extendVisualSelection", () => {
        it("should extend selection forward from anchor", () => {
            input.value = "hello world";
            const visualStart = 2; // anchor at 'l'
            const visualEnd = 2; // cursor starts at anchor

            // Move cursor forward
            input.selectionStart = 7; // move to 'w'
            input.selectionEnd = 7;

            const result = extendVisualSelection(
                input,
                "visual",
                visualStart,
                visualEnd,
                7,
            );

            expect(result.visualStart).toBe(2);
            expect(result.visualEnd).toBe(7);
        });

        it("should extend selection backward from anchor", () => {
            input.value = "hello world";
            const visualStart = 7; // anchor at 'w'
            const visualEnd = 7; // cursor starts at anchor

            // Move cursor backward
            input.selectionStart = 2; // move to 'l'
            input.selectionEnd = 2;

            const result = extendVisualSelection(
                input,
                "visual",
                visualStart,
                visualEnd,
                2,
            );

            expect(result.visualStart).toBe(7);
            expect(result.visualEnd).toBe(2);
        });

        it("should keep anchor fixed when extending", () => {
            input.value = "hello world";
            const visualStart = 5; // anchor at ' ' (space)
            const visualEnd = 5;

            // Extend forward
            let result = extendVisualSelection(
                input,
                "visual",
                visualStart,
                visualEnd,
                8,
            );
            expect(result.visualStart).toBe(5); // anchor unchanged
            expect(result.visualEnd).toBe(8);

            // Then extend backward past anchor
            result = extendVisualSelection(
                input,
                "visual",
                result.visualStart,
                result.visualEnd,
                2,
            );
            expect(result.visualStart).toBe(5); // anchor still unchanged
            expect(result.visualEnd).toBe(2);
        });

        it("should NOT reset anchor to 0 when extending selection", () => {
            input.value = "hello world test";
            const visualStart = 10; // anchor at 't' in "world"
            const visualEnd = 10;

            // Extend forward - visualStart should stay at 10, NOT become 0
            const result = extendVisualSelection(
                input,
                "visual",
                visualStart,
                visualEnd,
                13,
            );

            expect(result.visualStart).toBe(10); // Should NOT be 0!
            expect(result.visualEnd).toBe(13);

            // Verify the selection is rendered from 10, not from 0
            const renderSpy = vi.mocked(common.updateVisualSelection);
            const lastCall =
                renderSpy.mock.calls[renderSpy.mock.calls.length - 1];
            expect(lastCall[1]).toBe(10); // start should be 10
            expect(lastCall[2]).toBe(14); // end should be 13+1 (inclusive)
        });
    });
});
