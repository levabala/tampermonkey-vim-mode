// ==UserScript==
// @name         Vim Mode for Text Inputs
// @namespace    http://tampermonkey.net/
// @version      1.0.9
// @description  Vim-like editing for textareas and inputs
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/main/tampermonkey_vim_mode.js
// @downloadURL  https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/main/tampermonkey_vim_mode.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // State
    let mode = 'normal';
    let currentInput = null;
    let commandBuffer = '';
    let countBuffer = '';
    let operatorPending = null;
    let lastFindChar = null;
    let lastFindDirection = null;
    let lastFindType = null; // 'f', 't', 'F', or 'T'
    let clipboard = '';
    let undoStack = [];
    let redoStack = [];
    let lastChange = null;
    let allowBlur = false; // Track whether blur is intentional

    // Mode indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        border-radius: 4px;
        z-index: 999999;
        pointer-events: none;
    `;
    document.body.appendChild(indicator);

    function updateIndicator() {
        if (mode === 'insert') {
            indicator.textContent = '-- INSERT --';
            indicator.style.background = 'rgba(0, 100, 0, 0.85)';
        } else {
            indicator.textContent = '-- NORMAL --';
            indicator.style.background = 'rgba(0, 0, 0, 0.85)';
        }
        indicator.style.display = currentInput ? 'block' : 'none';
    }

    // Utility functions
    function saveState() {
        if (!currentInput) return;
        undoStack.push({
            value: currentInput.value,
            selectionStart: currentInput.selectionStart,
            selectionEnd: currentInput.selectionEnd
        });
        redoStack = [];
        if (undoStack.length > 100) undoStack.shift();
    }

    function undo() {
        if (undoStack.length === 0) return;
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

    function redo() {
        if (redoStack.length === 0) return;
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

    function getCursorPos() {
        return currentInput.selectionStart;
    }

    function setCursorPos(pos) {
        pos = Math.max(0, Math.min(pos, currentInput.value.length));
        currentInput.selectionStart = pos;
        currentInput.selectionEnd = pos;
    }

    function getLine(pos) {
        const text = currentInput.value;
        let start = pos;
        while (start > 0 && text[start - 1] !== '\n') start--;
        let end = pos;
        while (end < text.length && text[end] !== '\n') end++;
        return { start, end, text: text.substring(start, end) };
    }

    function getLineStart(pos) {
        const text = currentInput.value;
        while (pos > 0 && text[pos - 1] !== '\n') pos--;
        return pos;
    }

    function getLineEnd(pos) {
        const text = currentInput.value;
        while (pos < text.length && text[pos] !== '\n') pos++;
        return pos;
    }

    function getFirstNonBlank(lineStart) {
        const text = currentInput.value;
        let pos = lineStart;
        while (pos < text.length && text[pos] !== '\n' && /\s/.test(text[pos])) {
            pos++;
        }
        return pos;
    }

    function isWordChar(char) {
        return /\w/.test(char);
    }

    function findWordStart(pos, forward = true) {
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

    function findWordEnd(pos, forward = true) {
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

    function findCharInLine(pos, char, forward = true, till = false) {
        const text = currentInput.value;
        const line = getLine(pos);

        if (forward) {
            for (let i = pos + 1; i <= line.end; i++) {
                if (text[i] === char) {
                    return till ? i - 1 : i;
                }
            }
        } else {
            for (let i = pos - 1; i >= line.start; i--) {
                if (text[i] === char) {
                    return till ? i + 1 : i;
                }
            }
        }
        return pos;
    }

    function findMatchingPair(pos) {
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

    function findParagraphBoundary(pos, forward = true) {
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

    function findTextObject(type, inner) {
        const pos = getCursorPos();
        const text = currentInput.value;

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

        if (!pairs[type]) return { start: pos, end: pos };

        const { open, close } = pairs[type];
        let start = pos;
        let end = pos;

        // Find opening
        let depth = 0;
        for (let i = pos; i >= 0; i--) {
            if (text[i] === close) depth++;
            if (text[i] === open) {
                if (depth === 0) {
                    start = i;
                    break;
                }
                depth--;
            }
        }

        // Find closing
        depth = 0;
        for (let i = pos; i < text.length; i++) {
            if (text[i] === open) depth++;
            if (text[i] === close) {
                if (depth === 0) {
                    end = i;
                    break;
                }
                depth--;
            }
        }

        if (inner) {
            return { start: start + 1, end: end };
        } else {
            return { start, end: end + 1 };
        }
    }

    // Motion functions
    function executeMotion(motion, count = 1) {
        let pos = getCursorPos();

        for (let i = 0; i < count; i++) {
            switch (motion) {
                case 'h':
                    pos = Math.max(0, pos - 1);
                    break;
                case 'l':
                    pos = Math.min(currentInput.value.length, pos + 1);
                    break;
                case 'j':
                    const currentLineJ = getLine(pos);
                    const offsetJ = pos - currentLineJ.start;
                    const nextLineStartJ = currentLineJ.end + 1;
                    if (nextLineStartJ < currentInput.value.length) {
                        const nextLineJ = getLine(nextLineStartJ);
                        pos = Math.min(nextLineJ.start + offsetJ, nextLineJ.end);
                    }
                    break;
                case 'k':
                    const currentLineK = getLine(pos);
                    const offsetK = pos - currentLineK.start;
                    if (currentLineK.start > 0) {
                        const prevLineK = getLine(currentLineK.start - 1);
                        pos = Math.min(prevLineK.start + offsetK, prevLineK.end);
                    }
                    break;
                case 'w':
                    pos = findWordStart(pos, true);
                    break;
                case 'b':
                    pos = findWordStart(pos, false);
                    break;
                case 'e':
                    pos = findWordEnd(pos, true);
                    break;
                case 'ge':
                    pos = findWordEnd(pos, false);
                    break;
                case '0':
                    pos = getLineStart(pos);
                    break;
                case '^':
                    pos = getFirstNonBlank(getLineStart(pos));
                    break;
                case '$':
                    pos = getLineEnd(pos);
                    break;
                case 'gg':
                    pos = 0;
                    break;
                case 'G':
                    pos = currentInput.value.length;
                    break;
                case '{':
                    pos = findParagraphBoundary(pos, false);
                    break;
                case '}':
                    pos = findParagraphBoundary(pos, true);
                    break;
                case '%':
                    pos = findMatchingPair(pos);
                    break;
            }
        }

        setCursorPos(pos);
        return pos;
    }

    function getMotionRange(motion, count = 1) {
        const startPos = getCursorPos();
        executeMotion(motion, count);
        const endPos = getCursorPos();
        setCursorPos(startPos);

        return {
            start: Math.min(startPos, endPos),
            end: Math.max(startPos, endPos)
        };
    }

    // Operator functions
    function deleteRange(start, end) {
        saveState();
        const text = currentInput.value;
        currentInput.value = text.substring(0, start) + text.substring(end);
        setCursorPos(start);
    }

    function yankRange(start, end) {
        clipboard = currentInput.value.substring(start, end);
    }

    function changeRange(start, end) {
        deleteRange(start, end);
        switchMode('insert');
    }

    // Mode switching
    function switchMode(newMode) {
        mode = newMode;
        updateIndicator();

        if (mode === 'normal') {
            // Move cursor back one if at end of line (vim behavior)
            const pos = getCursorPos();
            const lineEnd = getLineEnd(pos);
            if (pos === lineEnd && pos > 0 && currentInput.value[pos - 1] !== '\n') {
                setCursorPos(pos - 1);
            }
        }
    }

    // Command processing
    function processCommand(key) {
        const count = parseInt(countBuffer) || 1;

        // Handle operators
        if (operatorPending) {
            if (key === operatorPending) {
                // Double operator (e.g., dd, yy, cc)
                const line = getLine(getCursorPos());
                const start = line.start;
                const end = line.end < currentInput.value.length ? line.end + 1 : line.end;

                if (operatorPending === 'd') {
                    yankRange(start, end);
                    deleteRange(start, end);
                    lastChange = { operator: 'd', motion: 'd', count };
                } else if (operatorPending === 'y') {
                    yankRange(start, end);
                    lastChange = { operator: 'y', motion: 'y', count };
                } else if (operatorPending === 'c') {
                    yankRange(start, end);
                    changeRange(start, end);
                    lastChange = { operator: 'c', motion: 'c', count };
                }

                operatorPending = null;
                countBuffer = '';
                return;
            }

            // Text objects
            if (commandBuffer === 'i' || commandBuffer === 'a') {
                const inner = commandBuffer === 'i';
                const range = findTextObject(key, inner);

                if (operatorPending === 'd') {
                    yankRange(range.start, range.end);
                    deleteRange(range.start, range.end);
                    lastChange = { operator: 'd', textObject: commandBuffer + key, count };
                } else if (operatorPending === 'y') {
                    yankRange(range.start, range.end);
                    lastChange = { operator: 'y', textObject: commandBuffer + key, count };
                } else if (operatorPending === 'c') {
                    yankRange(range.start, range.end);
                    changeRange(range.start, range.end);
                    lastChange = { operator: 'c', textObject: commandBuffer + key, count };
                }

                operatorPending = null;
                commandBuffer = '';
                countBuffer = '';
                return;
            }

            // Motion-based operations
            const range = getMotionRange(key, count);

            if (operatorPending === 'd') {
                yankRange(range.start, range.end);
                deleteRange(range.start, range.end);
                lastChange = { operator: 'd', motion: key, count };
            } else if (operatorPending === 'y') {
                yankRange(range.start, range.end);
                lastChange = { operator: 'y', motion: key, count };
            } else if (operatorPending === 'c') {
                yankRange(range.start, range.end);
                changeRange(range.start, range.end);
                lastChange = { operator: 'c', motion: key, count };
            }

            operatorPending = null;
            commandBuffer = '';
            countBuffer = '';
            return;
        }

        // Handle command sequences
        if (commandBuffer) {
            const fullCommand = commandBuffer + key;

            if (fullCommand === 'gg') {
                executeMotion('gg', count);
                commandBuffer = '';
                countBuffer = '';
                return;
            }

            if (commandBuffer === 'g' && key === 'e') {
                executeMotion('ge', count);
                commandBuffer = '';
                countBuffer = '';
                return;
            }

            // f, F, t, T commands
            if (['f', 'F', 't', 'T'].includes(commandBuffer)) {
                const forward = ['f', 't'].includes(commandBuffer);
                const till = ['t', 'T'].includes(commandBuffer);
                lastFindChar = key;
                lastFindDirection = forward;
                lastFindType = commandBuffer;

                for (let i = 0; i < count; i++) {
                    const newPos = findCharInLine(getCursorPos(), key, forward, till);
                    setCursorPos(newPos);
                }

                commandBuffer = '';
                countBuffer = '';
                return;
            }

            if (commandBuffer === 'r') {
                // Replace character
                saveState();
                const pos = getCursorPos();
                const text = currentInput.value;
                currentInput.value = text.substring(0, pos) + key + text.substring(pos + 1);
                lastChange = { command: 'r', char: key, count };
                commandBuffer = '';
                countBuffer = '';
                return;
            }

            commandBuffer = '';
        }

        // Single key commands
        switch (key) {
            case 'h':
            case 'j':
            case 'k':
            case 'l':
            case 'w':
            case 'b':
            case 'e':
            case '0':
            case '^':
            case '$':
            case 'G':
            case '{':
            case '}':
            case '%':
                executeMotion(key, count);
                countBuffer = '';
                break;

            case 'g':
            case 'f':
            case 'F':
            case 't':
            case 'T':
            case 'r':
                commandBuffer = key;
                break;

            case ';':
                if (lastFindChar) {
                    for (let i = 0; i < count; i++) {
                        const till = ['t', 'T'].includes(lastFindType);
                        const newPos = findCharInLine(getCursorPos(), lastFindChar, lastFindDirection, till);
                        setCursorPos(newPos);
                    }
                }
                countBuffer = '';
                break;

            case ',':
                if (lastFindChar) {
                    for (let i = 0; i < count; i++) {
                        const till = ['t', 'T'].includes(lastFindType);
                        const newPos = findCharInLine(getCursorPos(), lastFindChar, !lastFindDirection, till);
                        setCursorPos(newPos);
                    }
                }
                countBuffer = '';
                break;

            case 'i':
                if (operatorPending) {
                    commandBuffer = 'i';
                } else {
                    switchMode('insert');
                    countBuffer = '';
                }
                break;

            case 'a':
                if (operatorPending) {
                    commandBuffer = 'a';
                } else {
                    setCursorPos(getCursorPos() + 1);
                    switchMode('insert');
                    countBuffer = '';
                }
                break;

            case 'I':
                setCursorPos(getFirstNonBlank(getLineStart(getCursorPos())));
                switchMode('insert');
                countBuffer = '';
                break;

            case 'A':
                setCursorPos(getLineEnd(getCursorPos()));
                switchMode('insert');
                countBuffer = '';
                break;

            case 'o':
                saveState();
                const posO = getLineEnd(getCursorPos());
                currentInput.value = currentInput.value.substring(0, posO) + '\n' + currentInput.value.substring(posO);
                setCursorPos(posO + 1);
                switchMode('insert');
                lastChange = { command: 'o', count };
                countBuffer = '';
                break;

            case 'O':
                saveState();
                const lineStartO = getLineStart(getCursorPos());
                currentInput.value = currentInput.value.substring(0, lineStartO) + '\n' + currentInput.value.substring(lineStartO);
                setCursorPos(lineStartO);
                switchMode('insert');
                lastChange = { command: 'O', count };
                countBuffer = '';
                break;

            case 's':
                saveState();
                const posS = getCursorPos();
                currentInput.value = currentInput.value.substring(0, posS) + currentInput.value.substring(posS + 1);
                switchMode('insert');
                lastChange = { command: 's', count };
                countBuffer = '';
                break;

            case 'x':
                saveState();
                for (let i = 0; i < count; i++) {
                    const posX = getCursorPos();
                    if (posX < currentInput.value.length) {
                        clipboard = currentInput.value[posX];
                        currentInput.value = currentInput.value.substring(0, posX) + currentInput.value.substring(posX + 1);
                    }
                }
                lastChange = { command: 'x', count };
                countBuffer = '';
                break;

            case 'X':
                saveState();
                for (let i = 0; i < count; i++) {
                    const posXb = getCursorPos();
                    if (posXb > 0) {
                        clipboard = currentInput.value[posXb - 1];
                        currentInput.value = currentInput.value.substring(0, posXb - 1) + currentInput.value.substring(posXb);
                        setCursorPos(posXb - 1);
                    }
                }
                lastChange = { command: 'X', count };
                countBuffer = '';
                break;

            case 'd':
            case 'c':
            case 'y':
                operatorPending = key;
                break;

            case 'p':
                saveState();
                const posP = getCursorPos() + 1;
                currentInput.value = currentInput.value.substring(0, posP) + clipboard + currentInput.value.substring(posP);
                setCursorPos(posP + clipboard.length - 1);
                lastChange = { command: 'p', count };
                countBuffer = '';
                break;

            case 'P':
                saveState();
                const posPb = getCursorPos();
                currentInput.value = currentInput.value.substring(0, posPb) + clipboard + currentInput.value.substring(posPb);
                setCursorPos(posPb + clipboard.length - 1);
                lastChange = { command: 'P', count };
                countBuffer = '';
                break;

            case 'u':
                undo();
                countBuffer = '';
                break;

            case '.':
                if (lastChange) {
                    repeatLastChange();
                }
                countBuffer = '';
                break;

            default:
                if (/\d/.test(key)) {
                    countBuffer += key;
                } else {
                    commandBuffer = '';
                    countBuffer = '';
                    operatorPending = null;
                }
        }
    }

    function repeatLastChange() {
        if (!lastChange) return;

        const count = lastChange.count || 1;

        if (lastChange.operator) {
            if (lastChange.motion) {
                operatorPending = lastChange.operator;
                processCommand(lastChange.motion);
            } else if (lastChange.textObject) {
                operatorPending = lastChange.operator;
                commandBuffer = lastChange.textObject[0];
                processCommand(lastChange.textObject[1]);
            }
        } else if (lastChange.command) {
            switch (lastChange.command) {
                case 'o':
                case 'O':
                case 's':
                case 'x':
                case 'X':
                case 'p':
                case 'P':
                    processCommand(lastChange.command);
                    break;
                case 'r':
                    commandBuffer = 'r';
                    processCommand(lastChange.char);
                    break;
            }
        }
    }

    // Event handlers
    function handleFocus(e) {
        const el = e.target;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            currentInput = el;
            mode = 'insert';
            undoStack = [];
            redoStack = [];
            updateIndicator();
        }
    }

    function handleBlur(e) {
        if (e.target === currentInput) {
            // Only prevent blur in insert mode or when not explicitly allowed
            if (mode === 'insert' && !allowBlur) {
                e.preventDefault();
                e.stopPropagation();
                // Refocus immediately
                const input = currentInput;
                setTimeout(() => input.focus(), 0);
                return;
            }
            allowBlur = false;
            currentInput = null;
            updateIndicator();
        }
    }

    function handleKeyDown(e) {
        if (!currentInput) return;

        // Handle ESC/Ctrl-] early to prevent default blur behavior
        if (e.key === 'Escape' || (e.ctrlKey && e.key === ']')) {
            e.preventDefault();
            e.stopPropagation();

            if (mode === 'insert') {
                // Insert -> Normal mode
                switchMode('normal');
            } else {
                // Normal mode -> unfocus
                commandBuffer = '';
                countBuffer = '';
                operatorPending = null;
                allowBlur = true;
                currentInput.blur();
            }
            return;
        }

        // Insert mode - allow normal typing
        if (mode === 'insert') {
            return;
        }

        // Normal mode
        e.preventDefault();

        if (e.ctrlKey && e.key === 'r') {
            redo();
            return;
        }

        processCommand(e.key);
    }

    // Initialize
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);
    document.addEventListener('keydown', handleKeyDown, true);

    updateIndicator();
})();
