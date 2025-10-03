import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error - jsdom types not installed
import { JSDOM } from "jsdom";

describe("Scrolling commands", () => {
    let dom: JSDOM;
    let textarea: HTMLTextAreaElement;

    beforeEach(async () => {
        // Create a fresh DOM for each test
        dom = new JSDOM(
            `<!DOCTYPE html><html><body><textarea id="test"></textarea></body></html>`,
            { url: "https://example.com" },
        );

        global.window = dom.window as unknown as Window & typeof globalThis;
        global.document = dom.window.document;
        global.KeyboardEvent = dom.window.KeyboardEvent;

        // Clear module cache and reimport
        vi.resetModules();
        await import("../src/main.js");

        textarea = document.getElementById("test") as HTMLTextAreaElement;
        textarea.value = Array(100).fill("line of text").join("\n");

        // Set up styles for scrolling calculations
        Object.defineProperty(textarea, "clientHeight", {
            value: 200,
            writable: true,
        });

        // Set up scroll properties - scrollHeight should be larger than clientHeight
        // to allow scrolling. Mock a textarea with 20 lines of 20px each = 400px
        Object.defineProperty(textarea, "scrollHeight", {
            value: 2000, // Total content height
            writable: true,
        });

        let scrollTopValue = 0;
        Object.defineProperty(textarea, "scrollTop", {
            get: () => scrollTopValue,
            set: (value) => {
                // Clamp between 0 and max scroll
                const maxScroll = textarea.scrollHeight - textarea.clientHeight;
                scrollTopValue = Math.max(0, Math.min(value, maxScroll));
            },
        });

        // Mock getComputedStyle
        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
            const style = originalGetComputedStyle(element);
            return {
                ...style,
                lineHeight: "20px",
                fontSize: "16px",
            };
        });

        // Focus the textarea to activate vim mode
        textarea.focus();
    });

    it("should scroll down one line with Ctrl-e in insert mode", () => {
        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "e",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        expect(textarea.scrollTop).toBeGreaterThan(initialScrollTop);
        expect(textarea.scrollTop).toBe(initialScrollTop + 20); // one line height
    });

    it("should scroll up one line with Ctrl-y in insert mode", () => {
        // First scroll down to have room to scroll up
        textarea.scrollTop = 100;
        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "y",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        expect(textarea.scrollTop).toBeLessThan(initialScrollTop);
        expect(textarea.scrollTop).toBe(initialScrollTop - 20); // one line height
    });

    it("should scroll down half page with Ctrl-d in insert mode", () => {
        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "d",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        // clientHeight = 200, lineHeight = 20, so half page = 5 lines = 100px
        expect(textarea.scrollTop).toBe(initialScrollTop + 100);
    });

    it("should scroll up half page with Ctrl-u in insert mode", () => {
        // First scroll down to have room to scroll up
        textarea.scrollTop = 200;
        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "u",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        // clientHeight = 200, lineHeight = 20, so half page = 5 lines = 100px
        expect(textarea.scrollTop).toBe(initialScrollTop - 100);
    });

    it("should scroll down one line with Ctrl-e in normal mode", () => {
        // Enter normal mode
        const escEvent = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(escEvent);

        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "e",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        expect(textarea.scrollTop).toBeGreaterThan(initialScrollTop);
        expect(textarea.scrollTop).toBe(initialScrollTop + 20);
    });

    it("should scroll down half page with Ctrl-d in normal mode", () => {
        // Enter normal mode
        const escEvent = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(escEvent);

        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "d",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        expect(textarea.scrollTop).toBe(initialScrollTop + 100);
    });

    it("should scroll window when textarea reaches bottom", () => {
        // Mock scrollBy
        const scrollBySpy = vi.fn();
        window.scrollBy = scrollBySpy;

        // Scroll textarea to bottom
        textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight;
        const initialScrollTop = textarea.scrollTop;

        const event = new KeyboardEvent("keydown", {
            key: "e",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        // Textarea shouldn't have scrolled (already at bottom)
        expect(textarea.scrollTop).toBe(initialScrollTop);
        // Window should have been scrolled instead
        expect(scrollBySpy).toHaveBeenCalledWith(0, 20);
    });

    it("should scroll window when textarea reaches top", () => {
        // Mock scrollBy
        const scrollBySpy = vi.fn();
        window.scrollBy = scrollBySpy;

        // Textarea is already at top (scrollTop = 0)
        textarea.scrollTop = 0;

        const event = new KeyboardEvent("keydown", {
            key: "y",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        textarea.dispatchEvent(event);

        // Textarea shouldn't have scrolled (already at top)
        expect(textarea.scrollTop).toBe(0);
        // Window should have been scrolled instead (negative = up)
        expect(scrollBySpy).toHaveBeenCalledWith(0, -20);
    });
});
