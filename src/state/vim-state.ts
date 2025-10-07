import { debug } from "../setup.js";
import type { EditableElement, Mode, UndoState, LastChange } from "../types.js";

/**
 * Per-input state - each input element has its own instance
 */
interface InputState {
    mode: Mode;

    // Command state
    commandBuffer: string;
    countBuffer: string;
    operatorPending: string | null;

    // Find state (f/F/t/T commands)
    lastFindChar: string;
    lastFindDirection: boolean;
    lastFindType: string;

    // Visual mode state
    visualStart: number | null;
    visualEnd: number | null;

    // Insert mode state
    insertStartPos: number | null;
    insertStartValue: string | null;
    insertCommand: string | null;

    // History
    undoStack: UndoState[];
    redoStack: UndoState[];
    lastChange: LastChange | null;

    // Cursor memory for vertical motions
    wantedColumn: number | null;

    // Blur/focus state
    savedCursorPos: number | null;
}

/**
 * Global state - shared across all inputs
 */
interface GlobalState {
    currentInput: EditableElement | null;
    clipboard: { content: string; linewise: boolean };
    allowBlur: boolean;
    escapePressed: boolean;
}

/**
 * Creates a new empty InputState
 */
function createInputState(mode: Mode = "insert"): InputState {
    return {
        mode,
        commandBuffer: "",
        countBuffer: "",
        operatorPending: null,
        lastFindChar: "",
        lastFindDirection: false,
        lastFindType: "",
        visualStart: null,
        visualEnd: null,
        insertStartPos: null,
        insertStartValue: null,
        insertCommand: null,
        undoStack: [],
        redoStack: [],
        lastChange: null,
        wantedColumn: null,
        savedCursorPos: null,
    };
}

/**
 * Centralized state management for Vim mode
 * Maintains per-input state using WeakMap
 */
export class VimState {
    // Per-input state storage
    private inputStates = new WeakMap<EditableElement, InputState>();

    // Global state
    private global: GlobalState = {
        currentInput: null,
        clipboard: { content: "", linewise: false },
        allowBlur: false,
        escapePressed: false,
    };

    // ===== Current Input Management =====

    getCurrentInput(): EditableElement | null {
        return this.global.currentInput;
    }

    setCurrentInput(input: EditableElement | null): void {
        debug("VimState.setCurrentInput", {
            prev: this.global.currentInput?.tagName,
            next: input?.tagName,
        });
        this.global.currentInput = input;
    }

    // ===== Input State Management =====

    /**
     * Get or create state for an input
     */
    private getInputState(input: EditableElement): InputState {
        let state = this.inputStates.get(input);
        if (!state) {
            state = createInputState("insert");
            this.inputStates.set(input, state);
            debug("VimState: created new state for input", {
                tag: input.tagName,
            });
        }
        return state;
    }

    /**
     * Get state for current input
     */
    private getCurrentState(): InputState | null {
        if (!this.global.currentInput) return null;
        return this.getInputState(this.global.currentInput);
    }

    /**
     * Initialize state for a new input
     */
    initializeInput(input: EditableElement, mode: Mode = "insert"): void {
        const state = createInputState(mode);
        this.inputStates.set(input, state);
        debug("VimState.initializeInput", { tag: input.tagName, mode });
    }

    // ===== Mode Management =====

    getMode(): Mode {
        const state = this.getCurrentState();
        return state?.mode ?? "normal";
    }

    setMode(mode: Mode): void {
        const state = this.getCurrentState();
        if (state) {
            debug("VimState.setMode", { from: state.mode, to: mode });
            state.mode = mode;
        }
    }

    // ===== Command State =====

    getCommandBuffer(): string {
        return this.getCurrentState()?.commandBuffer ?? "";
    }

    setCommandBuffer(value: string): void {
        const state = this.getCurrentState();
        if (state) state.commandBuffer = value;
    }

    getCountBuffer(): string {
        return this.getCurrentState()?.countBuffer ?? "";
    }

    setCountBuffer(value: string): void {
        const state = this.getCurrentState();
        if (state) state.countBuffer = value;
    }

    getCount(): number {
        return parseInt(this.getCountBuffer()) || 1;
    }

    getOperatorPending(): string | null {
        return this.getCurrentState()?.operatorPending ?? null;
    }

    setOperatorPending(value: string | null): void {
        const state = this.getCurrentState();
        if (state) state.operatorPending = value;
    }

    clearCommand(): void {
        const state = this.getCurrentState();
        if (state) {
            state.commandBuffer = "";
            state.countBuffer = "";
            state.operatorPending = null;
        }
    }

    // ===== Find State =====

    getLastFindChar(): string {
        return this.getCurrentState()?.lastFindChar ?? "";
    }

    setLastFindChar(value: string): void {
        const state = this.getCurrentState();
        if (state) state.lastFindChar = value;
    }

    getLastFindDirection(): boolean {
        return this.getCurrentState()?.lastFindDirection ?? false;
    }

    setLastFindDirection(value: boolean): void {
        const state = this.getCurrentState();
        if (state) state.lastFindDirection = value;
    }

    getLastFindType(): string {
        return this.getCurrentState()?.lastFindType ?? "";
    }

    setLastFindType(value: string): void {
        const state = this.getCurrentState();
        if (state) state.lastFindType = value;
    }

    setFindState(char: string, direction: boolean, type: string): void {
        const state = this.getCurrentState();
        if (state) {
            state.lastFindChar = char;
            state.lastFindDirection = direction;
            state.lastFindType = type;
        }
    }

    // ===== Visual Mode State =====

    getVisualStart(): number | null {
        return this.getCurrentState()?.visualStart ?? null;
    }

    setVisualStart(value: number | null): void {
        const state = this.getCurrentState();
        if (state) state.visualStart = value;
    }

    getVisualEnd(): number | null {
        return this.getCurrentState()?.visualEnd ?? null;
    }

    setVisualEnd(value: number | null): void {
        const state = this.getCurrentState();
        if (state) state.visualEnd = value;
    }

    setVisualRange(start: number | null, end: number | null): void {
        const state = this.getCurrentState();
        if (state) {
            state.visualStart = start;
            state.visualEnd = end;
        }
    }

    clearVisual(): void {
        const state = this.getCurrentState();
        if (state) {
            state.visualStart = null;
            state.visualEnd = null;
        }
    }

    // ===== Insert Mode State =====

    getInsertStartPos(): number | null {
        return this.getCurrentState()?.insertStartPos ?? null;
    }

    setInsertStartPos(value: number | null): void {
        const state = this.getCurrentState();
        if (state) state.insertStartPos = value;
    }

    getInsertStartValue(): string | null {
        return this.getCurrentState()?.insertStartValue ?? null;
    }

    setInsertStartValue(value: string | null): void {
        const state = this.getCurrentState();
        if (state) state.insertStartValue = value;
    }

    getInsertCommand(): string | null {
        return this.getCurrentState()?.insertCommand ?? null;
    }

    setInsertCommand(value: string | null): void {
        const state = this.getCurrentState();
        if (state) state.insertCommand = value;
    }

    setInsertState(pos: number, value: string, command: string): void {
        const state = this.getCurrentState();
        if (state) {
            state.insertStartPos = pos;
            state.insertStartValue = value;
            state.insertCommand = command;
        }
    }

    clearInsertState(): void {
        const state = this.getCurrentState();
        if (state) {
            state.insertStartPos = null;
            state.insertStartValue = null;
            state.insertCommand = null;
        }
    }

    // ===== History (Undo/Redo) =====

    getUndoStack(): UndoState[] {
        return this.getCurrentState()?.undoStack ?? [];
    }

    getRedoStack(): UndoState[] {
        return this.getCurrentState()?.redoStack ?? [];
    }

    // Returns direct references for compatibility with existing code
    getHistoryStacks(): { undoStack: UndoState[]; redoStack: UndoState[] } {
        const state = this.getCurrentState();
        if (!state) {
            // Return empty arrays for compatibility
            return { undoStack: [], redoStack: [] };
        }
        return {
            undoStack: state.undoStack,
            redoStack: state.redoStack,
        };
    }

    // ===== Last Change =====

    getLastChange(): LastChange | null {
        return this.getCurrentState()?.lastChange ?? null;
    }

    setLastChange(value: LastChange | null): void {
        const state = this.getCurrentState();
        if (state) state.lastChange = value;
    }

    // ===== Column Memory =====

    getWantedColumn(): number | null {
        return this.getCurrentState()?.wantedColumn ?? null;
    }

    setWantedColumn(value: number | null): void {
        const state = this.getCurrentState();
        if (state) state.wantedColumn = value;
    }

    // ===== Cursor Position Memory =====

    getSavedCursorPos(): number | null {
        return this.getCurrentState()?.savedCursorPos ?? null;
    }

    setSavedCursorPos(value: number | null): void {
        const state = this.getCurrentState();
        if (state) state.savedCursorPos = value;
    }

    // ===== Global Clipboard =====

    getClipboard(): { content: string; linewise: boolean } {
        return this.global.clipboard;
    }

    setClipboard(content: string, linewise = false): void {
        debug("VimState.setClipboard", { content, linewise });
        this.global.clipboard = { content, linewise };
    }

    // ===== Blur/Focus State =====

    getAllowBlur(): boolean {
        return this.global.allowBlur;
    }

    setAllowBlur(value: boolean): void {
        this.global.allowBlur = value;
    }

    getEscapePressed(): boolean {
        return this.global.escapePressed;
    }

    setEscapePressed(value: boolean): void {
        this.global.escapePressed = value;
    }

    // ===== Utility Methods =====

    /**
     * Check if we have state for an input
     */
    hasState(input: EditableElement): boolean {
        return this.inputStates.has(input);
    }

    /**
     * Get complete state for legacy State interface
     * Used during transition period
     */
    getLegacyState(): {
        mode: Mode;
        currentInput: EditableElement | null;
        commandBuffer: string;
        countBuffer: string;
        operatorPending: string | null;
        lastFindChar: string;
        lastFindDirection: boolean;
        lastFindType: string;
        clipboard: { content: string; linewise: boolean };
        undoStack: UndoState[];
        redoStack: UndoState[];
        lastChange: LastChange | null;
        visualStart: number;
        visualEnd: number;
        allowBlur: boolean;
    } {
        const stacks = this.getHistoryStacks();
        return {
            mode: this.getMode(),
            currentInput: this.getCurrentInput(),
            commandBuffer: this.getCommandBuffer(),
            countBuffer: this.getCountBuffer(),
            operatorPending: this.getOperatorPending(),
            lastFindChar: this.getLastFindChar(),
            lastFindDirection: this.getLastFindDirection(),
            lastFindType: this.getLastFindType(),
            clipboard: this.getClipboard(),
            undoStack: stacks.undoStack,
            redoStack: stacks.redoStack,
            lastChange: this.getLastChange(),
            visualStart: this.getVisualStart() ?? 0,
            visualEnd: this.getVisualEnd() ?? 0,
            allowBlur: this.getAllowBlur(),
        };
    }

    /**
     * Update state from legacy State interface
     * Used during transition period
     */
    updateFromLegacyState(legacyState: {
        countBuffer?: string;
        commandBuffer?: string;
        operatorPending?: string | null;
        lastFindChar?: string;
        lastFindDirection?: boolean;
        lastFindType?: string;
        lastChange?: LastChange | null;
        visualStart?: number | null;
        visualEnd?: number | null;
    }): void {
        if (legacyState.countBuffer !== undefined) {
            this.setCountBuffer(legacyState.countBuffer);
        }
        if (legacyState.commandBuffer !== undefined) {
            this.setCommandBuffer(legacyState.commandBuffer);
        }
        if (legacyState.operatorPending !== undefined) {
            this.setOperatorPending(legacyState.operatorPending);
        }
        if (legacyState.lastFindChar !== undefined) {
            this.setLastFindChar(legacyState.lastFindChar);
        }
        if (legacyState.lastFindDirection !== undefined) {
            this.setLastFindDirection(legacyState.lastFindDirection);
        }
        if (legacyState.lastFindType !== undefined) {
            this.setLastFindType(legacyState.lastFindType);
        }
        if (legacyState.lastChange !== undefined) {
            this.setLastChange(legacyState.lastChange);
        }
        if (legacyState.visualStart !== undefined) {
            this.setVisualStart(legacyState.visualStart);
        }
        if (legacyState.visualEnd !== undefined) {
            this.setVisualEnd(legacyState.visualEnd);
        }
    }
}
