import { debug } from './setup.js';

// Utility functions
export function getCursorPos(currentInput) {
    return currentInput.selectionStart;
}

export function setCursorPos(currentInput, pos) {
    pos = Math.max(0, Math.min(pos, currentInput.value.length));
    debug('setCursorPos', { pos, valueLength: currentInput.value.length });
    currentInput.selectionStart = pos;
    currentInput.selectionEnd = pos;
}

export function getLine(currentInput, pos) {
    const text = currentInput.value;
    let start = pos;
    while (start > 0 && text[start - 1] !== '\n') start--;
    let end = pos;
    while (end < text.length && text[end] !== '\n') end++;
    return { start, end, text: text.substring(start, end) };
}

export function getLineStart(currentInput, pos) {
    const text = currentInput.value;
    while (pos > 0 && text[pos - 1] !== '\n') pos--;
    return pos;
}

export function getLineEnd(currentInput, pos) {
    const text = currentInput.value;
    while (pos < text.length && text[pos] !== '\n') pos++;
    return pos;
}

export function getFirstNonBlank(currentInput, lineStart) {
    const text = currentInput.value;
    let pos = lineStart;
    while (pos < text.length && text[pos] !== '\n' && /\s/.test(text[pos])) {
        pos++;
    }
    return pos;
}

export function isWordChar(char) {
    return /\w/.test(char);
}

export function findWordStart(currentInput, pos, forward = true) {
    const text = currentInput.value;
    if (forward) {
        // Skip current word
        while (pos < text.length && isWordChar(text[pos])) pos++;
        // Skip whitespace
        while (pos < text.length && !isWordChar(text[pos]) && text[pos] !== '\n') pos++;
        return pos;
    } else {
        // Move back one if we're at word start
        if (pos > 0) pos--;
        // Skip whitespace
        while (pos > 0 && !isWordChar(text[pos]) && text[pos] !== '\n') pos--;
        // Go to word start
        while (pos > 0 && isWordChar(text[pos - 1])) pos--;
        return pos;
    }
}

export function findWordEnd(currentInput, pos, forward = true) {
    const text = currentInput.value;
    if (forward) {
        // Move to next char if at word boundary
        if (pos < text.length) pos++;
        // Skip whitespace
        while (pos < text.length && !isWordChar(text[pos]) && text[pos] !== '\n') pos++;
        // Go to word end
        while (pos < text.length && isWordChar(text[pos])) pos++;
        return Math.max(0, pos - 1);
    } else {
        // Skip current word end
        while (pos > 0 && isWordChar(text[pos])) pos--;
        // Skip whitespace
        while (pos > 0 && !isWordChar(text[pos]) && text[pos] !== '\n') pos--;
        return pos;
    }
}

export function findCharInLine(currentInput, pos, char, forward = true, till = false) {
    const text = currentInput.value;
    const line = getLine(currentInput, pos);
    debug('findCharInLine', { pos, char, forward, till, lineStart: line.start, lineEnd: line.end });

    if (forward) {
        for (let i = pos + 1; i <= line.end; i++) {
            if (text[i] === char) {
                const result = till ? i - 1 : i;
                debug('findCharInLine result', { found: true, result });
                return result;
            }
        }
    } else {
        for (let i = pos - 1; i >= line.start; i--) {
            if (text[i] === char) {
                const result = till ? i + 1 : i;
                debug('findCharInLine result', { found: true, result });
                return result;
            }
        }
    }
    debug('findCharInLine result', { found: false, result: pos });
    return pos;
}

export function findMatchingPair(currentInput, pos) {
    const text = currentInput.value;
    const char = text[pos];
    const pairs = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };

    if (!pairs[char]) return pos;

    const target = pairs[char];
    const forward = ['(', '[', '{'].includes(char);
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

export function findParagraphBoundary(currentInput, pos, forward = true) {
    const text = currentInput.value;
    const lines = text.split('\n');
    let currentLine = text.substring(0, pos).split('\n').length - 1;

    if (forward) {
        // Find next empty line or end
        for (let i = currentLine + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') {
                return text.split('\n').slice(0, i).join('\n').length + 1;
            }
        }
        return text.length;
    } else {
        // Find previous empty line or start
        for (let i = currentLine - 1; i >= 0; i--) {
            if (lines[i].trim() === '') {
                return text.split('\n').slice(0, i + 1).join('\n').length;
            }
        }
        return 0;
    }
}

export function findTextObject(currentInput, type, inner) {
    const pos = getCursorPos(currentInput);
    const text = currentInput.value;
    debug('findTextObject', { type, inner, pos });

    const pairs = {
        '(': { open: '(', close: ')' },
        ')': { open: '(', close: ')' },
        '[': { open: '[', close: ']' },
        ']': { open: '[', close: ']' },
        '{': { open: '{', close: '}' },
        '}': { open: '{', close: '}' },
        '"': { open: '"', close: '"' },
        "'": { open: "'", close: "'" },
        '`': { open: '`', close: '`' }
    };

    if (!pairs[type]) {
        debug('findTextObject: invalid type', { type });
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
        debug('findTextObject: no pair found');
        return { start: pos, end: pos };
    }

    const result = inner
        ? { start: start + 1, end: end }
        : { start, end: end + 1 };
    debug('findTextObject result', result);
    return result;
}

// Undo/redo functions
export function saveState(currentInput, undoStack, redoStack) {
    if (!currentInput) return;
    debug('saveState', {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart,
        selectionEnd: currentInput.selectionEnd,
        undoStackSize: undoStack.length
    });
    undoStack.push({
        value: currentInput.value,
        selectionStart: currentInput.selectionStart,
        selectionEnd: currentInput.selectionEnd
    });
    redoStack.length = 0; // Clear redo stack
    if (undoStack.length > 100) undoStack.shift();
}

export function undo(currentInput, undoStack, redoStack) {
    if (undoStack.length === 0) return;
    debug('undo', { undoStackSize: undoStack.length });
    const current = {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart,
        selectionEnd: currentInput.selectionEnd
    };
    redoStack.push(current);
    const prev = undoStack.pop();
    currentInput.value = prev.value;
    currentInput.selectionStart = prev.selectionStart;
    currentInput.selectionEnd = prev.selectionEnd;
}

export function redo(currentInput, undoStack, redoStack) {
    if (redoStack.length === 0) return;
    debug('redo', { redoStackSize: redoStack.length });
    const current = {
        value: currentInput.value,
        selectionStart: currentInput.selectionStart,
        selectionEnd: currentInput.selectionEnd
    };
    undoStack.push(current);
    const next = redoStack.pop();
    currentInput.value = next.value;
    currentInput.selectionStart = next.selectionStart;
    currentInput.selectionEnd = next.selectionEnd;
}
