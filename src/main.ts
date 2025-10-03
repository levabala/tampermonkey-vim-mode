import { debug, updateIndicator } from "./setup.js";
import {
    getCursorPos,
    setCursorPos,
    getLineStart,
    getLineEnd,
    redo,
    createCustomCaret,
    removeCustomCaret,
    updateCustomCaret,
    clearVisualSelection,
    updateLineNumbers,
    removeLineNumbers,
} from "./common.js";
import { processNormalCommand } from "./normal.js";
import { processVisualCommand, updateVisualSelection } from "./visual.js";
import type { Mode, EditableElement, UndoState, LastChange } from "./types.js";

// State
let mode: Mode = "normal"; // 'normal', 'insert', 'visual', 'visual-line'
let currentInput: EditableElement | null = null;
let commandBuffer = "";
let countBuffer = "";
let operatorPending: string | null = null;
let lastFindChar: string | null = null;
let lastFindDirection: boolean | null = null;
let lastFindType: string | null = null; // 'f', 't', 'F', or 'T'
const clipboard: { content: string } = { content: "" };
let undoStack: UndoState[] = [];
let redoStack: UndoState[] = [];
let lastChange: LastChange | null = null;
let allowBlur = false; // Track whether blur is intentional
let escapePressed = false; // Track if ESC was recently pressed

// Visual mode state
let visualStart: number | null = null; // Starting position of visual selection
let visualEnd: number | null = null; // Current end position of visual selection

// Mode transition functions
function enterInsertMode(): void {
    debug("enterInsertMode", { from: mode });
    mode = "insert";
    visualStart = null;
    visualEnd = null;
    clearVisualSelection();
    removeCustomCaret(currentInput);
    if (currentInput) {
        updateLineNumbers(currentInput);
    }
    updateIndicator(mode, currentInput);
}

function enterNormalMode(): void {
    debug("enterNormalMode", { from: mode });
    mode = "normal";
    visualStart = null;
    visualEnd = null;
    clearVisualSelection();
    updateIndicator(mode, currentInput);

    // Move cursor back one if at end of line (vim behavior)
    if (currentInput) {
        const pos = getCursorPos(currentInput);
        const lineEnd = getLineEnd(currentInput, pos);
        if (
            pos === lineEnd &&
            pos > 0 &&
            currentInput.value[pos - 1] !== "\n"
        ) {
            setCursorPos(currentInput, pos - 1);
        }
        createCustomCaret(currentInput);
        updateLineNumbers(currentInput);
    }
}

function enterVisualMode(lineMode = false): void {
    debug("enterVisualMode", { lineMode, from: mode });
    mode = lineMode ? "visual-line" : "visual";

    if (currentInput) {
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

        // Ensure custom caret is active for visual mode
        createCustomCaret(currentInput);
        updateVisualSelection(currentInput, mode, visualStart, visualEnd);
        updateLineNumbers(currentInput);
    }
    updateIndicator(mode, currentInput);
}

function exitVisualMode(): void {
    debug("exitVisualMode");
    visualStart = null;
    visualEnd = null;
    clearVisualSelection();
    enterNormalMode();
}

// Command processing - dispatch to mode-specific handlers
function processCommand(key: string): void {
    debug("processCommand", { key, mode, visualStart, visualEnd });

    const state = {
        currentInput,
        mode,
        countBuffer,
        commandBuffer,
        operatorPending,
        lastFindChar: lastFindChar ?? "",
        lastFindDirection: lastFindDirection ?? false,
        lastFindType: lastFindType ?? "",
        clipboard,
        undoStack,
        redoStack,
        lastChange,
        visualStart: visualStart ?? 0,
        visualEnd: visualEnd ?? 0,
        allowBlur,
        enterInsertMode,
        enterNormalMode,
        enterVisualMode,
        exitVisualMode,
    };
    debug("processCommand state", {
        stateVisualStart: state.visualStart,
        stateVisualEnd: state.visualEnd,
    });

    const oldMode = mode;

    if (mode === "visual" || mode === "visual-line") {
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

    // Only update visualStart/visualEnd if we didn't just transition TO visual mode
    // because enterVisualMode() already set them correctly
    const enteredVisualMode =
        oldMode !== "visual" &&
        oldMode !== "visual-line" &&
        (mode === "visual" || mode === "visual-line");

    if (!enteredVisualMode) {
        visualStart = state.visualStart;
        visualEnd = state.visualEnd;
    }

    debug("processCommand end", {
        oldMode,
        newMode: mode,
        enteredVisualMode,
        visualStart,
        visualEnd,
    });
}

// Event handlers
function handleFocus(e: FocusEvent): void {
    const el = e.target as EditableElement;
    debug("handleFocus", {
        tag: el.tagName,
        isNewInput: currentInput !== el,
        currentMode: mode,
    });

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        // Skip readonly elements - treat as if leaving vim mode
        // Check both readOnly property and aria-readonly attribute
        if (el.readOnly || el.getAttribute("aria-readonly") === "true") {
            debug("handleFocus: skipping readonly element");
            currentInput = null;
            updateIndicator(mode, currentInput);
            return;
        }
        // Only initialize mode if this is a new input
        if (currentInput !== el) {
            currentInput = el;
            mode = "insert";
            undoStack = [];
            redoStack = [];
            updateIndicator(mode, currentInput);

            // Attach keydown directly to the element to intercept before any page handlers
            debug("Attaching direct keydown listener to element");

            // Try to intercept via onkeydown property (runs before addEventListener)
            const originalOnKeyDown = el.onkeydown;
            el.onkeydown = (event: KeyboardEvent) => {
                debug("onkeydown property handler", {
                    key: event.key,
                    ctrl: event.ctrlKey,
                });
                if (
                    event.key === "Escape" ||
                    (event.ctrlKey && event.key === "]")
                ) {
                    debug("ESC/Ctrl-] in onkeydown - calling handleKeyDown");
                    handleKeyDown(event);
                    return false; // Prevent default
                }
                if (originalOnKeyDown) {
                    return originalOnKeyDown.call(el, event);
                }
                return true;
            };

            el.addEventListener(
                "keydown",
                (event: Event) => {
                    const kbEvent = event as KeyboardEvent;
                    debug("DIRECT element keydown", {
                        key: kbEvent.key,
                        ctrl: kbEvent.ctrlKey,
                        target: (kbEvent.target as HTMLElement).tagName,
                        defaultPrevented: kbEvent.defaultPrevented,
                        propagationStopped: kbEvent.cancelBubble,
                    });
                    if (
                        kbEvent.key === "Escape" ||
                        (kbEvent.ctrlKey && kbEvent.key === "]")
                    ) {
                        debug(
                            "DIRECT ESC/Ctrl-] on element - calling handleKeyDown",
                        );
                        handleKeyDown(kbEvent);
                    }
                },
                true,
            );
        } else {
            // Same input refocused - just update indicator, don't reset mode
            debug("handleFocus: same input refocused, keeping mode", { mode });
            updateIndicator(mode, currentInput);
            // Recreate custom caret if in normal mode
            if (mode === "normal") {
                createCustomCaret(currentInput);
            }
        }
    }
}

function handleBlur(e: FocusEvent): void {
    if (e.target === currentInput) {
        debug("handleBlur", {
            mode,
            allowBlur,
            escapePressed,
            relatedTarget: e.relatedTarget,
            isTrusted: e.isTrusted,
        });

        // Check if blur is caused by clicking on another element
        // If relatedTarget exists, user is moving focus to another element - allow it
        if (e.relatedTarget) {
            debug("handleBlur: focus moving to another element, allowing blur");
            allowBlur = false;
            removeCustomCaret(currentInput);
            removeLineNumbers();
            clearVisualSelection();
            currentInput = null;
            updateIndicator(mode, currentInput);
            return;
        }

        // Check if ESC caused the blur:
        // 1. Via our global listener detecting ESC keydown
        // 2. Via blur pattern: insert mode + no relatedTarget + trusted event + not explicitly allowed
        const isEscapeBlur =
            (escapePressed && mode === "insert") ||
            (mode === "insert" &&
                !allowBlur &&
                !e.relatedTarget &&
                e.isTrusted);

        if (isEscapeBlur) {
            debug("handleBlur: ESC caused blur, switching to normal mode");
            escapePressed = false; // Clear the flag
            enterNormalMode();
            // Prevent blur - stay focused in normal mode
            e.preventDefault();
            e.stopPropagation();
            const input = currentInput!;
            setTimeout(() => {
                debug("handleBlur: refocusing in normal mode");
                input.focus();
            }, 0);
            return;
        }

        // This shouldn't happen now, but keep for safety
        if (mode === "insert" && !allowBlur) {
            debug("handleBlur: unexpected blur in insert mode, preventing");
            e.preventDefault();
            e.stopPropagation();
            const input = currentInput!;
            setTimeout(() => {
                debug("handleBlur: refocusing element");
                input.focus();
            }, 0);
            return;
        }
        debug("handleBlur: allowing blur", { mode, allowBlur });
        allowBlur = false;
        removeCustomCaret(currentInput);
        removeLineNumbers();
        clearVisualSelection();
        currentInput = null;
        updateIndicator(mode, currentInput);
    }
}

function handleKeyDown(e: KeyboardEvent): void {
    debug("handleKeyDown ENTRY", {
        hasCurrentInput: !!currentInput,
        key: e.key,
        ctrl: e.ctrlKey,
        mode,
        target: (e.target as HTMLElement).tagName,
        defaultPrevented: e.defaultPrevented,
        propagationStopped: e.cancelBubble,
        eventPhase: e.eventPhase,
    });

    if (!currentInput) {
        debug("handleKeyDown: no currentInput, returning");
        return;
    }

    debug("handleKeyDown", {
        key: e.key,
        ctrl: e.ctrlKey,
        mode,
        target: (e.target as HTMLElement).tagName,
    });

    // Handle ESC/Ctrl-] early to prevent default blur behavior
    if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
        debug("handleKeyDown: ESC/Ctrl-] pressed", {
            mode,
            eventTarget: e.target,
            currentInput,
        });
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (mode === "insert") {
            // Insert -> Normal mode
            debug("handleKeyDown: switching from insert to normal");
            enterNormalMode();
            debug("handleKeyDown: mode switch complete", { newMode: mode });
        } else if (mode === "visual" || mode === "visual-line") {
            // Visual mode -> Normal mode
            debug("handleKeyDown: exiting visual mode to normal");
            exitVisualMode();
            debug("handleKeyDown: mode switch complete", { newMode: mode });
        } else {
            // Normal mode -> unfocus
            debug("handleKeyDown: unfocusing from normal mode");
            commandBuffer = "";
            countBuffer = "";
            operatorPending = null;
            allowBlur = true;
            currentInput.blur();
        }
        debug("handleKeyDown: ESC handling complete, returning");
        return;
    }

    // Insert mode - allow normal typing
    if (mode === "insert") {
        debug("handleKeyDown: insert mode, passing through");
        return;
    }

    // Normal mode
    debug("handleKeyDown: normal mode, processing command");
    e.preventDefault();

    if (e.ctrlKey && e.key === "r") {
        debug("handleKeyDown: Ctrl-r redo");
        redo(currentInput, undoStack, redoStack);
        return;
    }

    processCommand(e.key);
}

// Initialize
debug("Vim Mode initialized");

// Only set up event listeners if window/document exist (not in test environment without jsdom setup)
if (typeof window === "undefined" || typeof document === "undefined") {
    debug("Skipping event listener setup - no window/document");
} else {
    // Track ESC/Ctrl-] key state at the earliest possible point
    // Use keydown on window to catch before page handlers
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
                debug("GLOBAL ESC/Ctrl-] keydown detected", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    target: (e.target as HTMLElement).tagName,
                    eventPhase: e.eventPhase,
                    defaultPrevented: e.defaultPrevented,
                    timestamp: e.timeStamp,
                });
                escapePressed = true;
                // Clear the flag after a short timeout
                setTimeout(() => {
                    escapePressed = false;
                    debug("escapePressed flag cleared");
                }, 100);
            }
        },
        true,
    );

    // Track keyup as well to detect if ESC/Ctrl-] was released
    window.addEventListener(
        "keyup",
        (e: KeyboardEvent) => {
            if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
                debug("GLOBAL ESC/Ctrl-] keyup detected", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    target: (e.target as HTMLElement).tagName,
                    timestamp: e.timeStamp,
                });
            }
        },
        true,
    );

    // Test if event listeners work at all
    const testListener = (e: KeyboardEvent) => {
        if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
            debug("RAW ESC/Ctrl-] DETECTED on document", {
                key: e.key,
                ctrl: e.ctrlKey,
                target: (e.target as HTMLElement).tagName,
                currentTarget: e.currentTarget,
                eventPhase: e.eventPhase,
                defaultPrevented: e.defaultPrevented,
                propagationStopped: e.cancelBubble,
                timestamp: e.timeStamp,
            });
        }
    };

    // Try multiple attachment points to see which one works
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
                debug("WINDOW ESC/Ctrl-] listener", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    target: (e.target as HTMLElement).tagName,
                    eventPhase: e.eventPhase,
                    defaultPrevented: e.defaultPrevented,
                });
            }
        },
        true,
    );

    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("focusout", handleBlur, true);
    document.addEventListener("keydown", testListener, true);
    document.addEventListener("keydown", handleKeyDown, true);

    // Update line numbers on input in insert mode
    document.addEventListener(
        "input",
        (e: Event) => {
            if (
                currentInput &&
                e.target === currentInput &&
                mode === "insert"
            ) {
                debug("input event: updating line numbers");
                updateLineNumbers(currentInput);
            }
        },
        true,
    );

    // Add a second keydown listener to verify our handler runs first
    document.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (e.key === "Escape" || (e.ctrlKey && e.key === "]")) {
                debug("Secondary ESC/Ctrl-] listener (bubbling phase)", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    defaultPrevented: e.defaultPrevented,
                    propagationStopped: e.cancelBubble,
                    currentInput: !!currentInput,
                    mode,
                });
            }
        },
        false,
    );

    // Update custom caret and visual selection on scroll and resize
    window.addEventListener(
        "scroll",
        () => {
            if (currentInput) {
                if (mode === "normal") {
                    debug("scroll event: updating custom caret");
                    updateCustomCaret(currentInput);
                    updateLineNumbers(currentInput);
                } else if (
                    (mode === "visual" || mode === "visual-line") &&
                    visualStart !== null &&
                    visualEnd !== null
                ) {
                    debug("scroll event: updating visual selection");
                    updateVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                    );
                    updateLineNumbers(currentInput);
                }
            }
        },
        true,
    );

    window.addEventListener("resize", () => {
        if (currentInput) {
            if (mode === "normal") {
                debug("resize event: updating custom caret");
                updateCustomCaret(currentInput);
                updateLineNumbers(currentInput);
            } else if (
                (mode === "visual" || mode === "visual-line") &&
                visualStart !== null &&
                visualEnd !== null
            ) {
                debug("resize event: updating visual selection");
                updateVisualSelection(
                    currentInput,
                    mode,
                    visualStart,
                    visualEnd,
                );
                updateLineNumbers(currentInput);
            }
        }
    });

    debug("Event listeners attached", {
        testListener: !!testListener,
        handleKeyDown: !!handleKeyDown,
        handleFocus: !!handleFocus,
        handleBlur: !!handleBlur,
    });
} // End of window/document check

updateIndicator(mode, currentInput);
