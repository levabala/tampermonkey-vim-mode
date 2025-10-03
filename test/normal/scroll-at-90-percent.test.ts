import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    setupVimMode,
    createTestElements,
    cleanupTestElements,
} from "../setup/test-helpers.js";

describe("Scroll at 90% viewport", () => {
    let textarea: HTMLTextAreaElement;
    let input: HTMLInputElement;

    beforeEach(() => {
        setupVimMode();
        ({ input, textarea } = createTestElements());

        // Set up textarea with styles for testing
        textarea.style.height = "200px";
        textarea.style.width = "400px";
        textarea.style.overflow = "auto";
        textarea.style.position = "absolute";
        textarea.style.top = "0px";
        textarea.style.left = "0px";
    });

    afterEach(() => {
        cleanupTestElements(input, textarea);
    });

    it("should scroll textarea when caret reaches 90% of viewport height", () => {
        // Create content that will fill multiple screens
        const lines: string[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push(`Line ${i}`);
        }
        textarea.value = lines.join("\n");
        textarea.focus();

        // Mock getBoundingClientRect to simulate viewport
        const mockRect = {
            top: 0,
            left: 0,
            bottom: 200,
            right: 400,
            height: 200,
            width: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
        vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue(mockRect);

        // Mock window.innerHeight
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 600,
        });

        // Enter normal mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Start at the beginning
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
        const initialScrollTop = textarea.scrollTop;

        // Move down multiple times with 'j' to reach the 90% threshold
        // Since viewport is 200px, 90% is at 180px from top of visible area
        // We need to move the caret to a position where its Y coordinate
        // relative to viewport top is at or above 180px

        for (let i = 0; i < 15; i++) {
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "j", bubbles: true }),
            );
        }

        // At this point, the caret should be far enough down that
        // scrolling should have occurred
        expect(textarea.scrollTop).toBeGreaterThan(initialScrollTop);
    });

    it("should scroll by appropriate amount to keep caret visible", () => {
        // Create content that will fill multiple screens
        const lines: string[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push(`Line ${i}`);
        }
        textarea.value = lines.join("\n");
        textarea.focus();

        // Mock getBoundingClientRect to simulate viewport
        const mockRect = {
            top: 0,
            left: 0,
            bottom: 200,
            right: 400,
            height: 200,
            width: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
        vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue(mockRect);

        // Mock window.innerHeight
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 600,
        });

        // Enter normal mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Start at the beginning
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;

        // Move down and track scroll behavior
        const scrollPositions: number[] = [textarea.scrollTop];

        for (let i = 0; i < 20; i++) {
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "j", bubbles: true }),
            );
            scrollPositions.push(textarea.scrollTop);
        }

        // The scroll should increase gradually as we move down
        // and should be non-zero after moving far enough
        const maxScroll = Math.max(...scrollPositions);
        expect(maxScroll).toBeGreaterThan(0);

        // The scroll increments should be snap-like (consistent line heights)
        // Not smoothly animated
        const uniqueScrollPositions = [...new Set(scrollPositions)];
        expect(uniqueScrollPositions.length).toBeGreaterThan(1);
    });

    it("should work with different viewport sizes", () => {
        // Create content
        const lines: string[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push(`Line ${i}`);
        }
        textarea.value = lines.join("\n");
        textarea.focus();

        // Test with smaller viewport
        textarea.style.height = "100px";
        const mockRect = {
            top: 0,
            left: 0,
            bottom: 100,
            right: 400,
            height: 100,
            width: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
        vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue(mockRect);

        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 600,
        });

        // Enter normal mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Start at the beginning
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
        const initialScrollTop = textarea.scrollTop;

        // Move down - should scroll sooner with smaller viewport
        for (let i = 0; i < 10; i++) {
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "j", bubbles: true }),
            );
        }

        // Should have scrolled
        expect(textarea.scrollTop).toBeGreaterThan(initialScrollTop);
    });

    it("should not scroll when caret is below 90% threshold", () => {
        // Create content
        const lines: string[] = [];
        for (let i = 1; i <= 50; i++) {
            lines.push(`Line ${i}`);
        }
        textarea.value = lines.join("\n");
        textarea.focus();

        // Mock getBoundingClientRect
        const mockRect = {
            top: 0,
            left: 0,
            bottom: 500,
            right: 400,
            height: 500,
            width: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
        vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue(mockRect);

        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 600,
        });

        // Enter normal mode
        textarea.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        // Start at the beginning
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
        const initialScrollTop = textarea.scrollTop;

        // Move down just a few lines (not enough to reach 90%)
        for (let i = 0; i < 3; i++) {
            textarea.dispatchEvent(
                new KeyboardEvent("keydown", { key: "j", bubbles: true }),
            );
        }

        // Should not have scrolled yet
        expect(textarea.scrollTop).toBe(initialScrollTop);
    });
});
