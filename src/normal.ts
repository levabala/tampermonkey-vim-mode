import { debug } from "./setup.js";
import {
	getCursorPos,
	setCursorPos,
	getLine,
	getLineStart,
	getLineEnd,
	getFirstNonBlank,
	findWordStart,
	findWordEnd,
	findCharInLine,
	findMatchingPair,
	findParagraphBoundary,
	findTextObject,
	saveState,
	undo,
} from "./common.js";
import type { EditableElement, TextRange, State } from "./types.js";

// Motion functions
export function executeMotion(currentInput: EditableElement, motion: string, count = 1): number {
	let pos = getCursorPos(currentInput);
	debug("executeMotion", { motion, count, startPos: pos });

	for (let i = 0; i < count; i++) {
		switch (motion) {
			case "h":
				pos = Math.max(0, pos - 1);
				break;
			case "l":
				pos = Math.min(currentInput.value.length, pos + 1);
				break;
			case "j":
				const currentLineJ = getLine(currentInput, pos);
				const offsetJ = pos - currentLineJ.start;
				const nextLineStartJ = currentLineJ.end + 1;
				if (nextLineStartJ < currentInput.value.length) {
					const nextLineJ = getLine(currentInput, nextLineStartJ);
					pos = Math.min(nextLineJ.start + offsetJ, nextLineJ.end);
				}
				break;
			case "k":
				const currentLineK = getLine(currentInput, pos);
				const offsetK = pos - currentLineK.start;
				if (currentLineK.start > 0) {
					const prevLineK = getLine(currentInput, currentLineK.start - 1);
					pos = Math.min(prevLineK.start + offsetK, prevLineK.end);
				}
				break;
			case "w":
				pos = findWordStart(currentInput, pos, true);
				break;
			case "b":
				pos = findWordStart(currentInput, pos, false);
				break;
			case "e":
				pos = findWordEnd(currentInput, pos, true);
				break;
			case "ge":
				pos = findWordEnd(currentInput, pos, false);
				break;
			case "0":
				pos = getLineStart(currentInput, pos);
				break;
			case "^":
				pos = getFirstNonBlank(currentInput, getLineStart(currentInput, pos));
				break;
			case "$":
				pos = getLineEnd(currentInput, pos);
				break;
			case "gg":
				pos = 0;
				break;
			case "G":
				pos = currentInput.value.length;
				break;
			case "{":
				pos = findParagraphBoundary(currentInput, pos, false);
				break;
			case "}":
				pos = findParagraphBoundary(currentInput, pos, true);
				break;
			case "%":
				pos = findMatchingPair(currentInput, pos);
				break;
		}
	}

	debug("executeMotion result", { motion, count, endPos: pos });
	setCursorPos(currentInput, pos);
	return pos;
}

export function getMotionRange(
	currentInput: EditableElement,
	motion: string,
	count = 1
): TextRange {
	const startPos = getCursorPos(currentInput);
	debug("getMotionRange", { motion, count, startPos });
	executeMotion(currentInput, motion, count);
	const endPos = getCursorPos(currentInput);
	setCursorPos(currentInput, startPos);

	const range = {
		start: Math.min(startPos, endPos),
		end: Math.max(startPos, endPos),
	};
	debug("getMotionRange result", range);
	return range;
}

// Operator functions
export function deleteRange(
	currentInput: EditableElement,
	undoStack: UndoState[],
	redoStack: UndoState[],
	start: number,
	end: number
): void {
	debug("deleteRange", { start, end, deleted: currentInput.value.substring(start, end) });
	saveState(currentInput, undoStack, redoStack);
	const text = currentInput.value;
	currentInput.value = text.substring(0, start) + text.substring(end);
	setCursorPos(currentInput, start);
}

export function yankRange(
	currentInput: EditableElement,
	clipboard: { content: string },
	start: number,
	end: number
): void {
	const yanked = currentInput.value.substring(start, end);
	debug("yankRange", { start, end, yanked });
	clipboard.content = yanked;
}

export function changeRange(
	currentInput: EditableElement,
	undoStack: UndoState[],
	redoStack: UndoState[],
	start: number,
	end: number,
	enterInsertMode: () => void
): void {
	debug("changeRange", { start, end });
	deleteRange(currentInput, undoStack, redoStack, start, end);
	enterInsertMode();
}

export function repeatLastChange(state: State): void {
	const { lastChange, currentInput } = state;

	if (!lastChange || !currentInput) return;
	debug("repeatLastChange", lastChange);

	const count = lastChange.count || 1;
	state.countBuffer = String(count);

	if (lastChange.operator) {
		if (lastChange.motion) {
			state.operatorPending = lastChange.operator;
			processNormalCommand(lastChange.motion, state);
		} else if (lastChange.textObject) {
			state.operatorPending = lastChange.operator;
			state.commandBuffer = lastChange.textObject[0];
			processNormalCommand(lastChange.textObject[1], state);
		}
	} else if (lastChange.command) {
		switch (lastChange.command) {
			case "o":
			case "O":
			case "s":
			case "x":
			case "X":
			case "p":
			case "P":
				processNormalCommand(lastChange.command, state);
				break;
			case "r":
				state.commandBuffer = "r";
				processNormalCommand(lastChange.char ?? "", state);
				break;
		}
	}
}

export function processNormalCommand(key: string, state: State): void {
	const {
		currentInput,
		countBuffer,
		commandBuffer,
		operatorPending,
		undoStack,
		redoStack,
		clipboard,
		enterInsertMode,
		enterVisualMode,
	} = state;

	if (!currentInput) return;

	const count = parseInt(countBuffer) || 1;
	debug("processNormalCommand", {
		key,
		count,
		countBuffer,
		commandBuffer,
		operatorPending,
	});

	// Handle operators
	if (operatorPending) {
		if (key === operatorPending) {
			// Double operator (e.g., dd, yy, cc)
			debug("processCommand: double operator", { operator: operatorPending, count });
			const line = getLine(currentInput, getCursorPos(currentInput));
			const start = line.start;
			const end = line.end < currentInput.value.length ? line.end + 1 : line.end;

			if (operatorPending === "d") {
				yankRange(currentInput, clipboard, start, end);
				deleteRange(currentInput, undoStack, redoStack, start, end);
				state.lastChange = { operator: "d", motion: "d", count };
			} else if (operatorPending === "y") {
				yankRange(currentInput, clipboard, start, end);
				state.lastChange = { operator: "y", motion: "y", count };
			} else if (operatorPending === "c") {
				yankRange(currentInput, clipboard, start, end);
				changeRange(currentInput, undoStack, redoStack, start, end, enterInsertMode);
				state.lastChange = { operator: "c", motion: "c", count };
			}

			state.operatorPending = null;
			state.countBuffer = "";
			return;
		}

		// Check if user is starting a text object (pressing 'i' or 'a')
		if (key === "i" || key === "a") {
			state.commandBuffer = key;
			return;
		}

		// Text objects
		if (commandBuffer === "i" || commandBuffer === "a") {
			const inner = commandBuffer === "i";
			debug("processCommand: text object", {
				operator: operatorPending,
				textObject: commandBuffer + key,
				inner,
			});
			const range = findTextObject(currentInput, key, inner);

			if (operatorPending === "d") {
				yankRange(currentInput, clipboard, range.start, range.end);
				deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
				state.lastChange = { operator: "d", textObject: commandBuffer + key, count };
			} else if (operatorPending === "y") {
				yankRange(currentInput, clipboard, range.start, range.end);
				state.lastChange = { operator: "y", textObject: commandBuffer + key, count };
			} else if (operatorPending === "c") {
				yankRange(currentInput, clipboard, range.start, range.end);
				changeRange(
					currentInput,
					undoStack,
					redoStack,
					range.start,
					range.end,
					enterInsertMode
				);
				state.lastChange = { operator: "c", textObject: commandBuffer + key, count };
			}

			state.operatorPending = null;
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		// Motion-based operations
		debug("processCommand: motion-based operation", {
			operator: operatorPending,
			motion: key,
			count,
		});
		const range = getMotionRange(currentInput, key, count);

		if (operatorPending === "d") {
			yankRange(currentInput, clipboard, range.start, range.end);
			deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
			state.lastChange = { operator: "d", motion: key, count };
		} else if (operatorPending === "y") {
			yankRange(currentInput, clipboard, range.start, range.end);
			state.lastChange = { operator: "y", motion: key, count };
		} else if (operatorPending === "c") {
			yankRange(currentInput, clipboard, range.start, range.end);
			changeRange(
				currentInput,
				undoStack,
				redoStack,
				range.start,
				range.end,
				enterInsertMode
			);
			state.lastChange = { operator: "c", motion: key, count };
		}

		state.operatorPending = null;
		state.commandBuffer = "";
		state.countBuffer = "";
		return;
	}

	// Handle command sequences
	if (commandBuffer) {
		const fullCommand = commandBuffer + key;

		if (fullCommand === "gg") {
			executeMotion(currentInput, "gg", count);
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		if (commandBuffer === "g" && key === "e") {
			executeMotion(currentInput, "ge", count);
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		// f, F, t, T commands
		if (["f", "F", "t", "T"].includes(commandBuffer)) {
			const forward = ["f", "t"].includes(commandBuffer);
			const till = ["t", "T"].includes(commandBuffer);
			state.lastFindChar = key;
			state.lastFindDirection = forward;
			state.lastFindType = commandBuffer;

			for (let i = 0; i < count; i++) {
				const newPos = findCharInLine(
					currentInput,
					getCursorPos(currentInput),
					key,
					forward,
					till
				);
				setCursorPos(currentInput, newPos);
			}

			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		if (commandBuffer === "r") {
			// Replace character
			saveState(currentInput, undoStack, redoStack);
			const pos = getCursorPos(currentInput);
			const text = currentInput.value;
			currentInput.value = text.substring(0, pos) + key + text.substring(pos + 1);
			state.lastChange = { command: "r", char: key, count };
			state.commandBuffer = "";
			state.countBuffer = "";
			return;
		}

		state.commandBuffer = "";
	}

	// Single key commands
	switch (key) {
		case "h":
		case "j":
		case "k":
		case "l":
		case "w":
		case "b":
		case "e":
		case "0":
		case "^":
		case "$":
		case "G":
		case "{":
		case "}":
		case "%":
			executeMotion(currentInput, key, count);
			state.countBuffer = "";
			break;

		case "g":
		case "f":
		case "F":
		case "t":
		case "T":
		case "r":
			state.commandBuffer = key;
			break;

		case ";":
			if (state.lastFindChar) {
				for (let i = 0; i < count; i++) {
					const till = ["t", "T"].includes(state.lastFindType);
					const newPos = findCharInLine(
						currentInput,
						getCursorPos(currentInput),
						state.lastFindChar,
						state.lastFindDirection,
						till
					);
					setCursorPos(currentInput, newPos);
				}
			}
			state.countBuffer = "";
			break;

		case ",":
			if (state.lastFindChar) {
				for (let i = 0; i < count; i++) {
					const till = ["t", "T"].includes(state.lastFindType);
					const newPos = findCharInLine(
						currentInput,
						getCursorPos(currentInput),
						state.lastFindChar,
						!state.lastFindDirection,
						till
					);
					setCursorPos(currentInput, newPos);
				}
			}
			state.countBuffer = "";
			break;

		case "i":
			if (operatorPending) {
				state.commandBuffer = "i";
			} else {
				enterInsertMode();
				state.countBuffer = "";
			}
			break;

		case "a":
			if (operatorPending) {
				state.commandBuffer = "a";
			} else {
				setCursorPos(currentInput, getCursorPos(currentInput) + 1);
				enterInsertMode();
				state.countBuffer = "";
			}
			break;

		case "I":
			setCursorPos(
				currentInput,
				getFirstNonBlank(
					currentInput,
					getLineStart(currentInput, getCursorPos(currentInput))
				)
			);
			enterInsertMode();
			state.countBuffer = "";
			break;

		case "A":
			setCursorPos(currentInput, getLineEnd(currentInput, getCursorPos(currentInput)));
			enterInsertMode();
			state.countBuffer = "";
			break;

		case "o":
			saveState(currentInput, undoStack, redoStack);
			const posO = getLineEnd(currentInput, getCursorPos(currentInput));
			currentInput.value =
				currentInput.value.substring(0, posO) + "\n" + currentInput.value.substring(posO);
			setCursorPos(currentInput, posO + 1);
			enterInsertMode();
			state.lastChange = { command: "o", count };
			state.countBuffer = "";
			break;

		case "O":
			saveState(currentInput, undoStack, redoStack);
			const lineStartO = getLineStart(currentInput, getCursorPos(currentInput));
			currentInput.value =
				currentInput.value.substring(0, lineStartO) +
				"\n" +
				currentInput.value.substring(lineStartO);
			setCursorPos(currentInput, lineStartO);
			enterInsertMode();
			state.lastChange = { command: "O", count };
			state.countBuffer = "";
			break;

		case "s":
			saveState(currentInput, undoStack, redoStack);
			const posS = getCursorPos(currentInput);
			currentInput.value =
				currentInput.value.substring(0, posS) + currentInput.value.substring(posS + 1);
			enterInsertMode();
			state.lastChange = { command: "s", count };
			state.countBuffer = "";
			break;

		case "x":
			saveState(currentInput, undoStack, redoStack);
			const posX = getCursorPos(currentInput);
			const endX = Math.min(posX + count, currentInput.value.length);
			clipboard.content = currentInput.value.substring(posX, endX);
			currentInput.value =
				currentInput.value.substring(0, posX) + currentInput.value.substring(endX);
			setCursorPos(currentInput, posX);
			state.lastChange = { command: "x", count };
			state.countBuffer = "";
			break;

		case "X":
			saveState(currentInput, undoStack, redoStack);
			for (let i = 0; i < count; i++) {
				const posXb = getCursorPos(currentInput);
				if (posXb > 0) {
					clipboard.content = currentInput.value[posXb - 1];
					currentInput.value =
						currentInput.value.substring(0, posXb - 1) +
						currentInput.value.substring(posXb);
					setCursorPos(currentInput, posXb - 1);
				}
			}
			state.lastChange = { command: "X", count };
			state.countBuffer = "";
			break;

		case "D":
			// D is equivalent to d$
			saveState(currentInput, undoStack, redoStack);
			const posD = getCursorPos(currentInput);
			const lineEndD = getLineEnd(currentInput, posD);
			clipboard.content = currentInput.value.substring(posD, lineEndD);
			currentInput.value =
				currentInput.value.substring(0, posD) + currentInput.value.substring(lineEndD);
			state.lastChange = { command: "D", count };
			state.countBuffer = "";
			break;

		case "d":
		case "c":
		case "y":
			state.operatorPending = key;
			break;

		case "p":
			saveState(currentInput, undoStack, redoStack);
			const posP = getCursorPos(currentInput) + 1;
			currentInput.value =
				currentInput.value.substring(0, posP) +
				clipboard.content +
				currentInput.value.substring(posP);
			setCursorPos(currentInput, posP + clipboard.content.length - 1);
			state.lastChange = { command: "p", count };
			state.countBuffer = "";
			break;

		case "P":
			saveState(currentInput, undoStack, redoStack);
			const posPb = getCursorPos(currentInput);
			currentInput.value =
				currentInput.value.substring(0, posPb) +
				clipboard.content +
				currentInput.value.substring(posPb);
			setCursorPos(currentInput, posPb + clipboard.content.length - 1);
			state.lastChange = { command: "P", count };
			state.countBuffer = "";
			break;

		case "u":
			undo(currentInput, undoStack, redoStack);
			state.countBuffer = "";
			break;

		case ".":
			if (state.lastChange) {
				repeatLastChange(state);
			}
			state.countBuffer = "";
			break;

		case "v":
			enterVisualMode(false);
			state.countBuffer = "";
			break;

		case "V":
			enterVisualMode(true);
			state.countBuffer = "";
			break;

		default:
			if (/\d/.test(key)) {
				state.countBuffer += key;
			} else {
				state.commandBuffer = "";
				state.countBuffer = "";
				state.operatorPending = null;
			}
	}
}
