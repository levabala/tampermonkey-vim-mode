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

describe("Operators - Delete", () => {
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

	it("should delete character with x", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
		expect(input.value).toBe("ello");
	});

	it("should delete word with dw", () => {
		input.value = "hello world";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
		expect(input.value).toBe("world");
	});

	it("should delete line with dd", () => {
		textarea.value = "line1\nline2\nline3";
		textarea.focus();
		textarea.selectionStart = 7; // on line2
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		// Cursor moves back to 6
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		expect(textarea.value).toBe("line1\nline3");
	});

	it("should delete to end of line with d$", () => {
		input.value = "hello world";
		input.focus();
		input.selectionStart = 6;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "$", bubbles: true }));
		expect(input.value).toBe("hello ");
	});

	it("should delete to end of line with D", () => {
		input.value = "hello world";
		input.focus();
		input.selectionStart = 6;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "D", bubbles: true }));
		expect(input.value).toBe("hello ");
	});
});

describe("Yank and Paste", () => {
	let input: HTMLInputElement;
	let textarea: HTMLTextAreaElement;

	beforeEach(() => {
		setupVimMode();
		({ input, textarea } = createTestElements());
	});

	afterEach(() => {
		cleanupTestElements(input, textarea);
	});

	it("should yank and paste word with yw and p", () => {
		input.value = "hello world";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		// Yank word
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "y", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
		// Move to end
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "$", bubbles: true }));
		// Paste once
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true }));
		expect(input.value).toBe("hello worldhello ");
	});
});

describe("Change Operator", () => {
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

	it("should change word with cw", () => {
		input.value = "hello world";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
		expect(input.value).toBe("world");
		expect(window.getModeText()).toBe("-- INSERT --");
	});

	it("should change inside parentheses with ci(", () => {
		input.value = "foo(bar)baz";
		input.focus();
		input.selectionStart = 5;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "(", bubbles: true }));
		expect(input.value).toBe("foo()baz");
		expect(window.getModeText()).toBe("-- INSERT --");
	});
});

describe("Counts", () => {
	let input: HTMLInputElement;
	let textarea: HTMLTextAreaElement;

	beforeEach(() => {
		setupVimMode();
		({ input, textarea } = createTestElements());
	});

	afterEach(() => {
		cleanupTestElements(input, textarea);
	});

	it("should repeat motion with count 3l", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "l", bubbles: true }));
		expect(input.selectionStart).toBe(3);
	});

	it("should repeat delete with count 2x", () => {
		input.value = "hello";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
		expect(input.value).toBe("llo");
	});

	it("should delete multiple words with 2dw", () => {
		input.value = "one two three four";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
		expect(input.value).toBe("three four");
	});
});

describe("Dot Repeat", () => {
	let input: HTMLInputElement;
	let textarea: HTMLTextAreaElement;

	beforeEach(() => {
		setupVimMode();
		({ input, textarea } = createTestElements());
	});

	afterEach(() => {
		cleanupTestElements(input, textarea);
	});

	it("should repeat last change with . for simple and complex commands", () => {
		// Test simple command (x)
		input.value = "hello world";
		input.focus();
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
		expect(input.value).toBe("ello world");
		input.dispatchEvent(new KeyboardEvent("keydown", { key: ".", bubbles: true }));
		expect(input.value).toBe("llo world");

		// Test complex command (dw)
		input.value = "one two three four";
		input.selectionStart = 0;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
		expect(input.value).toBe("two three four");
		input.dispatchEvent(new KeyboardEvent("keydown", { key: ".", bubbles: true }));
		expect(input.value).toBe("three four");
	});
});
