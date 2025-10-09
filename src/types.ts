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
    insertedText?: string;
}

export interface TextRange {
    start: number;
    end: number;
}

export interface LineInfo extends TextRange {
    text: string;
}

export interface CaretPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CaretRenderer {
    show(position: CaretPosition): void;
    hide(): void;
    isActive(): boolean;
}

export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface VisualSelection {
    start: number;
    end: number;
}

export interface VisualSelectionRenderer {
    render(rects: SelectionRect[]): void;
    clear(): void;
    destroy(): void;
}

export interface LineNumbersRenderer {
    render(
        input: EditableElement,
        currentLine: number,
        totalLines: number,
    ): void;
    hide(): void;
    destroy(): void;
}

export interface TextMetrics {
    measureText(text: string): number;
    getCharWidth(char: string): number;
    getFontSize(): number;
    getLineHeight(): number;
}

export interface Register {
    content: string;
    linewise: boolean;
}

export interface State {
    mode: Mode;
    currentInput: EditableElement | null;
    commandBuffer: string;
    countBuffer: string;
    operatorPending: string | null;
    clipboard: { content: string; linewise: boolean };
    registers: Map<string, Register>;
    registerPrefix: string | null;
    undoStack: UndoState[];
    redoStack: UndoState[];
    lastChange: LastChange | null;
    lastFindChar: string;
    lastFindDirection: boolean;
    lastFindType: string;
    allowBlur: boolean;
    visualStart: number;
    visualEnd: number;
    visualAnchor: number | null;
    enterInsertMode: (command?: string) => void;
    enterVisualMode: (linewise: boolean) => void;
}
