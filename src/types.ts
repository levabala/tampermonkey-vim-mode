// Type definitions for the Vim mode userscript

export type Mode = "normal" | "insert" | "visual" | "visual-line";

export type InputElement = HTMLInputElement;

export type TextAreaElement = HTMLTextAreaElement;

export type EditableElement = HTMLInputElement | HTMLTextAreaElement;

export interface UndoState {
    value: string;
    selectionStart: number;
    selectionEnd: number;
}

export interface LastChange {
    type?: string;
    count?: number;
    motion?: string;
    char?: string;
    operator?: string;
    textObject?: string;
    command?: string;
}

export interface TextRange {
    start: number;
    end: number;
}

export interface LineInfo extends TextRange {
    text: string;
}

export interface State {
    mode: Mode;
    currentInput: EditableElement | null;
    commandBuffer: string;
    countBuffer: string;
    operatorPending: string | null;
    clipboard: { content: string };
    undoStack: UndoState[];
    redoStack: UndoState[];
    lastChange: LastChange | null;
    lastFindChar: string;
    lastFindDirection: boolean;
    lastFindType: string;
    allowBlur: boolean;
    visualStart: number;
    visualEnd: number;
    enterInsertMode: () => void;
    enterVisualMode: (linewise: boolean) => void;
}
