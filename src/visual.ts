import { debug } from "./setup.js";
import { getCursorPos, setCursorPos, getLineStart, getLineEnd, saveState } from "./common.js";
import { executeMotion } from "./normal.js";
import { yankRange, deleteRange } from "./normal.js";
import type { EditableElement, Mode, State } from "./types.js";

// Visual selection management
export function updateVisualSelection(
	currentInput: EditableElement | null,
	mode: Mode,
	visualStart: number | null,
	visualEnd: number | null
): void {
	if (!currentInput || visualStart === null || visualEnd === null) return;

	const start = Math.min(visualStart, visualEnd);
	const end = Math.max(visualStart, visualEnd);

	debug("updateVisualSelection", { visualStart, visualEnd, start, end });

	// For visual mode, we want to include the character under the cursor
	// so we add 1 to the end position (unless we're at the end of the text)
	const selectionEnd =
		mode === "visual-line" ? end : Math.min(end + 1, currentInput.value.length);

	currentInput.selectionStart = start;
	currentInput.selectionEnd = selectionEnd;
}

export function extendVisualSelection(
	currentInput: EditableElement,
	mode: Mode,
	visualStart: number,
	visualEnd: number,
	newPos: number
): { visualStart: number; visualEnd: number } {
	if (mode !== "visual" && mode !== "visual-line") return { visualStart, visualEnd };

	debug("extendVisualSelection", { from: visualEnd, to: newPos });

	if (mode === "visual-line") {
		// In visual line mode, extend to whole lines
		visualEnd = getLineEnd(currentInput, newPos);
		// Adjust start if moving backwards
		if (newPos < visualStart) {
			visualStart = getLineStart(currentInput, newPos);
		} else {
			visualStart = getLineStart(currentInput, visualStart);
		}
	} else {
		// In visual character mode, just update the end
		visualEnd = newPos;
	}

	updateVisualSelection(currentInput, mode, visualStart, visualEnd);
	return { visualStart, visualEnd };
}

export function getCurrentRange(
	mode: Mode,
	visualStart: number,
	visualEnd: number,
	currentInput: EditableElement
): TextRange {
	// Returns { start, end } for the current operation range
	// Works for both visual selections and operator+motion combinations
	if (mode === "visual" || mode === "visual-line") {
		return {
			start: Math.min(visualStart, visualEnd),
			end: Math.max(visualStart, visualEnd),
		};
	}

	// For non-visual modes, return cursor position
	const pos = getCursorPos(currentInput);
	return { start: pos, end: pos };
}

export function processVisualCommand(
	key: string,
	state: State & { exitVisualMode: () => void }
): void {
	const {
		currentInput,
		countBuffer,
		commandBuffer,
		mode,
		visualStart,
		visualEnd,
		undoStack,
		redoStack,
		clipboard,
		enterInsertMode,
		exitVisualMode,
		enterVisualMode,
	} = state;

	if (!currentInput) return;

	const count = parseInt(countBuffer) || 1;
	debug("processVisualCommand", { key, count, mode });

	// Handle motions - extend selection
	const motionKeys = ["h", "j", "k", "l", "w", "b", "e", "0", "^", "$", "G", "{", "}", "%"];
	if (motionKeys.includes(key)) {
		executeMotion(currentInput, key, count);
		const newPos = getCursorPos(currentInput);
		const newSelection = extendVisualSelection(
			currentInput,
			mode,
			visualStart,
			visualEnd,
			newPos
		);
		state.visualStart = newSelection.visualStart;
		state.visualEnd = newSelection.visualEnd;
		state.countBuffer = "";
		return;
	}

	// Handle command sequences (gg, ge, etc.)
	if (commandBuffer) {
		const fullCommand = commandBuffer + key;

		if (fullCommand === "gg") {
			executeMotion(currentInput, "gg", count);
			const newPos = getCursorPos(currentInput);
			const newSelection = extendVisualSelection(
				currentInput,
				mode,
				visualStart,
				visualEnd,
				newPos
			);
			state.visualStart = newSelection.visualStart;
			state.visualEnd = newSelection.visualEnd;
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		if (commandBuffer === "g" && key === "e") {
			executeMotion(currentInput, "ge", count);
			const newPos = getCursorPos(currentInput);
			const newSelection = extendVisualSelection(
				currentInput,
				mode,
				visualStart,
				visualEnd,
				newPos
			);
			state.visualStart = newSelection.visualStart;
			state.visualEnd = newSelection.visualEnd;
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		state.commandBuffer = "";
	}

	// Handle operators - operate on visual selection then exit
	if (key === "d") {
		const range = getCurrentRange(mode, visualStart, visualEnd, currentInput);
		yankRange(currentInput, clipboard, range.start, range.end);
		deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
		exitVisualMode();
		state.countBuffer = "";
		return;
	}

	if (key === "y") {
		const range = getCurrentRange(mode, visualStart, visualEnd, currentInput);
		yankRange(currentInput, clipboard, range.start, range.end);
		exitVisualMode();
		state.countBuffer = "";
		return;
	}

	if (key === "c") {
		const range = getCurrentRange(mode, visualStart, visualEnd, currentInput);
		yankRange(currentInput, clipboard, range.start, range.end);
		deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
		enterInsertMode();
		state.countBuffer = "";
		return;
	}

	// Handle visual mode toggles
	if (key === "v") {
		if (mode === "visual") {
			exitVisualMode();
		} else {
			// Switch from visual-line to visual
			enterVisualMode(false);
		}
		state.countBuffer = "";
		return;
	}

	if (key === "V") {
		if (mode === "visual-line") {
			exitVisualMode();
		} else {
			// Switch from visual to visual-line
			enterVisualMode(true);
		}
		state.countBuffer = "";
		return;
	}

	// Handle other keys
	switch (key) {
		case "g":
			state.commandBuffer = "g";
			break;

		case "x":
			// In visual mode, x deletes selection (same as d)
			const range = getCurrentRange(mode, visualStart, visualEnd, currentInput);
			yankRange(currentInput, clipboard, range.start, range.end);
			deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
			exitVisualMode();
			state.countBuffer = "";
			break;

		case "p":
		case "P":
			// Paste over selection
			saveState(currentInput, undoStack, redoStack);
			const range2 = getCurrentRange(mode, visualStart, visualEnd, currentInput);
			deleteRange(currentInput, undoStack, redoStack, range2.start, range2.end);
			currentInput.value =
				currentInput.value.substring(0, range2.start) +
				clipboard.content +
				currentInput.value.substring(range2.start);
			setCursorPos(currentInput, range2.start);
			exitVisualMode();
			state.countBuffer = "";
			break;

		default:
			if (/\d/.test(key)) {
				state.countBuffer += key;
			} else {
				state.commandBuffer = "";
				state.countBuffer = "";
			}
	}
}
