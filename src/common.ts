import { debug, TAMPER_VIM_MODE } from "./setup.js";
import type { EditableElement, LineInfo, UndoState } from "./types.js";

// Custom caret management
let customCaret: HTMLDivElement | null = null;

export function createCustomCaret(input: EditableElement): void {
    if (customCaret) {
        customCaret.remove();
    }

    // Check if custom caret is disabled via config
    if (TAMPER_VIM_MODE.disableCustomCaret) {
        debug("createCustomCaret: disabled via config, keeping native caret");
        return;
    }

    // Test if canvas is available before hiding native caret
    const testCanvas = document.createElement("canvas");
    const testCtx = testCanvas.getContext("2d");
    if (!testCtx) {
        debug("createCustomCaret: canvas not available, keeping native caret");
        return;
    }

    // Hide native caret
    input.style.caretColor = "transparent";

    // Create custom caret element
    customCaret = document.createElement("div");
    customCaret.style.position = "absolute";
    customCaret.style.pointerEvents = "none";
    customCaret.style.zIndex = "9999";
    customCaret.style.backgroundColor = "white";
    customCaret.style.mixBlendMode = "difference";
    document.body.appendChild(customCaret);

    updateCustomCaret(input);
}

export function updateCustomCaret(input: EditableElement): void {
    if (!customCaret) return;

    const pos = getCursorPos(input);
    const text = input.value;

    // Measure character dimensions
    const computedStyle = window.getComputedStyle(input);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontFamily = computedStyle.fontFamily;
    const lineHeight =
        computedStyle.lineHeight === "normal"
            ? fontSize * 1.2
            : parseFloat(computedStyle.lineHeight);

    // Create a temporary canvas to measure character width
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Guard against environments without canvas support (e.g., test environments)
    if (!ctx) {
        debug("updateCustomCaret: canvas context not available");
        return;
    }

    ctx.font = `${fontSize}px ${fontFamily}`;

    const char = text[pos] || " ";
    const charWidth = ctx.measureText(char).width;

    // Get input element position
    const rect = input.getBoundingClientRect();

    // Calculate cursor position within the input
    // For single-line inputs (INPUT), use scrollLeft
    // For multi-line (TEXTAREA), calculate line and column
    let x = rect.left;
    let y = rect.top;

    if (input.tagName === "TEXTAREA") {
        // Multi-line: calculate line number and column
        const textBeforeCursor = text.substring(0, pos);
        const lines = textBeforeCursor.split("\n");
        const lineNumber = lines.length - 1;
        const column = lines[lines.length - 1].length;

        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);

        x += paddingLeft + column * charWidth - input.scrollLeft;
        y += paddingTop + lineNumber * lineHeight - input.scrollTop;
    } else {
        // Single-line: use scrollLeft
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        x += paddingLeft + pos * charWidth - input.scrollLeft;
        y += parseFloat(computedStyle.paddingTop);
    }

    // Position and size the caret
    customCaret.style.left = `${x}px`;
    customCaret.style.top = `${y}px`;
    customCaret.style.width = `${charWidth}px`;
    customCaret.style.height = `${lineHeight}px`;
}

export function removeCustomCaret(input: EditableElement | null): void {
    if (customCaret) {
        customCaret.remove();
        customCaret = null;
    }
    if (input) {
        input.style.caretColor = "";
    }
}

// Utility functions
export function getCursorPos(currentInput: EditableElement): number {
    return currentInput.selectionStart ?? 0;
}

export function setCursorPos(currentInput: EditableElement, pos: number): void {
    pos = Math.max(0, Math.min(pos, currentInput.value.length));
    debug("setCursorPos", { pos, valueLength: currentInput.value.length });
    currentInput.selectionStart = pos;
    currentInput.selectionEnd = pos;
    updateCustomCaret(currentInput);
}

export function getLine(currentInput: EditableElement, pos: number): LineInfo {
    const text = currentInput.value;
    let start = pos;
    while (start > 0 && text[start - 1] !== "\n") start--;
    let end = pos;
    while (end < text.length && text[end] !== "\n") end++;
    return { start, end, text: text.substring(start, end) };
}

export function getLineStart(
    currentInput: EditableElement,
    pos: number,
): number {
    const text = currentInput.value;
    while (pos > 0 && text[pos - 1] !== "\n") pos--;
    return pos;
}

export function getLineEnd(currentInput: EditableElement, pos: number): number {
    const text = currentInput.value;
    while (pos < text.length && text[pos] !== "\n") pos++;
    return pos;
}

export function getFirstNonBlank(
    currentInput: EditableElement,
    lineStart: number,
): number {
    const text = currentInput.value;
    let pos = lineStart;
    while (pos < text.length && text[pos] !== "\n" && /\s/.test(text[pos])) {
        pos++;
    }
    return pos;
}

export function isWordChar(char: string): boolean {
    return /\w/.test(char);
}

export function findWordStart(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    if (forward) {
        // Skip current word
        while (pos < text.length && isWordChar(text[pos])) pos++;
        // Skip whitespace
        while (
            pos < text.length &&
            !isWordChar(text[pos]) &&
            text[pos] !== "\n"
        )
            pos++;
        return pos;
    } else {
        // Move back one if we're at word start
        if (pos > 0) pos--;
        // Skip whitespace
        while (pos > 0 && !isWordChar(text[pos]) && text[pos] !== "\n") pos--;
        // Go to word start
        while (pos > 0 && isWordChar(text[pos - 1])) pos--;
        return pos;
    }
}

export function findWordEnd(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    if (forward) {
        // Move to next char if at word boundary
        if (pos < text.length) pos++;
        // Skip whitespace
        while (
            pos < text.length &&
            !isWordChar(text[pos]) &&
            text[pos] !== "\n"
        )
            pos++;
        // Go to word end
        while (pos < text.length && isWordChar(text[pos])) pos++;
        return Math.max(0, pos - 1);
    } else {
        // Skip current word end
        while (pos > 0 && isWordChar(text[pos])) pos--;
        // Skip whitespace
        while (pos > 0 && !isWordChar(text[pos]) && text[pos] !== "\n") pos--;
        return pos;
    }
}

export function findCharInLine(
    currentInput: EditableElement,
    pos: number,
    char: string,
    forward = true,
    till = false,
): number {
    const text = currentInput.value;
    const line = getLine(currentInput, pos);
    debug("findCharInLine", {
        pos,
        char,
        forward,
        till,
        lineStart: line.start,
        lineEnd: line.end,
    });

    if (forward) {
        for (let i = pos + 1; i <= line.end; i++) {
            if (text[i] === char) {
                const result = till ? i - 1 : i;
                debug("findCharInLine result", { found: true, result });
                return result;
            }
        }
    } else {
        for (let i = pos - 1; i >= line.start; i--) {
            if (text[i] === char) {
                const result = till ? i + 1 : i;
                debug("findCharInLine result", { found: true, result });
                return result;
            }
        }
    }
    debug("findCharInLine result", { found: false, result: pos });
    return pos;
}

export function findMatchingPair(
    currentInput: EditableElement,
    pos: number,
): number {
    const text = currentInput.value;
    const char = text[pos];
    const pairs: Record<string, string> = {
        "(": ")",
        "[": "]",
        "{": "}",
        ")": "(",
        "]": "[",
        "}": "{",
    };

    if (!pairs[char]) return pos;

    const target = pairs[char];
    const forward = ["(", "[", "{"].includes(char);
    const step = forward ? 1 : -1;
    let depth = 1;

    for (let i = pos + step; forward ? i < text.length : i >= 0; i += step) {
        if (text[i] === char) depth++;
        else if (text[i] === target) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return pos;
}

export function findParagraphBoundary(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    const lines = text.split("\n");
    const currentLine = text.substring(0, pos).split("\n").length - 1;

    if (forward) {
        // Find next empty line or end
        for (let i = currentLine + 1; i < lines.length; i++) {
            if (lines[i].trim() === "") {
                return text.split("\n").slice(0, i).join("\n").length + 1;
            }
        }
        return text.length;
    } else {
        // Find previous empty line or start
        for (let i = currentLine - 1; i >= 0; i--) {
            if (lines[i].trim() === "") {
                return text
                    .split("\n")
                    .slice(0, i + 1)
                    .join("\n").length;
            }
        }
        return 0;
    }
}

export function findTextObject(
    currentInput: EditableElement,
    type: string,
    inner: boolean,
): { start: number; end: number } {
    const pos = getCursorPos(currentInput);
    const text = currentInput.value;
    debug("findTextObject", { type, inner, pos });

    const pairs: Record<string, { open: string; close: string }> = {
        "(": { open: "(", close: ")" },
        ")": { open: "(", close: ")" },
        "[": { open: "[", close: "]" },
        "]": { open: "[", close: "]" },
        "{": { open: "{", close: "}" },
        "}": { open: "{", close: "}" },
        '"': { open: '"', close: '"' },
        "'": { open: "'", close: "'" },
        "`": { open: "`", close: "`" },
    };

    if (!pairs[type]) {
        debug("findTextObject: invalid type", { type });
        return { start: pos, end: pos };
    }

    const { open, close } = pairs[type];
    let start = -1;
    let end = -1;

    // For quotes, find the containing pair
    if (open === close) {
        let quoteCount = 0;
        let firstQuote = -1;
        for (let i = 0; i <= pos; i++) {
            if (text[i] === open) {
                if (quoteCount % 2 === 0) firstQuote = i;
                quoteCount++;
            }
        }
        if (quoteCount % 2 === 1) {
            start = firstQuote;
            for (let i = start + 1; i < text.length; i++) {
                if (text[i] === close) {
                    end = i;
                    break;
                }
            }
        }
    } else {
        // For brackets/parens/braces, find containing or next pair
        let depth = 0;

        // First try to find if we're inside a pair
        for (let i = pos; i >= 0; i--) {
            if (text[i] === close) {
                depth++;
            } else if (text[i] === open) {
                if (depth === 0) {
                    start = i;
                    break;
                }
                depth--;
            }
        }

        // If we found an opening, find its matching closing
        if (start !== -1) {
            depth = 0;
            for (let i = start; i < text.length; i++) {
                if (text[i] === open) {
                    depth++;
                } else if (text[i] === close) {
                    depth--;
                    if (depth === 0) {
                        end = i;
                        break;
                    }
                }
            }
        }
    }

    // If we didn't find a pair, return empty range
    if (start === -1 || end === -1) {
        debug("findTextObject: no pair found");
        return { start: pos, end: pos };
    }

    const result = inner
        ? { start: start + 1, end: end }
        : { start, end: end + 1 };
    debug("findTextObject result", result);
    return result;
}

// Undo/redo functions
export function saveState(
    currentInput: EditableElement,
    undoStack: UndoState[],
    redoStack: UndoState[],
): void {
    if (!currentInput) return;
    debug("saveState", {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart,
        selectionEnd: currentInput.selectionEnd,
        undoStackSize: undoStack.length,
    });
    undoStack.push({
        value: currentInput.value,
        selectionStart: currentInput.selectionStart ?? 0,
        selectionEnd: currentInput.selectionEnd ?? 0,
    });
    redoStack.length = 0; // Clear redo stack
    if (undoStack.length > 100) undoStack.shift();
}

export function undo(
    currentInput: EditableElement,
    undoStack: UndoState[],
    redoStack: UndoState[],
): void {
    if (undoStack.length === 0) return;
    debug("undo", { undoStackSize: undoStack.length });
    const current = {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart ?? 0,
        selectionEnd: currentInput.selectionEnd ?? 0,
    };
    redoStack.push(current);
    const prev = undoStack.pop()!;
    currentInput.value = prev.value;
    currentInput.selectionStart = prev.selectionStart;
    currentInput.selectionEnd = prev.selectionEnd;
}

export function redo(
    currentInput: EditableElement,
    undoStack: UndoState[],
    redoStack: UndoState[],
): void {
    if (redoStack.length === 0) return;
    debug("redo", { redoStackSize: redoStack.length });
    const current = {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart ?? 0,
        selectionEnd: currentInput.selectionEnd ?? 0,
    };
    undoStack.push(current);
    const next = redoStack.pop()!;
    currentInput.value = next.value;
    currentInput.selectionStart = next.selectionStart;
    currentInput.selectionEnd = next.selectionEnd;
}
