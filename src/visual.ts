import { debug } from "./setup.js";
import {
    getCursorPos,
    setCursorPos,
    getLineStart,
    getLineEnd,
    saveState,
    updateVisualSelection as updateVisualSelectionRender,
    updateCustomCaret,
    updateLineNumbers,
    findCharInLine,
    findTextObject,
} from "./common.js";
import { executeMotion } from "./normal.js";
import { yankRange, deleteRange } from "./normal.js";
import type { EditableElement, Mode, State, TextRange } from "./types.js";

// Visual selection management (now using virtual selection, not native)
export function updateVisualSelection(
    currentInput: EditableElement | null,
    mode: Mode,
    visualStart: number | null,
    visualEnd: number | null,
): void {
    if (!currentInput || visualStart === null || visualEnd === null) return;

    debug("updateVisualSelection", { visualStart, visualEnd });

    // For visual mode, we want to include the character under the cursor
    // so we add 1 to the end position (unless we're at the end of the text)
    // The rendering function will handle min/max ordering internally
    const adjustedEnd =
        mode === "visual-line"
            ? visualEnd
            : Math.min(visualEnd + 1, currentInput.value.length);

    // Use virtual selection rendering instead of native selection
    // Pass visualStart and adjustedEnd directly - don't normalize with min/max here
    updateVisualSelectionRender(currentInput, visualStart, adjustedEnd);

    // Update the custom caret to show at visualEnd (current cursor position)
    // Keep native selection collapsed at visualEnd to track position without showing
    currentInput.selectionStart = visualEnd;
    currentInput.selectionEnd = visualEnd;
    updateCustomCaret(currentInput);
    updateLineNumbers(currentInput);
}

export function extendVisualSelection(
    currentInput: EditableElement,
    mode: Mode,
    visualStart: number,
    visualEnd: number,
    newPos: number,
    visualAnchor: number | null = null,
): { visualStart: number; visualEnd: number } {
    if (mode !== "visual" && mode !== "visual-line")
        return { visualStart, visualEnd };

    debug("extendVisualSelection BEFORE", {
        visualStart,
        visualEnd,
        newPos,
        visualAnchor,
        mode,
    });

    if (mode === "visual-line") {
        // In visual line mode, we need to keep the anchor line fixed and move the other end
        // The anchor is the original position where V was pressed

        if (visualAnchor === null) {
            // Fallback if anchor not set - shouldn't happen but handle gracefully
            visualAnchor = visualEnd;
        }

        const anchorLineStart = getLineStart(currentInput, visualAnchor);
        const anchorLineEnd = getLineEnd(currentInput, visualAnchor);
        const newLineStart = getLineStart(currentInput, newPos);
        const newLineEnd = getLineEnd(currentInput, newPos);

        // Determine if newPos is before or after the anchor line
        if (newLineEnd < anchorLineStart) {
            // Moving before anchor - anchor stays at end, start moves
            visualStart = newLineStart;
            visualEnd = anchorLineEnd;
        } else if (newLineStart > anchorLineEnd) {
            // Moving after anchor - anchor stays at start, end moves
            visualStart = anchorLineStart;
            visualEnd = newLineEnd;
        } else {
            // On the same line as anchor - select just that line
            visualStart = anchorLineStart;
            visualEnd = anchorLineEnd;
        }
    } else {
        // In visual character mode, just update the end
        visualEnd = newPos;
    }

    debug("extendVisualSelection AFTER", { visualStart, visualEnd });
    updateVisualSelection(currentInput, mode, visualStart, visualEnd);

    // In visual-line mode, keep cursor at the motion target position
    // (updateVisualSelection sets it to visualEnd, but we want it at newPos)
    if (mode === "visual-line") {
        setCursorPos(currentInput, newPos);
    }

    return { visualStart, visualEnd };
}

export function getCurrentRange(
    mode: Mode,
    visualStart: number,
    visualEnd: number,
    currentInput: EditableElement,
): TextRange {
    // Returns { start, end } for the current operation range
    // Works for both visual selections and operator+motion combinations
    if (mode === "visual" || mode === "visual-line") {
        const start = Math.min(visualStart, visualEnd);
        const end = Math.max(visualStart, visualEnd);
        // In visual mode, selection is inclusive of the character at visualEnd
        // so we add 1 to include it in the range for operators
        if (mode === "visual-line") {
            // For visual-line mode, include the trailing newline if present
            const lineEnd = end;
            const deleteEnd =
                lineEnd < currentInput.value.length ? lineEnd + 1 : lineEnd;
            return { start, end: deleteEnd };
        } else {
            return { start, end: Math.min(end + 1, currentInput.value.length) };
        }
    }

    // For non-visual modes, return cursor position
    const pos = getCursorPos(currentInput);
    return { start: pos, end: pos };
}

export function processVisualCommand(
    key: string,
    state: State & { exitVisualMode: () => void },
): void {
    const {
        currentInput,
        countBuffer,
        commandBuffer,
        mode,
        visualStart,
        visualEnd,
        visualAnchor,
        undoStack,
        redoStack,
        clipboard,
        enterInsertMode,
        exitVisualMode,
        enterVisualMode,
    } = state;

    if (!currentInput) return;

    // Ignore modifier keys
    if (["Shift", "Control", "Alt", "Meta"].includes(key)) {
        return;
    }

    const count = parseInt(countBuffer) || 1;
    debug("processVisualCommand", { key, count, mode });

    // Handle command sequences FIRST (gg, ge, f, t, F, T, etc.)
    // This must come before motion keys check because some motion keys
    // (like 'w') can also be used as arguments to find commands (fw)
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
                newPos,
                visualAnchor,
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
                newPos,
                visualAnchor,
            );
            state.visualStart = newSelection.visualStart;
            state.visualEnd = newSelection.visualEnd;
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

            let newPos = getCursorPos(currentInput);
            for (let i = 0; i < count; i++) {
                newPos = findCharInLine(
                    currentInput,
                    newPos,
                    key,
                    forward,
                    till,
                );
            }

            setCursorPos(currentInput, newPos);
            const newSelection = extendVisualSelection(
                currentInput,
                mode,
                visualStart,
                visualEnd,
                newPos,
                visualAnchor,
            );
            state.visualStart = newSelection.visualStart;
            state.visualEnd = newSelection.visualEnd;
            state.commandBuffer = "";
            state.countBuffer = "";
            return;
        }

        // Text objects (i or a followed by pair character)
        if (commandBuffer === "i" || commandBuffer === "a") {
            const inner = commandBuffer === "i";
            debug("processVisualCommand: text object", {
                textObject: commandBuffer + key,
                inner,
            });
            const range = findTextObject(currentInput, key, inner);

            // Select the text object range
            state.visualStart = range.start;
            state.visualEnd = range.end - 1; // -1 because visualEnd is inclusive
            updateVisualSelection(
                currentInput,
                mode,
                state.visualStart,
                state.visualEnd,
            );
            state.commandBuffer = "";
            state.countBuffer = "";
            return;
        }

        state.commandBuffer = "";
    }

    // Handle motions - extend selection
    const motionKeys = [
        "h",
        "j",
        "k",
        "l",
        "w",
        "b",
        "e",
        "0",
        "^",
        "$",
        "G",
        "{",
        "}",
        "%",
    ];
    if (motionKeys.includes(key)) {
        executeMotion(currentInput, key, count);
        const newPos = getCursorPos(currentInput);
        const newSelection = extendVisualSelection(
            currentInput,
            mode,
            visualStart,
            visualEnd,
            newPos,
            visualAnchor,
        );
        state.visualStart = newSelection.visualStart;
        state.visualEnd = newSelection.visualEnd;
        state.countBuffer = "";
        return;
    }

    // Handle operators - operate on visual selection then exit
    if (key === "d") {
        const range = getCurrentRange(
            mode,
            visualStart,
            visualEnd,
            currentInput,
        );
        const linewise = mode === "visual-line";
        yankRange(currentInput, clipboard, range.start, range.end, linewise);
        deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
        exitVisualMode();
        state.countBuffer = "";
        return;
    }

    if (key === "y") {
        const range = getCurrentRange(
            mode,
            visualStart,
            visualEnd,
            currentInput,
        );
        const linewise = mode === "visual-line";
        yankRange(currentInput, clipboard, range.start, range.end, linewise);
        exitVisualMode();
        state.countBuffer = "";
        return;
    }

    if (key === "c") {
        const range = getCurrentRange(
            mode,
            visualStart,
            visualEnd,
            currentInput,
        );
        const linewise = mode === "visual-line";
        yankRange(currentInput, clipboard, range.start, range.end, linewise);
        deleteRange(currentInput, undoStack, redoStack, range.start, range.end);
        enterInsertMode("c");
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

    // Handle ; and , for repeating find
    if (key === ";") {
        if (state.lastFindChar) {
            let newPos = getCursorPos(currentInput);
            for (let i = 0; i < count; i++) {
                const till = ["t", "T"].includes(state.lastFindType);
                newPos = findCharInLine(
                    currentInput,
                    newPos,
                    state.lastFindChar,
                    state.lastFindDirection,
                    till,
                );
            }
            setCursorPos(currentInput, newPos);
            const newSelection = extendVisualSelection(
                currentInput,
                mode,
                visualStart,
                visualEnd,
                newPos,
                visualAnchor,
            );
            state.visualStart = newSelection.visualStart;
            state.visualEnd = newSelection.visualEnd;
        }
        state.countBuffer = "";
        return;
    }

    if (key === ",") {
        if (state.lastFindChar) {
            let newPos = getCursorPos(currentInput);
            for (let i = 0; i < count; i++) {
                const till = ["t", "T"].includes(state.lastFindType);
                newPos = findCharInLine(
                    currentInput,
                    newPos,
                    state.lastFindChar,
                    !state.lastFindDirection,
                    till,
                );
            }
            setCursorPos(currentInput, newPos);
            const newSelection = extendVisualSelection(
                currentInput,
                mode,
                visualStart,
                visualEnd,
                newPos,
                visualAnchor,
            );
            state.visualStart = newSelection.visualStart;
            state.visualEnd = newSelection.visualEnd;
        }
        state.countBuffer = "";
        return;
    }

    // Handle other keys
    switch (key) {
        case "g":
        case "f":
        case "F":
        case "t":
        case "T":
        case "i":
        case "a":
            state.commandBuffer = key;
            break;

        case "x":
            // In visual mode, x deletes selection (same as d)
            const range = getCurrentRange(
                mode,
                visualStart,
                visualEnd,
                currentInput,
            );
            const linewiseX = mode === "visual-line";
            yankRange(
                currentInput,
                clipboard,
                range.start,
                range.end,
                linewiseX,
            );
            deleteRange(
                currentInput,
                undoStack,
                redoStack,
                range.start,
                range.end,
            );
            exitVisualMode();
            state.countBuffer = "";
            break;

        case "p":
        case "P":
            // Paste over selection
            saveState(currentInput, undoStack, redoStack);
            const range2 = getCurrentRange(
                mode,
                visualStart,
                visualEnd,
                currentInput,
            );
            deleteRange(
                currentInput,
                undoStack,
                redoStack,
                range2.start,
                range2.end,
            );
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
