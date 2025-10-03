import { debug, updateIndicator } from './setup.js';
import { getCursorPos, setCursorPos, getLineStart, getLineEnd, redo } from './common.js';
import { processNormalCommand } from './normal.js';
import { processVisualCommand, updateVisualSelection } from './visual.js';

// State
let mode = 'normal'; // 'normal', 'insert', 'visual', 'visual-line'
let currentInput = null;
let commandBuffer = '';
let countBuffer = '';
let operatorPending = null;
let lastFindChar = null;
let lastFindDirection = null;
let lastFindType = null; // 'f', 't', 'F', or 'T'
let clipboard = { content: '' };
let undoStack = [];
let redoStack = [];
let lastChange = null;
let allowBlur = false; // Track whether blur is intentional
let escapePressed = false; // Track if ESC was recently pressed

// Visual mode state
let visualStart = null; // Starting position of visual selection
let visualEnd = null; // Current end position of visual selection

// Mode transition functions
function enterInsertMode() {
    debug('enterInsertMode', { from: mode });
    mode = 'insert';
    visualStart = null;
    visualEnd = null;
    updateIndicator(mode, currentInput);
}

function enterNormalMode() {
    debug('enterNormalMode', { from: mode });
    mode = 'normal';
    visualStart = null;
    visualEnd = null;
    updateIndicator(mode, currentInput);

    // Move cursor back one if at end of line (vim behavior)
    const pos = getCursorPos(currentInput);
    const lineEnd = getLineEnd(currentInput, pos);
    if (pos === lineEnd && pos > 0 && currentInput.value[pos - 1] !== '\n') {
        setCursorPos(currentInput, pos - 1);
    }
}

function enterVisualMode(lineMode = false) {
    debug('enterVisualMode', { lineMode, from: mode });
    mode = lineMode ? 'visual-line' : 'visual';
    const pos = getCursorPos(currentInput);

    if (lineMode) {
        // Visual line mode: select whole line
        visualStart = getLineStart(currentInput, pos);
        visualEnd = getLineEnd(currentInput, pos);
    } else {
        // Visual character mode: start at cursor
        visualStart = pos;
        visualEnd = pos;
    }

    updateVisualSelection(currentInput, mode, visualStart, visualEnd);
    updateIndicator(mode, currentInput);
}

function exitVisualMode() {
    debug('exitVisualMode');
    visualStart = null;
    visualEnd = null;
    enterNormalMode();
}

// Command processing - dispatch to mode-specific handlers
function processCommand(key) {
    debug('processCommand', { key, mode });

    const state = {
        currentInput,
        mode,
        countBuffer,
        commandBuffer,
        operatorPending,
        lastFindChar,
        lastFindDirection,
        lastFindType,
        clipboard,
        undoStack,
        redoStack,
        lastChange,
        visualStart,
        visualEnd,
        enterInsertMode,
        enterNormalMode,
        enterVisualMode,
        exitVisualMode
    };

    if (mode === 'visual' || mode === 'visual-line') {
        processVisualCommand(key, state);
    } else {
        processNormalCommand(key, state);
    }

    // Update state from mutations
    countBuffer = state.countBuffer;
    commandBuffer = state.commandBuffer;
    operatorPending = state.operatorPending;
    lastFindChar = state.lastFindChar;
    lastFindDirection = state.lastFindDirection;
    lastFindType = state.lastFindType;
    lastChange = state.lastChange;
    visualStart = state.visualStart;
    visualEnd = state.visualEnd;
}

// Event handlers
function handleFocus(e) {
    const el = e.target;
    debug('handleFocus', { tag: el.tagName, isNewInput: currentInput !== el, currentMode: mode });
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        // Only initialize mode if this is a new input
        if (currentInput !== el) {
            currentInput = el;
            mode = 'insert';
            undoStack = [];
            redoStack = [];
            updateIndicator(mode, currentInput);

            // Attach keydown directly to the element to intercept before any page handlers
            debug('Attaching direct keydown listener to element');

            // Try to intercept via onkeydown property (runs before addEventListener)
            const originalOnKeyDown = el.onkeydown;
            el.onkeydown = (event) => {
                debug('onkeydown property handler', { key: event.key });
                if (event.key === 'Escape') {
                    debug('ESC in onkeydown - calling handleKeyDown');
                    handleKeyDown(event);
                    return false; // Prevent default
                }
                if (originalOnKeyDown) {
                    return originalOnKeyDown.call(el, event);
                }
            };

            el.addEventListener('keydown', (event) => {
                debug('DIRECT element keydown', {
                    key: event.key,
                    target: event.target.tagName,
                    defaultPrevented: event.defaultPrevented,
                    propagationStopped: event.cancelBubble
                });
                if (event.key === 'Escape') {
                    debug('DIRECT ESC on element - calling handleKeyDown');
                    handleKeyDown(event);
                }
            }, true);
        } else {
            // Same input refocused - just update indicator, don't reset mode
            debug('handleFocus: same input refocused, keeping mode', { mode });
            updateIndicator(mode, currentInput);
        }
    }
}

function handleBlur(e) {
    if (e.target === currentInput) {
        debug('handleBlur', {
            mode,
            allowBlur,
            escapePressed,
            relatedTarget: e.relatedTarget,
            isTrusted: e.isTrusted
        });

        // Check if ESC caused the blur:
        // 1. Via our global listener detecting ESC keydown
        // 2. Via blur pattern: insert mode + no relatedTarget + trusted event + not explicitly allowed
        const isEscapeBlur = (escapePressed && mode === 'insert') ||
                             (mode === 'insert' && !allowBlur && !e.relatedTarget && e.isTrusted);

        if (isEscapeBlur) {
            debug('handleBlur: ESC caused blur, switching to normal mode');
            escapePressed = false; // Clear the flag
            enterNormalMode();
            // Prevent blur - stay focused in normal mode
            e.preventDefault();
            e.stopPropagation();
            const input = currentInput;
            setTimeout(() => {
                debug('handleBlur: refocusing in normal mode');
                input.focus();
            }, 0);
            return;
        }

        // This shouldn't happen now, but keep for safety
        if (mode === 'insert' && !allowBlur) {
            debug('handleBlur: unexpected blur in insert mode, preventing');
            e.preventDefault();
            e.stopPropagation();
            const input = currentInput;
            setTimeout(() => {
                debug('handleBlur: refocusing element');
                input.focus();
            }, 0);
            return;
        }
        debug('handleBlur: allowing blur', { mode, allowBlur });
        allowBlur = false;
        currentInput = null;
        updateIndicator(mode, currentInput);
    }
}

function handleKeyDown(e) {
    debug('handleKeyDown ENTRY', {
        hasCurrentInput: !!currentInput,
        key: e.key,
        ctrl: e.ctrlKey,
        mode,
        target: e.target.tagName,
        defaultPrevented: e.defaultPrevented,
        propagationStopped: e.cancelBubble,
        eventPhase: e.eventPhase
    });

    if (!currentInput) {
        debug('handleKeyDown: no currentInput, returning');
        return;
    }

    debug('handleKeyDown', { key: e.key, ctrl: e.ctrlKey, mode, target: e.target.tagName });

    // Handle ESC/Ctrl-] early to prevent default blur behavior
    if (e.key === 'Escape' || (e.ctrlKey && e.key === ']')) {
        debug('handleKeyDown: ESC/Ctrl-] pressed', { mode, eventTarget: e.target, currentInput });
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (mode === 'insert') {
            // Insert -> Normal mode
            debug('handleKeyDown: switching from insert to normal');
            enterNormalMode();
            debug('handleKeyDown: mode switch complete', { newMode: mode });
        } else {
            // Normal mode -> unfocus
            debug('handleKeyDown: unfocusing from normal mode');
            commandBuffer = '';
            countBuffer = '';
            operatorPending = null;
            allowBlur = true;
            currentInput.blur();
        }
        debug('handleKeyDown: ESC handling complete, returning');
        return;
    }

    // Insert mode - allow normal typing
    if (mode === 'insert') {
        debug('handleKeyDown: insert mode, passing through');
        return;
    }

    // Normal mode
    debug('handleKeyDown: normal mode, processing command');
    e.preventDefault();

    if (e.ctrlKey && e.key === 'r') {
        debug('handleKeyDown: Ctrl-r redo');
        redo(currentInput, undoStack, redoStack);
        return;
    }

    processCommand(e.key);
}

// Initialize
debug('Vim Mode initialized');

// Only set up event listeners if window/document exist (not in test environment without jsdom setup)
if (typeof window === 'undefined' || typeof document === 'undefined') {
    debug('Skipping event listener setup - no window/document');
} else {

// Track ESC key state at the earliest possible point
// Use keydown on window to catch before page handlers
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        debug('GLOBAL ESC keydown detected', {
            target: e.target.tagName,
            eventPhase: e.eventPhase,
            defaultPrevented: e.defaultPrevented,
            timestamp: e.timeStamp
        });
        escapePressed = true;
        // Clear the flag after a short timeout
        setTimeout(() => {
            escapePressed = false;
            debug('escapePressed flag cleared');
        }, 100);
    }
}, true);

// Track keyup as well to detect if ESC was released
window.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
        debug('GLOBAL ESC keyup detected', {
            target: e.target.tagName,
            timestamp: e.timeStamp
        });
    }
}, true);

// Test if event listeners work at all
const testListener = (e) => {
    if (e.key === 'Escape') {
        debug('RAW ESC DETECTED on document', {
            target: e.target.tagName,
            currentTarget: e.currentTarget,
            eventPhase: e.eventPhase,
            defaultPrevented: e.defaultPrevented,
            propagationStopped: e.cancelBubble,
            timestamp: e.timeStamp
        });
    }
};

// Try multiple attachment points to see which one works
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        debug('WINDOW ESC listener', {
            target: e.target.tagName,
            eventPhase: e.eventPhase,
            defaultPrevented: e.defaultPrevented
        });
    }
}, true);

document.addEventListener('focusin', handleFocus, true);
document.addEventListener('focusout', handleBlur, true);
document.addEventListener('keydown', testListener, true);
document.addEventListener('keydown', handleKeyDown, true);

// Add a second keydown listener to verify our handler runs first
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        debug('Secondary ESC listener (bubbling phase)', {
            defaultPrevented: e.defaultPrevented,
            propagationStopped: e.cancelBubble,
            currentInput: !!currentInput,
            mode
        });
    }
}, false);

debug('Event listeners attached', {
    testListener: !!testListener,
    handleKeyDown: !!handleKeyDown,
    handleFocus: !!handleFocus,
    handleBlur: !!handleBlur
});

} // End of window/document check

updateIndicator(mode, currentInput);
