import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupVimMode, createTestElements, cleanupTestElements } from "../setup/test-helpers.js";

describe("Undo/Redo", () => {
	let input: HTMLInputElement;
	let textarea: HTMLTextAreaElement;

	beforeEach(() => {
		setupVimMode();
		({ input, textarea } = createTestElements());
	});

	afterEach(() => {
		cleanupTestElements(input, textarea);
	});

	it("should undo with u", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
		expect(input.value).toBe("ello");
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true }));
		expect(input.value).toBe("hello");
	});

	it("should redo with Ctrl-r", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "u", bubbles: true }));
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "r", ctrlKey: true, bubbles: true })
		);
		expect(input.value).toBe("ello");
	});
});
