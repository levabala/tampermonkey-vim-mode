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
    findWORDStart,
    findWORDEnd,
    findCharInLine,
    findMatchingPair,
    findParagraphBoundary,
    findTextObject,
    saveState,
    undo,
} from "./common.js";
import type { EditableElement, TextRange, State, UndoState } from "./types.js";

// Column memory for vertical motions (j/k)
// Vim remembers the column you want to be in when moving vertically through
// lines shorter than that column
let wantedColumn: number | null = null;

// Reset column memory (useful for testing)
export function resetColumnMemory(): void {
    wantedColumn = null;
}

// Motion functions
export function executeMotion(
    currentInput: EditableElement,
    motion: string,
    count = 1,
): number {
    let pos = getCursorPos(currentInput);
    debug("executeMotion", { motion, count, startPos: pos });

    for (let i = 0; i < count; i++) {
        switch (motion) {
            case "h":
                pos = Math.max(0, pos - 1);
                wantedColumn = null; // Reset on horizontal movement
                break;
            case "l": {
                // In normal mode, cursor can't go past the last character
                const maxPos = Math.max(0, currentInput.value.length - 1);
                pos = Math.min(maxPos, pos + 1);
                wantedColumn = null; // Reset on horizontal movement
                break;
            }
            case "j": {
                const currentLineJ = getLine(currentInput, pos);
                const offsetJ = pos - currentLineJ.start;

                // Initialize or maintain wanted column
                if (wantedColumn === null) {
                    wantedColumn = offsetJ;
                }

                const nextLineStartJ = currentLineJ.end + 1;
                if (nextLineStartJ < currentInput.value.length) {
                    const nextLineJ = getLine(currentInput, nextLineStartJ);
                    // Use wanted column, clamped to line length
                    pos = Math.min(
                        nextLineJ.start + wantedColumn,
                        nextLineJ.end,
                    );
                }
                break;
            }
            case "k": {
                const currentLineK = getLine(currentInput, pos);
                const offsetK = pos - currentLineK.start;

                // Initialize or maintain wanted column
                if (wantedColumn === null) {
                    wantedColumn = offsetK;
                }

                if (currentLineK.start > 0) {
                    const prevLineK = getLine(
                        currentInput,
                        currentLineK.start - 1,
                    );
                    // Use wanted column, clamped to line length
                    pos = Math.min(
                        prevLineK.start + wantedColumn,
                        prevLineK.end,
                    );
                }
                break;
            }
            case "w":
                pos = findWordStart(currentInput, pos, true);
                wantedColumn = null;
                break;
            case "W":
                pos = findWORDStart(currentInput, pos, true);
                wantedColumn = null;
                break;
            case "b":
                pos = findWordStart(currentInput, pos, false);
                wantedColumn = null;
                break;
            case "B":
                pos = findWORDStart(currentInput, pos, false);
                wantedColumn = null;
                break;
            case "e":
                pos = findWordEnd(currentInput, pos, true);
                wantedColumn = null;
                break;
            case "E":
                pos = findWORDEnd(currentInput, pos, true);
                wantedColumn = null;
                break;
            case "ge":
                pos = findWordEnd(currentInput, pos, false);
                wantedColumn = null;
                break;
            case "0":
                pos = getLineStart(currentInput, pos);
                wantedColumn = null;
                break;
            case "^":
                pos = getFirstNonBlank(
                    currentInput,
                    getLineStart(currentInput, pos),
                );
                wantedColumn = null;
                break;
            case "$": {
                const lineEnd = getLineEnd(currentInput, pos);
                // In Vim, $ positions cursor at last character, not after it
                // If there's content on the line, position at last char
                const line = getLine(currentInput, pos);
                if (lineEnd > line.start) {
                    pos = lineEnd - 1;
                } else {
                    pos = lineEnd;
                }
                wantedColumn = null;
                break;
            }
            case "gg": {
                // gg behaves like a vertical motion - maintains column
                const currentLine = getLine(currentInput, pos);
                const offset = pos - currentLine.start;

                // Initialize or maintain wanted column
                if (wantedColumn === null) {
                    wantedColumn = offset;
                }

                // Move to first line, same column
                const firstLine = getLine(currentInput, 0);
                pos = Math.min(firstLine.start + wantedColumn, firstLine.end);
                break;
            }
            case "G": {
                // G behaves like a vertical motion - maintains column
                const currentLineG = getLine(currentInput, pos);
                const offsetG = pos - currentLineG.start;

                // Initialize or maintain wanted column
                if (wantedColumn === null) {
                    wantedColumn = offsetG;
                }

                const text = currentInput.value;
                let targetLineStart: number;

                // If count is specified, go to that line number
                // Otherwise go to last line
                if (count > 1) {
                    // Go to line number specified by count
                    const lines = text.split("\n");
                    const targetLineIndex = Math.min(
                        count - 1,
                        lines.length - 1,
                    );
                    targetLineStart = lines
                        .slice(0, targetLineIndex)
                        .join("\n").length;
                    if (targetLineIndex > 0) targetLineStart += 1; // Account for newline
                } else {
                    // Find start of last line
                    targetLineStart = text.length;
                    while (
                        targetLineStart > 0 &&
                        text[targetLineStart - 1] !== "\n"
                    )
                        targetLineStart--;
                }

                // Move to target line, same column
                const targetLine = getLine(currentInput, targetLineStart);
                pos = Math.min(targetLine.start + wantedColumn, targetLine.end);
                break;
            }
            case "{":
                pos = findParagraphBoundary(currentInput, pos, false);
                wantedColumn = null;
                break;
            case "}":
                pos = findParagraphBoundary(currentInput, pos, true);
                wantedColumn = null;
                break;
            case "%":
                pos = findMatchingPair(currentInput, pos);
                wantedColumn = null;
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
    count = 1,
): TextRange {
    const startPos = getCursorPos(currentInput);
    debug("getMotionRange", { motion, count, startPos });
    executeMotion(currentInput, motion, count);
    let endPos = getCursorPos(currentInput);
    setCursorPos(currentInput, startPos);

    // Some motions are inclusive (the character at endPos should be included)
    // $ motion is inclusive when used with operators
    if (motion === "$") {
        endPos = Math.min(endPos + 1, currentInput.value.length);
    }

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
    end: number,
): void {
    debug("deleteRange", {
        start,
        end,
        deleted: currentInput.value.substring(start, end),
    });
    saveState(currentInput, undoStack, redoStack);
    const text = currentInput.value;
    currentInput.value = text.substring(0, start) + text.substring(end);
    setCursorPos(currentInput, start);
}

export function yankRange(
    currentInput: EditableElement,
    clipboard: { content: string; linewise: boolean },
    start: number,
    end: number,
    linewise = false,
): void {
    const yanked = currentInput.value.substring(start, end);
    debug("yankRange", { start, end, yanked, linewise });
    clipboard.content = yanked;
    clipboard.linewise = linewise;
}

export function changeRange(
    currentInput: EditableElement,
    undoStack: UndoState[],
    redoStack: UndoState[],
    start: number,
    end: number,
    enterInsertMode: (command?: string) => void,
): void {
    debug("changeRange", { start, end });
    deleteRange(currentInput, undoStack, redoStack, start, end);
    enterInsertMode("c");
}

export function repeatLastChange(state: State): void {
    const { lastChange, currentInput, undoStack, redoStack } = state;

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
            case "i":
            case "a":
            case "I":
            case "A":
                // Repeat insert: insert the text that was typed
                if (lastChange.insertedText) {
                    saveState(currentInput, undoStack, redoStack);
                    const pos = getCursorPos(currentInput);
                    currentInput.value =
                        currentInput.value.substring(0, pos) +
                        lastChange.insertedText +
                        currentInput.value.substring(pos);
                    setCursorPos(
                        currentInput,
                        pos + lastChange.insertedText.length - 1,
                    );
                }
                break;
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

export function processNormalCommand(key: string, state: State): boolean {
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

    if (!currentInput) return false;

    // Ignore modifier keys
    if (["Shift", "Control", "Alt", "Meta"].includes(key)) {
        return false;
    }

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
            debug("processCommand: double operator", {
                operator: operatorPending,
                count,
            });
            const line = getLine(currentInput, getCursorPos(currentInput));
            const start = line.start;
            // For line-wise operations, yank just the line content (without the newline)
            // but remember it's linewise
            const yankEnd = line.end;
            // For deletion, include the newline
            const deleteEnd =
                line.end < currentInput.value.length ? line.end + 1 : line.end;

            if (operatorPending === "d") {
                yankRange(currentInput, clipboard, start, yankEnd, true);
                deleteRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    start,
                    deleteEnd,
                );
                state.lastChange = { operator: "d", motion: "d", count };
            } else if (operatorPending === "y") {
                yankRange(currentInput, clipboard, start, yankEnd, true);
                state.lastChange = { operator: "y", motion: "y", count };
            } else if (operatorPending === "c") {
                yankRange(currentInput, clipboard, start, yankEnd, true);
                // cc should delete line content but preserve the line (newline)
                changeRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    start,
                    yankEnd,
                    enterInsertMode,
                );
                state.lastChange = { operator: "c", motion: "c", count };
            }

            state.operatorPending = null;
            state.countBuffer = "";
            return true;
        }

        // Check if user is starting a text object (pressing 'i' or 'a')
        if (key === "i" || key === "a") {
            state.commandBuffer = key;
            return true;
        }

        // Check if user is starting a find motion (pressing 'f', 'F', 't', or 'T')
        if (["f", "F", "t", "T"].includes(key)) {
            state.commandBuffer = key;
            return true;
        }

        // Find motions (f, F, t, T followed by a character)
        if (["f", "F", "t", "T"].includes(commandBuffer)) {
            debug("processCommand: find motion with operator", {
                operator: operatorPending,
                findMotion: commandBuffer,
                char: key,
                count,
            });
            const forward = ["f", "t"].includes(commandBuffer);
            const till = ["t", "T"].includes(commandBuffer);
            state.lastFindChar = key;
            state.lastFindDirection = forward;
            state.lastFindType = commandBuffer;

            const startPos = getCursorPos(currentInput);
            for (let i = 0; i < count; i++) {
                const newPos = findCharInLine(
                    currentInput,
                    getCursorPos(currentInput),
                    key,
                    forward,
                    till,
                );
                setCursorPos(currentInput, newPos);
            }
            const endPos = getCursorPos(currentInput);
            debug("processCommand: find motion result", {
                startPos,
                endPos,
                moved: startPos !== endPos,
            });
            setCursorPos(currentInput, startPos);

            // For f/F motions with operators, include the target character
            // For t/T motions, stop before the character
            const inclusiveEnd = till ? endPos : endPos + 1;
            const range = {
                start: Math.min(startPos, inclusiveEnd),
                end: Math.max(startPos, inclusiveEnd),
            };

            if (operatorPending === "d") {
                yankRange(currentInput, clipboard, range.start, range.end);
                deleteRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                );
                state.lastChange = {
                    operator: "d",
                    motion: commandBuffer + key,
                    count,
                };
            } else if (operatorPending === "y") {
                yankRange(currentInput, clipboard, range.start, range.end);
                state.lastChange = {
                    operator: "y",
                    motion: commandBuffer + key,
                    count,
                };
            } else if (operatorPending === "c") {
                yankRange(currentInput, clipboard, range.start, range.end);
                changeRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                    enterInsertMode,
                );
                state.lastChange = {
                    operator: "c",
                    motion: commandBuffer + key,
                    count,
                };
            }

            state.operatorPending = null;
            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
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
                deleteRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                );
                state.lastChange = {
                    operator: "d",
                    textObject: commandBuffer + key,
                    count,
                };
            } else if (operatorPending === "y") {
                yankRange(currentInput, clipboard, range.start, range.end);
                state.lastChange = {
                    operator: "y",
                    textObject: commandBuffer + key,
                    count,
                };
            } else if (operatorPending === "c") {
                yankRange(currentInput, clipboard, range.start, range.end);
                changeRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                    enterInsertMode,
                );
                state.lastChange = {
                    operator: "c",
                    textObject: commandBuffer + key,
                    count,
                };
            }

            state.operatorPending = null;
            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
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
            deleteRange(
                currentInput,
                undoStack,
                redoStack,
                range.start,
                range.end,
            );
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
                enterInsertMode,
            );
            state.lastChange = { operator: "c", motion: key, count };
        }

        state.operatorPending = null;
        state.commandBuffer = "";
        state.countBuffer = "";
        return true;
    }

    // Handle command sequences
    if (commandBuffer) {
        const fullCommand = commandBuffer + key;

        if (fullCommand === "gg") {
            executeMotion(currentInput, "gg", count);
            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
        }

        if (commandBuffer === "g" && key === "e") {
            executeMotion(currentInput, "ge", count);
            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
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
                    till,
                );
                setCursorPos(currentInput, newPos);
            }

            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
        }

        if (commandBuffer === "r") {
            // Replace character
            saveState(currentInput, undoStack, redoStack);
            const pos = getCursorPos(currentInput);
            const text = currentInput.value;
            currentInput.value =
                text.substring(0, pos) + key + text.substring(pos + 1);
            state.lastChange = { command: "r", char: key, count };
            state.commandBuffer = "";
            state.countBuffer = "";
            return true;
        }

        state.commandBuffer = "";
    }

    // Single key commands
    let handled = true; // Track if we handled the command
    switch (key) {
        case "h":
        case "j":
        case "k":
        case "l":
        case "w":
        case "W":
        case "b":
        case "B":
        case "e":
        case "E":
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
                        till,
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
                        till,
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
                enterInsertMode("i");
                state.countBuffer = "";
            }
            break;

        case "a":
            if (operatorPending) {
                state.commandBuffer = "a";
            } else {
                setCursorPos(currentInput, getCursorPos(currentInput) + 1);
                enterInsertMode("a");
                state.countBuffer = "";
            }
            break;

        case "I":
            setCursorPos(
                currentInput,
                getFirstNonBlank(
                    currentInput,
                    getLineStart(currentInput, getCursorPos(currentInput)),
                ),
            );
            enterInsertMode("I");
            state.countBuffer = "";
            break;

        case "A":
            setCursorPos(
                currentInput,
                getLineEnd(currentInput, getCursorPos(currentInput)),
            );
            enterInsertMode("A");
            state.countBuffer = "";
            break;

        case "o":
            saveState(currentInput, undoStack, redoStack);
            const posO = getLineEnd(currentInput, getCursorPos(currentInput));
            currentInput.value =
                currentInput.value.substring(0, posO) +
                "\n" +
                currentInput.value.substring(posO);
            setCursorPos(currentInput, posO + 1);
            enterInsertMode("o");
            state.lastChange = { command: "o", count };
            state.countBuffer = "";
            break;

        case "O":
            saveState(currentInput, undoStack, redoStack);
            const lineStartO = getLineStart(
                currentInput,
                getCursorPos(currentInput),
            );
            currentInput.value =
                currentInput.value.substring(0, lineStartO) +
                "\n" +
                currentInput.value.substring(lineStartO);
            setCursorPos(currentInput, lineStartO);
            enterInsertMode("O");
            state.lastChange = { command: "O", count };
            state.countBuffer = "";
            break;

        case "s":
            saveState(currentInput, undoStack, redoStack);
            const posS = getCursorPos(currentInput);
            currentInput.value =
                currentInput.value.substring(0, posS) +
                currentInput.value.substring(posS + 1);
            setCursorPos(currentInput, posS);
            enterInsertMode("s");
            state.lastChange = { command: "s", count };
            state.countBuffer = "";
            break;

        case "x":
            saveState(currentInput, undoStack, redoStack);
            const posX = getCursorPos(currentInput);
            const endX = Math.min(posX + count, currentInput.value.length);
            clipboard.content = currentInput.value.substring(posX, endX);
            clipboard.linewise = false;
            currentInput.value =
                currentInput.value.substring(0, posX) +
                currentInput.value.substring(endX);
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
                    clipboard.linewise = false;
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
            clipboard.linewise = false;
            currentInput.value =
                currentInput.value.substring(0, posD) +
                currentInput.value.substring(lineEndD);
            state.lastChange = { command: "D", count };
            state.countBuffer = "";
            break;

        case "C":
            // C is equivalent to c$
            saveState(currentInput, undoStack, redoStack);
            const posC = getCursorPos(currentInput);
            const lineEndC = getLineEnd(currentInput, posC);
            clipboard.content = currentInput.value.substring(posC, lineEndC);
            clipboard.linewise = false;
            currentInput.value =
                currentInput.value.substring(0, posC) +
                currentInput.value.substring(lineEndC);
            setCursorPos(currentInput, posC);
            enterInsertMode("C");
            state.lastChange = { command: "C", count };
            state.countBuffer = "";
            break;

        case "d":
        case "c":
        case "y":
            state.operatorPending = key;
            break;

        case "p":
            saveState(currentInput, undoStack, redoStack);
            if (clipboard.linewise) {
                // Line-wise paste: insert below current line
                const currentLine = getLine(
                    currentInput,
                    getCursorPos(currentInput),
                );
                const insertPos = currentLine.end;
                currentInput.value =
                    currentInput.value.substring(0, insertPos) +
                    "\n" +
                    clipboard.content +
                    currentInput.value.substring(insertPos);
                // Set cursor to first character of pasted content
                setCursorPos(currentInput, insertPos + 1);
            } else {
                // Character-wise paste: insert after cursor
                const posP = getCursorPos(currentInput) + 1;
                currentInput.value =
                    currentInput.value.substring(0, posP) +
                    clipboard.content +
                    currentInput.value.substring(posP);
                setCursorPos(currentInput, posP + clipboard.content.length - 1);
            }
            state.lastChange = { command: "p", count };
            state.countBuffer = "";
            break;

        case "P":
            saveState(currentInput, undoStack, redoStack);
            if (clipboard.linewise) {
                // Line-wise paste: insert above current line
                const currentLine = getLine(
                    currentInput,
                    getCursorPos(currentInput),
                );
                const insertPos = currentLine.start;
                currentInput.value =
                    currentInput.value.substring(0, insertPos) +
                    clipboard.content +
                    "\n" +
                    currentInput.value.substring(insertPos);
                // Set cursor to first character of pasted content
                setCursorPos(currentInput, insertPos);
            } else {
                // Character-wise paste: insert before cursor
                const posPb = getCursorPos(currentInput);
                currentInput.value =
                    currentInput.value.substring(0, posPb) +
                    clipboard.content +
                    currentInput.value.substring(posPb);
                setCursorPos(
                    currentInput,
                    posPb + clipboard.content.length - 1,
                );
            }
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
                handled = false; // Not handled - unknown key
            }
    }

    return handled;
}
