import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	setupVimMode,
	createTestElements,
	cleanupTestElements,
	getModeText,
} from "../setup/test-helpers.js";

declare global {
	interface Window {
		getModeText: () => string;
	}
}

describe("Insert Commands", () => {
	let input: HTMLInputElement;
	let textarea: HTMLTextAreaElement;

	beforeEach(() => {
		setupVimMode();
		({ input, textarea } = createTestElements());
		window.getModeText = getModeText;
	});

	afterEach(() => {
		cleanupTestElements(input, textarea);
	});

	it("should insert at end of line with A", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "A", bubbles: true }));
		expect(input.selectionStart).toBe(5);
		expect(window.getModeText()).toBe("-- INSERT --");
	});

	it("should insert at start of line with I", () => {
		input.value = "  hello";
		input.focus();
		input.selectionStart = 5;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "I", bubbles: true }));
		expect(input.selectionStart).toBe(2); // first non-blank
		expect(window.getModeText()).toBe("-- INSERT --");
	});

	it("should open line below with o and above with O", () => {
		// Test o - open line below
		textarea.value = "line1\nline2";
		textarea.focus();
		textarea.selectionStart = 1;
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "o", bubbles: true }));
		expect(textarea.value).toBe("line1\n\nline2");
		expect(textarea.selectionStart).toBe(6);

		// Test O - open line above
		textarea.value = "line1\nline2";
		textarea.selectionStart = 7; // on line2
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "O", bubbles: true }));
		expect(textarea.value).toBe("line1\n\nline2");
		expect(textarea.selectionStart).toBe(6);
	});
});
