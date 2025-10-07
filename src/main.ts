import { debug, updateIndicator } from "./setup.js";
import {
    getCursorPos,
    setCursorPos,
    getLineStart,
    getLineEnd,
    redo,
    saveState,
    syncCaretToMode,
    updateCustomCaret,
    clearVisualSelection,
    updateLineNumbers,
    removeLineNumbers,
    scrollTextarea,
    scrollHalfPage,
} from "./common.js";
import { processNormalCommand } from "./normal.js";
import { processVisualCommand, updateVisualSelection } from "./visual.js";
import type { EditableElement } from "./types.js";
import { VimState } from "./state/vim-state.js";

// Centralized state management
const vimState = new VimState();

// Escape keys - ESC and Ctrl-[
const ESCAPE_KEYS = [
    { key: "Escape", ctrlKey: false },
    { key: "[", ctrlKey: true },
];

// Helper function to check if a key event is an escape key
function isEscapeKey(e: KeyboardEvent): boolean {
    return ESCAPE_KEYS.some(
        (escKey) => e.key === escKey.key && e.ctrlKey === escKey.ctrlKey,
    );
}

// Mode transition functions
function enterInsertMode(command = "i"): void {
    const currentInput = vimState.getCurrentInput();
    debug("enterInsertMode", { from: vimState.getMode(), command });

    // Save state before entering insert mode (for undo)
    if (currentInput) {
        const stacks = vimState.getHistoryStacks();
        saveState(currentInput, stacks.undoStack, stacks.redoStack);
    }

    vimState.setMode("insert");
    vimState.clearVisual();
    clearVisualSelection();

    if (currentInput) {
        // Record insert start state for dot repeat
        vimState.setInsertState(
            getCursorPos(currentInput),
            currentInput.value,
            command,
        );
        updateLineNumbers(currentInput);
    }

    // Centralized caret management based on mode
    syncCaretToMode(currentInput, "insert");
    updateIndicator(vimState.getMode(), currentInput);
}

function enterNormalMode(): void {
    const currentInput = vimState.getCurrentInput();
    debug("enterNormalMode", { from: vimState.getMode() });
    const wasInsertMode = vimState.getMode() === "insert";
    vimState.setMode("normal");
    vimState.clearVisual();
    clearVisualSelection();
    updateIndicator(vimState.getMode(), currentInput);

    // Record last insert for dot repeat
    if (wasInsertMode && currentInput) {
        const insertStartPos = vimState.getInsertStartPos();
        const insertStartValue = vimState.getInsertStartValue();
        const insertCommand = vimState.getInsertCommand();

        if (
            insertStartPos !== null &&
            insertStartValue !== null &&
            insertCommand !== null
        ) {
            const currentPos = getCursorPos(currentInput);
            const currentValue = currentInput.value;

            // Calculate what was inserted by finding the text that was added
            const insertedText = currentValue.substring(
                insertStartPos,
                currentPos,
            );

            debug("enterNormalMode: recording insert", {
                insertCommand,
                insertStartPos,
                insertStartValue,
                currentValue,
                currentPos,
                insertedText,
            });

            vimState.setLastChange({
                command: insertCommand,
                insertedText,
                count: 1,
            });

            // Clear insert tracking
            vimState.clearInsertState();
        }
    }

    // Move cursor back one when exiting insert mode (vim behavior)
    if (currentInput && wasInsertMode) {
        const pos = getCursorPos(currentInput);
        if (pos > 0) {
            setCursorPos(currentInput, pos - 1);
        }
    }

    if (currentInput) {
        updateLineNumbers(currentInput);
    }

    // Centralized caret management based on mode
    syncCaretToMode(currentInput, "normal");
}

function enterVisualMode(lineMode = false): void {
    const currentInput = vimState.getCurrentInput();
    debug("enterVisualMode", { lineMode, from: vimState.getMode() });
    const newMode = lineMode ? "visual-line" : "visual";
    vimState.setMode(newMode);

    if (currentInput) {
        const pos = getCursorPos(currentInput);

        if (lineMode) {
            // Visual line mode: select whole line
            const lineStart = getLineStart(currentInput, pos);
            const lineEnd = getLineEnd(currentInput, pos);
            vimState.setVisualRange(lineStart, lineEnd);
            // Store anchor at the end position (where cursor is)
            vimState.setVisualAnchor(lineEnd);
        } else {
            // Visual character mode: start at cursor
            vimState.setVisualRange(pos, pos);
            vimState.setVisualAnchor(pos);
        }

        updateVisualSelection(
            currentInput,
            vimState.getMode(),
            vimState.getVisualStart(),
            vimState.getVisualEnd(),
        );
        updateLineNumbers(currentInput);
    }

    // Centralized caret management based on mode
    syncCaretToMode(currentInput, newMode);
    updateIndicator(vimState.getMode(), currentInput);
}

function exitVisualMode(): void {
    const currentInput = vimState.getCurrentInput();
    const visualStart = vimState.getVisualStart();
    const visualEnd = vimState.getVisualEnd();
    debug("exitVisualMode", { visualStart, visualEnd });

    // When exiting visual mode, move cursor to the start of the selection
    // (the anchor point where visual mode was initiated)
    if (currentInput && visualStart !== null && visualEnd !== null) {
        const anchorPos = Math.min(visualStart, visualEnd);
        setCursorPos(currentInput, anchorPos);
    }

    vimState.clearVisual();
    clearVisualSelection();
    enterNormalMode();
}

// Command processing - dispatch to mode-specific handlers
function processCommand(key: string): void {
    const mode = vimState.getMode();
    debug("processCommand", {
        key,
        mode,
        visualStart: vimState.getVisualStart(),
        visualEnd: vimState.getVisualEnd(),
    });

    // Get legacy state object for command processors
    const state = {
        ...vimState.getLegacyState(),
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

    // Update VimState from mutations
    // But don't update visualStart/visualEnd if we just entered visual mode,
    // because enterVisualMode() already set them correctly
    const newMode = vimState.getMode();
    const enteredVisualMode =
        oldMode !== "visual" &&
        oldMode !== "visual-line" &&
        (newMode === "visual" || newMode === "visual-line");

    if (enteredVisualMode) {
        // Don't update visual range - it was set by enterVisualMode
        vimState.updateFromLegacyState({
            countBuffer: state.countBuffer,
            commandBuffer: state.commandBuffer,
            operatorPending: state.operatorPending,
            lastFindChar: state.lastFindChar,
            lastFindDirection: state.lastFindDirection,
            lastFindType: state.lastFindType,
            lastChange: state.lastChange,
        });
    } else {
        // Update all state including visual range
        vimState.updateFromLegacyState(state);
    }

    debug("processCommand end", {
        oldMode,
        newMode,
        enteredVisualMode,
        visualStart: vimState.getVisualStart(),
        visualEnd: vimState.getVisualEnd(),
    });
}

// Event handlers
function handleFocus(e: FocusEvent): void {
    const el = e.target as EditableElement;
    const currentInput = vimState.getCurrentInput();
    debug("handleFocus", {
        tag: el.tagName,
        isNewInput: currentInput !== el,
        currentMode: vimState.getMode(),
    });

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        // Skip readonly elements - treat as if leaving vim mode
        // Check both readOnly property and aria-readonly attribute
        if (el.readOnly || el.getAttribute("aria-readonly") === "true") {
            debug("handleFocus: skipping readonly element");
            vimState.setCurrentInput(null);
            updateIndicator(vimState.getMode(), null);
            return;
        }
        // Only initialize mode if this is a new input
        if (currentInput !== el) {
            vimState.setCurrentInput(el);
            // Only initialize if this input has no state (first time seeing it)
            if (!vimState.hasState(el)) {
                vimState.initializeInput(el, "insert");
            }
            updateIndicator(vimState.getMode(), el);
            updateLineNumbers(el);

            // Sync caret to current mode
            syncCaretToMode(el, vimState.getMode());

            // Attach keydown directly to the element to intercept before any page handlers
            debug("Attaching direct keydown listener to element");

            // Try to intercept via onkeydown property (runs before addEventListener)
            const originalOnKeyDown = el.onkeydown;
            el.onkeydown = (event: KeyboardEvent) => {
                debug("onkeydown property handler", {
                    key: event.key,
                    ctrl: event.ctrlKey,
                });
                // Handle ESC/Ctrl-[ and scrolling commands
                if (
                    isEscapeKey(event) ||
                    (event.ctrlKey &&
                        (event.key === "e" ||
                            event.key === "y" ||
                            event.key === "d" ||
                            event.key === "u"))
                ) {
                    debug("Special key in onkeydown - calling handleKeyDown");
                    event.preventDefault(); // Mark as handled
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
                    // Handle ESC/Ctrl-[ and scrolling commands
                    // Skip if already handled by onkeydown property
                    if (
                        !kbEvent.defaultPrevented &&
                        (isEscapeKey(kbEvent) ||
                            (kbEvent.ctrlKey &&
                                (kbEvent.key === "e" ||
                                    kbEvent.key === "y" ||
                                    kbEvent.key === "d" ||
                                    kbEvent.key === "u")))
                    ) {
                        debug(
                            "DIRECT special key on element - calling handleKeyDown",
                        );
                        handleKeyDown(kbEvent);
                    }
                },
                true,
            );
        } else {
            // Same input refocused - state is already preserved in VimState
            debug("handleFocus: same input refocused, restoring state", {
                mode: vimState.getMode(),
                savedCursorPos: vimState.getSavedCursorPos(),
            });
            updateIndicator(vimState.getMode(), el);
            updateLineNumbers(el);

            // Sync caret to current mode
            syncCaretToMode(el, vimState.getMode());

            // Restore cursor position if we saved it
            const savedCursorPos = vimState.getSavedCursorPos();
            if (savedCursorPos !== null) {
                debug("Restoring saved cursor position", savedCursorPos);
                setCursorPos(el, savedCursorPos);
                vimState.setSavedCursorPos(null);
            }
        }
    }
}

function handleBlur(e: FocusEvent): void {
    const currentInput = vimState.getCurrentInput();
    if (e.target === currentInput && currentInput) {
        // Save cursor position for potential refocus
        vimState.setSavedCursorPos(getCursorPos(currentInput));

        debug("handleBlur", {
            mode: vimState.getMode(),
            allowBlur: vimState.getAllowBlur(),
            escapePressed: vimState.getEscapePressed(),
            relatedTarget: e.relatedTarget,
            isTrusted: e.isTrusted,
            savedCursorPos: vimState.getSavedCursorPos(),
        });

        // Scenario 1: Focus moving to another element (relatedTarget exists)
        // User is clicking elsewhere - allow blur and clean up UI elements
        if (e.relatedTarget) {
            debug("handleBlur: focus moving to another element, allowing blur");
            vimState.setAllowBlur(false);

            // Clean up all UI elements
            syncCaretToMode(null, vimState.getMode()); // Remove caret
            removeLineNumbers();
            clearVisualSelection();

            // Don't reset currentInput - keep it so we can detect refocus of same element
            updateIndicator(vimState.getMode(), currentInput);
            // Keep savedCursorPos in case we refocus later
            return;
        }

        const mode = vimState.getMode();
        const allowBlur = vimState.getAllowBlur();
        const escapePressed = vimState.getEscapePressed();

        // Scenario 2: ESC caused the blur
        // Detect via: global ESC listener flag or blur pattern
        // Note: mode might already be "normal" if handleKeyDown changed it before blur fired
        const isEscapeBlur =
            // ESC pressed recently and blur is unexpected (not explicitly allowed, no focus transfer)
            (escapePressed && !e.relatedTarget && !allowBlur) ||
            // Blur pattern for modes that shouldn't blur without explicit action
            ((mode === "insert" ||
                mode === "visual" ||
                mode === "visual-line") &&
                !allowBlur &&
                !e.relatedTarget &&
                e.isTrusted);

        if (isEscapeBlur) {
            debug("handleBlur: ESC caused blur, switching to normal mode");
            vimState.setEscapePressed(false); // Clear the flag

            // Mode transition handles caret lifecycle
            if (mode === "visual" || mode === "visual-line") {
                exitVisualMode();
            } else {
                enterNormalMode();
            }

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

        // Scenario 3: Unexpected blur in insert/visual mode
        // This shouldn't happen often, but prevent it for safety
        if (
            (mode === "insert" ||
                mode === "visual" ||
                mode === "visual-line") &&
            !allowBlur
        ) {
            debug(
                "handleBlur: unexpected blur in insert/visual mode, preventing",
            );
            e.preventDefault();
            e.stopPropagation();
            const input = currentInput!;
            setTimeout(() => {
                debug("handleBlur: refocusing element");
                input.focus();
            }, 0);
            return;
        }

        // Scenario 4: Allowed blur (e.g., ESC in normal mode to unfocus)
        debug("handleBlur: allowing blur", { mode, allowBlur });
        vimState.setAllowBlur(false);

        // Clean up UI elements
        // Only remove caret if not in normal mode - normal mode caret persists for potential refocus
        if (mode !== "normal") {
            syncCaretToMode(null, mode); // Remove caret for insert/visual modes
        }
        removeLineNumbers();
        clearVisualSelection();

        vimState.setCurrentInput(null);
        updateIndicator(vimState.getMode(), null);
    }
}

function handleKeyDown(e: KeyboardEvent): void {
    const currentInput = vimState.getCurrentInput();
    const mode = vimState.getMode();
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

    // Skip if event was already handled (by onkeydown property or earlier listener)
    if (e.defaultPrevented) {
        debug("handleKeyDown: event already handled, skipping");
        return;
    }

    debug("handleKeyDown", {
        key: e.key,
        ctrl: e.ctrlKey,
        mode,
        target: (e.target as HTMLElement).tagName,
    });

    // Handle ESC/Ctrl-[ early to prevent default blur behavior
    if (isEscapeKey(e)) {
        debug("handleKeyDown: ESC/Ctrl-[ pressed", {
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
            debug("handleKeyDown: mode switch complete", {
                newMode: vimState.getMode(),
            });
        } else if (mode === "visual" || mode === "visual-line") {
            // Visual mode -> Normal mode
            debug("handleKeyDown: exiting visual mode to normal");
            exitVisualMode();
            debug("handleKeyDown: mode switch complete", {
                newMode: vimState.getMode(),
            });
        } else {
            // Normal mode -> unfocus
            debug("handleKeyDown: unfocusing from normal mode");
            vimState.clearCommand();
            vimState.setAllowBlur(true);
            currentInput.blur();
        }
        debug("handleKeyDown: ESC handling complete, returning");
        return;
    }

    // Scrolling commands (work in all modes - insert, normal, and visual)
    // In normal and visual modes, move the caret with the scroll
    if (e.ctrlKey && e.key === "e") {
        debug("handleKeyDown: Ctrl-e scroll down one line");
        e.preventDefault();
        const moveCaret = mode === "normal" || mode === "visual";
        scrollTextarea(currentInput, 1, moveCaret);
        return;
    }

    if (e.ctrlKey && e.key === "y") {
        debug("handleKeyDown: Ctrl-y scroll up one line");
        e.preventDefault();
        const moveCaret = mode === "normal" || mode === "visual";
        scrollTextarea(currentInput, -1, moveCaret);
        return;
    }

    if (e.ctrlKey && e.key === "d") {
        debug("handleKeyDown: Ctrl-d scroll down half page");
        e.preventDefault();
        const moveCaret = mode === "normal" || mode === "visual";
        scrollHalfPage(currentInput, true, moveCaret);
        return;
    }

    if (e.ctrlKey && e.key === "u") {
        debug("handleKeyDown: Ctrl-u scroll up half page");
        e.preventDefault();
        const moveCaret = mode === "normal" || mode === "visual";
        scrollHalfPage(currentInput, false, moveCaret);
        return;
    }

    // Redo (works in both normal and visual modes, but not insert)
    if (e.ctrlKey && e.key === "r" && mode !== "insert") {
        debug("handleKeyDown: Ctrl-r redo");
        e.preventDefault();
        const stacks = vimState.getHistoryStacks();
        redo(currentInput, stacks.undoStack, stacks.redoStack);
        return;
    }

    // Insert mode - allow normal typing
    if (mode === "insert") {
        debug("handleKeyDown: insert mode, passing through");
        return;
    }

    // Normal/Visual mode commands
    debug("handleKeyDown: normal/visual mode, processing command");
    e.preventDefault();

    // Mode-specific command handling
    processCommand(e.key);
}

// Initialize
debug("Vim Mode initialized");

// Only set up event listeners if window/document exist (not in test environment without jsdom setup)
if (typeof window === "undefined" || typeof document === "undefined") {
    debug("Skipping event listener setup - no window/document");
} else {
    // Track ESC/Ctrl-[ key state at the earliest possible point
    // Use keydown on window to catch before page handlers
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (isEscapeKey(e)) {
                debug("GLOBAL ESC/Ctrl-[ keydown detected", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    target: (e.target as HTMLElement).tagName,
                    eventPhase: e.eventPhase,
                    defaultPrevented: e.defaultPrevented,
                    timestamp: e.timeStamp,
                });
                vimState.setEscapePressed(true);
                // Clear the flag after a short timeout
                setTimeout(() => {
                    vimState.setEscapePressed(false);
                    debug("escapePressed flag cleared");
                }, 100);
            }
        },
        true,
    );

    // Track keyup as well to detect if ESC/Ctrl-[ was released
    window.addEventListener(
        "keyup",
        (e: KeyboardEvent) => {
            if (isEscapeKey(e)) {
                debug("GLOBAL ESC/Ctrl-[ keyup detected", {
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
        if (isEscapeKey(e)) {
            debug("RAW ESC/Ctrl-[ DETECTED on document", {
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
            if (isEscapeKey(e)) {
                debug("WINDOW ESC/Ctrl-[ listener", {
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
            const currentInput = vimState.getCurrentInput();
            if (
                currentInput &&
                e.target === currentInput &&
                vimState.getMode() === "insert"
            ) {
                debug("input event: updating line numbers");
                // Use requestAnimationFrame to ensure DOM has reflowed
                requestAnimationFrame(() => {
                    const input = vimState.getCurrentInput();
                    if (input) {
                        updateLineNumbers(input);
                    }
                });
            }
        },
        true,
    );

    // Add a second keydown listener to verify our handler runs first
    document.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (isEscapeKey(e)) {
                debug("Secondary ESC/Ctrl-[ listener (bubbling phase)", {
                    key: e.key,
                    ctrl: e.ctrlKey,
                    defaultPrevented: e.defaultPrevented,
                    propagationStopped: e.cancelBubble,
                    currentInput: !!vimState.getCurrentInput(),
                    mode: vimState.getMode(),
                });
            }
        },
        false,
    );

    // Fallback window-level escape handler
    // This catches cases where the input has lost focus but mode indicator is still visible
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (!isEscapeKey(e)) return;

            const currentInput = vimState.getCurrentInput();
            // Only act if we have a currentInput but it's not focused
            // This handles the case where tab switching broke the focus state
            if (currentInput && document.activeElement !== currentInput) {
                debug("Window-level escape fallback triggered", {
                    currentInput: !!currentInput,
                    activeElement: document.activeElement?.tagName,
                    mode: vimState.getMode(),
                });

                e.preventDefault();
                e.stopPropagation();

                // Clear the stale state
                vimState.clearCommand();
                syncCaretToMode(null, vimState.getMode()); // Remove caret
                removeLineNumbers();
                clearVisualSelection();
                vimState.setCurrentInput(null);
                vimState.setMode("normal");
                updateIndicator(vimState.getMode(), null);
            }
        },
        true,
    );

    // Window focus handler - validate state on tab/window focus
    window.addEventListener("focus", () => {
        const currentInput = vimState.getCurrentInput();
        debug("Window focus event", {
            currentInput: !!currentInput,
            mode: vimState.getMode(),
            activeElement: document.activeElement?.tagName,
        });

        // Check if we have a stale currentInput that's no longer focused
        if (currentInput && document.activeElement !== currentInput) {
            debug("Window focus: clearing stale input state", {
                currentInputTag: currentInput.tagName,
                activeElementTag: document.activeElement?.tagName,
            });

            // Clear the stale state
            syncCaretToMode(null, vimState.getMode()); // Remove caret
            removeLineNumbers();
            clearVisualSelection();
            vimState.setCurrentInput(null);
            vimState.setMode("normal");
            updateIndicator(vimState.getMode(), null);
        }
    });

    // MutationObserver to detect when the focused input is removed from DOM
    const mutationObserver = new MutationObserver(() => {
        const currentInput = vimState.getCurrentInput();
        if (!currentInput) return;

        // Check if currentInput is still in the document
        if (!document.contains(currentInput)) {
            debug("MutationObserver: currentInput removed from DOM", {
                mode: vimState.getMode(),
                inputTag: currentInput.tagName,
            });

            // Clean up vim state since the input is gone
            syncCaretToMode(null, vimState.getMode()); // Remove caret
            removeLineNumbers();
            clearVisualSelection();
            vimState.setCurrentInput(null);
            vimState.setMode("normal");
            updateIndicator(vimState.getMode(), null);
        }
    });

    // Observe the entire document for DOM changes
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Update custom caret and visual selection on scroll and resize
    window.addEventListener(
        "scroll",
        () => {
            const currentInput = vimState.getCurrentInput();
            const mode = vimState.getMode();
            if (currentInput) {
                if (mode === "normal") {
                    debug("scroll event: updating custom caret");
                    updateCustomCaret(currentInput);
                    updateLineNumbers(currentInput);
                } else if (mode === "visual" || mode === "visual-line") {
                    const visualStart = vimState.getVisualStart();
                    const visualEnd = vimState.getVisualEnd();
                    if (visualStart !== null && visualEnd !== null) {
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
            }
        },
        true,
    );

    window.addEventListener("resize", () => {
        const currentInput = vimState.getCurrentInput();
        const mode = vimState.getMode();
        if (currentInput) {
            if (mode === "normal") {
                debug("resize event: updating custom caret");
                updateCustomCaret(currentInput);
                updateLineNumbers(currentInput);
            } else if (mode === "visual" || mode === "visual-line") {
                const visualStart = vimState.getVisualStart();
                const visualEnd = vimState.getVisualEnd();
                if (visualStart !== null && visualEnd !== null) {
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
        }
    });

    debug("Event listeners attached", {
        testListener: !!testListener,
        handleKeyDown: !!handleKeyDown,
        handleFocus: !!handleFocus,
        handleBlur: !!handleBlur,
    });
} // End of window/document check

updateIndicator(vimState.getMode(), vimState.getCurrentInput());
