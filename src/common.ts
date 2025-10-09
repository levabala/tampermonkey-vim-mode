import { debug, TAMPER_VIM_MODE } from "./setup.js";
import type {
    CaretPosition,
    CaretRenderer,
    EditableElement,
    LineInfo,
    TextMetrics,
    UndoState,
    SelectionRect,
    VisualSelectionRenderer,
    LineNumbersRenderer,
} from "./types.js";
import { ChunkedLineNumbersRenderer } from "./chunked-line-numbers-renderer.js";
import { createSmartDebounce } from "./debounce.js";

// Custom caret management
let customCaret: HTMLDivElement | null = null;
let currentRenderer: CaretRenderer | null = null;
let isCreatingCaret = false;

// Visual selection management
let visualSelectionRenderer: VisualSelectionRenderer | null = null;

// Line numbers management
let lineNumbersRenderer: LineNumbersRenderer | null = null;

// Note: visualRowsCache has been moved to chunked-line-numbers-renderer.ts
// Clear visual rows cache (useful for testing and when input changes)
export function clearVisualRowsCache(): void {
    // This is now a no-op, kept for backwards compatibility
}

// DOM-based text metrics implementation
export class DOMTextMetrics implements TextMetrics {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private input: EditableElement;
    private computedStyle: CSSStyleDeclaration;

    constructor(input: EditableElement) {
        this.input = input;
        this.computedStyle = window.getComputedStyle(input);
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        if (this.ctx) {
            const fontSize = this.getFontSize();
            const fontFamily = this.computedStyle.fontFamily;
            this.ctx.font = `${fontSize}px ${fontFamily}`;
        }
    }

    measureText(text: string): number {
        if (!this.ctx) return 0;
        return this.ctx.measureText(text).width;
    }

    getCharWidth(char: string): number {
        if (!this.ctx) return 0;
        return this.ctx.measureText(char).width;
    }

    getFontSize(): number {
        return parseFloat(this.computedStyle.fontSize);
    }

    getLineHeight(): number {
        const lineHeight = this.computedStyle.lineHeight;
        return lineHeight === "normal"
            ? this.getFontSize() * 1.2
            : parseFloat(lineHeight);
    }
}

// DOM-based caret renderer
export class DOMCaretRenderer implements CaretRenderer {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement("div");
        this.element.style.position = "absolute";
        this.element.style.pointerEvents = "none";
        this.element.style.zIndex = "9999";
        this.element.style.backgroundColor = "white";
        this.element.style.mixBlendMode = "difference";
        document.body.appendChild(this.element);
    }

    show(position: CaretPosition): void {
        this.element.style.left = `${position.x}px`;
        this.element.style.top = `${position.y}px`;
        this.element.style.width = `${position.width}px`;
        this.element.style.height = `${position.height}px`;
        this.element.style.display = "block";
    }

    hide(): void {
        this.element.style.display = "none";
    }

    isActive(): boolean {
        return this.element.parentElement !== null;
    }

    destroy(): void {
        this.element.remove();
    }
}

// DOM-based visual selection renderer
export class DOMVisualSelectionRenderer implements VisualSelectionRenderer {
    private container: HTMLDivElement;
    private rects: HTMLDivElement[] = [];

    constructor() {
        this.container = document.createElement("div");
        this.container.style.position = "absolute";
        this.container.style.top = "0";
        this.container.style.left = "0";
        this.container.style.width = "0";
        this.container.style.height = "0";
        this.container.style.pointerEvents = "none";
        this.container.style.zIndex = "9998"; // Below caret but above content
        document.body.appendChild(this.container);
    }

    render(rects: SelectionRect[]): void {
        // Clear existing rectangles
        this.clear();

        // Create new rectangles for each selection rect
        for (const rect of rects) {
            const div = document.createElement("div");
            div.style.position = "absolute";
            div.style.left = `${rect.x}px`;
            div.style.top = `${rect.y}px`;
            div.style.width = `${rect.width}px`;
            div.style.height = `${rect.height}px`;
            div.style.backgroundColor = "rgba(80, 120, 255, 0.3)";
            div.style.border = "none";
            div.style.pointerEvents = "none";
            this.container.appendChild(div);
            this.rects.push(div);
        }
    }

    clear(): void {
        // Remove all rectangles
        for (const rect of this.rects) {
            rect.remove();
        }
        this.rects = [];
    }

    destroy(): void {
        this.clear();
        this.container.remove();
    }
}

// Note: calculateVisualRows has been moved to chunked-line-numbers-renderer.ts

// Calculate caret position (pure function, no side effects)
export function calculateCaretPosition(
    input: EditableElement,
    metrics: TextMetrics,
): CaretPosition {
    const pos = getCursorPos(input);
    const text = input.value;
    const char = text[pos] || " ";

    const computedStyle = window.getComputedStyle(input);
    const rect = input.getBoundingClientRect();

    const charWidth = metrics.getCharWidth(char);
    const lineHeight = metrics.getLineHeight();

    // Get padding values
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingTop = parseFloat(computedStyle.paddingTop);

    let x: number;
    let y: number;

    if (input.tagName === "TEXTAREA") {
        // Multi-line: use mirror to measure actual text position
        const mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.wordWrap = "break-word";
        mirror.style.overflowWrap = "break-word";

        // Match the textarea's computed width exactly (includes padding)
        mirror.style.width = computedStyle.width;

        // Copy all relevant styles from input to mirror
        const stylesToCopy = [
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "letter-spacing",
            "text-transform",
            "word-spacing",
            "text-indent",
            "line-height",
            "padding-left",
            "padding-top",
            "padding-right",
            "padding-bottom",
            "border-left-width",
            "border-top-width",
            "box-sizing",
        ];

        stylesToCopy.forEach((prop) => {
            mirror.style.setProperty(
                prop,
                computedStyle.getPropertyValue(prop),
            );
        });

        document.body.appendChild(mirror);

        const textBeforeCursor = text.substring(0, pos);
        mirror.textContent = textBeforeCursor;

        // Create a span at the cursor position to measure
        const cursorSpan = document.createElement("span");
        cursorSpan.textContent = text[pos] || " ";
        cursorSpan.style.position = "relative";
        mirror.appendChild(cursorSpan);

        // Add remaining text after cursor
        const afterSpan = document.createTextNode(text.substring(pos + 1));
        mirror.appendChild(afterSpan);

        const spanRect = cursorSpan.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // Calculate position relative to input, accounting for scroll
        // The mirror has padding applied, so spanRect - mirrorRect gives position
        // relative to the mirror's border box, which already includes padding
        x =
            rect.left +
            window.scrollX +
            (spanRect.left - mirrorRect.left) -
            input.scrollLeft;
        y =
            rect.top +
            window.scrollY +
            (spanRect.top - mirrorRect.top) -
            input.scrollTop;

        // Clean up mirror element
        mirror.remove();
    } else {
        // Single-line: use canvas measurement for accuracy
        const textBeforeCursor = text.substring(0, pos);
        const textWidth = metrics.measureText(textBeforeCursor);

        x =
            rect.left +
            window.scrollX +
            paddingLeft +
            textWidth -
            input.scrollLeft;
        y = rect.top + window.scrollY + paddingTop;
    }

    return { x, y, width: charWidth, height: lineHeight };
}

export function createCustomCaret(
    input: EditableElement,
    renderer?: CaretRenderer,
): void {
    debug("createCustomCaret: called", {
        hasCurrentRenderer: !!currentRenderer,
        isCreating: isCreatingCaret,
    });

    // Prevent re-entrant calls
    if (isCreatingCaret) {
        debug("createCustomCaret: already creating, skipping");
        return;
    }

    isCreatingCaret = true;

    try {
        // Clean up existing renderer
        if (currentRenderer && currentRenderer instanceof DOMCaretRenderer) {
            debug("createCustomCaret: destroying existing renderer");
            (currentRenderer as DOMCaretRenderer).destroy();
            currentRenderer = null;
        }
        if (customCaret) {
            customCaret.remove();
            customCaret = null;
        }

        // Check if custom caret is disabled via config
        if (TAMPER_VIM_MODE.disableCustomCaret) {
            debug(
                "createCustomCaret: disabled via config, keeping native caret",
            );
            return;
        }

        // Hide native caret
        input.style.caretColor = "transparent";

        // Use provided renderer or create default DOM renderer
        if (renderer) {
            currentRenderer = renderer;
        } else {
            const domRenderer = new DOMCaretRenderer();
            currentRenderer = domRenderer;
            customCaret = domRenderer["element"]; // For backward compatibility
        }

        debug("createCustomCaret: created renderer, now updating", {
            hasRenderer: !!currentRenderer,
        });

        // Ensure we have a renderer before calling update
        if (!currentRenderer) {
            debug("createCustomCaret: ERROR - no renderer after creation!");
            return;
        }

        updateCustomCaret(input);
    } finally {
        isCreatingCaret = false;
    }
}

export function updateCustomCaret(
    input: EditableElement,
    metrics?: TextMetrics,
): void {
    if (!currentRenderer) {
        debug("updateCustomCaret: no renderer, aborting");
        return;
    }

    // Create metrics if not provided
    const textMetrics = metrics || new DOMTextMetrics(input);

    // Calculate position using the abstracted function
    const position = calculateCaretPosition(input, textMetrics);

    // Render using the current renderer
    currentRenderer.show(position);
}

export function removeCustomCaret(input: EditableElement | null): void {
    if (currentRenderer) {
        if (currentRenderer instanceof DOMCaretRenderer) {
            (currentRenderer as DOMCaretRenderer).destroy();
        }
        currentRenderer = null;
    }
    if (customCaret) {
        customCaret.remove();
        customCaret = null;
    }
    if (input) {
        input.style.caretColor = "";
    }
}

/**
 * Centralized caret lifecycle management based on mode.
 * This is the single source of truth for "should caret exist right now?"
 *
 * Rules:
 * - normal mode: custom wide block caret
 * - insert/visual modes: native caret (no custom caret)
 * - no input: remove any existing caret
 */
export function syncCaretToMode(
    input: EditableElement | null,
    mode: string,
): void {
    debug("syncCaretToMode", { hasInput: !!input, mode });

    if (!input) {
        // No input, remove any existing caret
        removeCustomCaret(null);
        return;
    }

    if (mode === "normal") {
        // Normal mode needs custom wide caret
        createCustomCaret(input);
    } else {
        // All other modes (insert, visual, visual-line) use native caret
        removeCustomCaret(input);
    }
}

// Calculate selection rectangles for visual mode (supports multiline)
export function calculateSelectionRects(
    input: EditableElement,
    start: number,
    end: number,
    metrics: TextMetrics,
): SelectionRect[] {
    const text = input.value;
    const rects: SelectionRect[] = [];

    // Ensure start < end
    const selStart = Math.min(start, end);
    const selEnd = Math.max(start, end);

    const computedStyle = window.getComputedStyle(input);
    const rect = input.getBoundingClientRect();
    const lineHeight = metrics.getLineHeight();
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingTop = parseFloat(computedStyle.paddingTop);

    if (input.tagName === "TEXTAREA") {
        // Multi-line: calculate rectangles for each line in selection
        // Use mirror technique similar to calculateVisualRows for accurate wrapping detection
        const mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.wordWrap = "break-word";
        mirror.style.overflowWrap = "break-word";

        // Calculate content width (exclude padding from textarea)
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const contentWidth = input.clientWidth - paddingLeft - paddingRight;

        mirror.style.width = `${contentWidth}px`;

        const stylesToCopy = [
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "letter-spacing",
            "text-transform",
            "word-spacing",
            "text-indent",
            "line-height",
        ];

        stylesToCopy.forEach((prop) => {
            const value =
                typeof computedStyle.getPropertyValue === "function"
                    ? computedStyle.getPropertyValue(prop)
                    : (computedStyle as unknown as Record<string, string>)[
                          prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
                      ];
            mirror.style.setProperty(prop, value);
        });

        document.body.appendChild(mirror);

        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const effectiveLineHeight = isNaN(lineHeight)
            ? fontSize * 1.2
            : lineHeight;

        // Split selection into lines
        const selectedText = text.substring(selStart, selEnd);
        const textBeforeSelection = text.substring(0, selStart);

        // Create a positioning mirror for accurate Y positioning
        // Must use same width as mirror to ensure text wraps identically
        const posMirror = document.createElement("div");
        posMirror.style.position = "absolute";
        posMirror.style.visibility = "hidden";
        posMirror.style.whiteSpace = "pre-wrap";
        posMirror.style.wordWrap = "break-word";
        posMirror.style.width = `${contentWidth}px`;

        const posStylesToCopy = [
            "font-family",
            "font-size",
            "font-weight",
            "font-style",
            "letter-spacing",
            "text-transform",
            "word-spacing",
            "text-indent",
            "line-height",
        ];

        posStylesToCopy.forEach((prop) => {
            posMirror.style.setProperty(
                prop,
                computedStyle.getPropertyValue(prop),
            );
        });

        document.body.appendChild(posMirror);

        // Find line breaks in selection
        let lineStartInSelection = 0;

        while (lineStartInSelection < selectedText.length) {
            const lineEndInSelection = selectedText.indexOf(
                "\n",
                lineStartInSelection,
            );
            const isLastLine = lineEndInSelection === -1;
            const lineText = isLastLine
                ? selectedText.substring(lineStartInSelection)
                : selectedText.substring(
                      lineStartInSelection,
                      lineEndInSelection,
                  );

            // Measure this line IN ISOLATION to detect wrapping correctly
            mirror.textContent = lineText || " ";
            const isolatedHeight = mirror.offsetHeight;
            const visualRows = Math.max(
                1,
                Math.round(isolatedHeight / effectiveLineHeight),
            );

            // Get Y position using positioning mirror with context
            posMirror.textContent =
                textBeforeSelection +
                selectedText.substring(0, lineStartInSelection);

            const lineStartSpan = document.createElement("span");
            lineStartSpan.textContent = lineText || " ";
            posMirror.appendChild(lineStartSpan);

            const lineStartRect = lineStartSpan.getBoundingClientRect();
            const posMirrorRect = posMirror.getBoundingClientRect();

            // Add padding to position since posMirror doesn't have padding
            const x =
                rect.left +
                window.scrollX +
                paddingLeft +
                (lineStartRect.left - posMirrorRect.left) -
                input.scrollLeft;
            const baseY =
                rect.top +
                window.scrollY +
                paddingTop +
                (lineStartRect.top - posMirrorRect.top) -
                input.scrollTop;

            // If line wraps, create multiple rectangles (one per visual row)
            if (visualRows > 1) {
                for (let vRow = 0; vRow < visualRows; vRow++) {
                    rects.push({
                        x:
                            rect.left +
                            window.scrollX +
                            paddingLeft -
                            input.scrollLeft,
                        y: baseY + vRow * effectiveLineHeight,
                        width: contentWidth,
                        height: effectiveLineHeight,
                    });
                }
            } else {
                // Single row: use measured width
                rects.push({
                    x,
                    y: baseY,
                    width: lineStartRect.width,
                    height: effectiveLineHeight,
                });
            }

            // Clean up for next iteration
            posMirror.innerHTML = "";

            if (isLastLine) break;

            // Move to next line
            lineStartInSelection = lineEndInSelection + 1;
        }

        mirror.remove();
        posMirror.remove();
    } else {
        // Single-line: simple rectangle calculation
        const textBeforeSelection = text.substring(0, selStart);
        const selectedText = text.substring(selStart, selEnd);

        const startX = metrics.measureText(textBeforeSelection);
        const width = metrics.measureText(selectedText);

        const x =
            rect.left +
            window.scrollX +
            paddingLeft +
            startX -
            input.scrollLeft;
        const y = rect.top + window.scrollY + paddingTop;

        rects.push({ x, y, width, height: lineHeight });
    }

    return rects;
}

// Create and manage visual selection renderer
export function createVisualSelection(): void {
    if (visualSelectionRenderer) {
        visualSelectionRenderer.destroy();
    }
    visualSelectionRenderer = new DOMVisualSelectionRenderer();
}

export function updateVisualSelection(
    input: EditableElement,
    start: number,
    end: number,
    metrics?: TextMetrics,
): void {
    if (!visualSelectionRenderer) {
        createVisualSelection();
    }

    const textMetrics = metrics || new DOMTextMetrics(input);
    const rects = calculateSelectionRects(input, start, end, textMetrics);
    visualSelectionRenderer?.render(rects);
}

export function clearVisualSelection(): void {
    visualSelectionRenderer?.clear();
}

export function removeVisualSelection(): void {
    if (visualSelectionRenderer) {
        visualSelectionRenderer.destroy();
        visualSelectionRenderer = null;
    }
}

// Create and manage line numbers renderer
export function createLineNumbers(): void {
    if (lineNumbersRenderer) {
        lineNumbersRenderer.destroy();
    }
    lineNumbersRenderer = new ChunkedLineNumbersRenderer();
}

// Internal function to render line numbers
function renderLineNumbers(input: EditableElement): void {
    const text = input.value;
    const pos = getCursorPos(input);
    const textBeforeCursor = text.substring(0, pos);
    const currentLine = (textBeforeCursor.match(/\n/g) || []).length + 1;
    const totalLines = (text.match(/\n/g) || []).length + 1;

    lineNumbersRenderer?.render(input, currentLine, totalLines);
}

// Create debounced version (50ms debounce - batches rapid ops)
const debouncedRenderLineNumbers = createSmartDebounce(renderLineNumbers, 50);

export function updateLineNumbers(input: EditableElement): void {
    if (!TAMPER_VIM_MODE.showLineNumbers) {
        lineNumbersRenderer?.hide();
        return;
    }

    if (!lineNumbersRenderer) {
        createLineNumbers();
    }

    debouncedRenderLineNumbers(input);
}

export function hideLineNumbers(): void {
    lineNumbersRenderer?.hide();
}

export function removeLineNumbers(): void {
    if (lineNumbersRenderer) {
        lineNumbersRenderer.destroy();
        lineNumbersRenderer = null;
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
    updateLineNumbers(currentInput);
}

// Cache for line information to avoid repeated scanning
let lineInfoCache: {
    text: string;
    lines: { start: number; end: number }[];
} | null = null;

// Clear line cache (useful for testing)
export function clearLineCache(): void {
    lineInfoCache = null;
    clearVisualRowsCache(); // Also clear visual rows cache when text changes
}

function buildLineCache(text: string): { start: number; end: number }[] {
    const lines: { start: number; end: number }[] = [];
    let start = 0;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === "\n") {
            lines.push({ start, end: i });
            start = i + 1;
        }
    }
    // Add the last line
    lines.push({ start, end: text.length });

    return lines;
}

function getLineCached(
    text: string,
    pos: number,
): { start: number; end: number; lineIndex: number } {
    // Rebuild cache if text changed
    if (!lineInfoCache || lineInfoCache.text !== text) {
        lineInfoCache = {
            text,
            lines: buildLineCache(text),
        };
    }

    // Binary search to find the line containing pos
    const lines = lineInfoCache.lines;
    let left = 0;
    let right = lines.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const line = lines[mid];

        if (pos < line.start) {
            right = mid - 1;
        } else if (pos > line.end) {
            left = mid + 1;
        } else {
            // Found the line
            return { start: line.start, end: line.end, lineIndex: mid };
        }
    }

    // Fallback (shouldn't happen)
    return { start: 0, end: 0, lineIndex: 0 };
}

export function getLine(currentInput: EditableElement, pos: number): LineInfo {
    const text = currentInput.value;
    const cached = getLineCached(text, pos);
    return {
        start: cached.start,
        end: cached.end,
        text: text.substring(cached.start, cached.end),
    };
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

// Scrolling functions
export function scrollTextarea(
    currentInput: EditableElement,
    lines: number,
    moveCaret = false,
): void {
    // Calculate line height from element styles
    const computedStyle = window.getComputedStyle(currentInput);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    const effectiveLineHeight = isNaN(lineHeight) ? fontSize * 1.2 : lineHeight;

    const scrollAmount = lines * effectiveLineHeight;
    const oldScrollTop = currentInput.scrollTop;

    // If moveCaret is true, calculate current caret position relative to viewport
    let caretLineBeforeScroll = 0;
    let currentPos = 0;
    if (moveCaret) {
        currentPos = getCursorPos(currentInput);
        const textBeforeCaret = currentInput.value.substring(0, currentPos);
        const linesBeforeCaret = (textBeforeCaret.match(/\n/g) || []).length;
        caretLineBeforeScroll = linesBeforeCaret;
    }

    // Try to scroll the textarea
    currentInput.scrollTop += scrollAmount;

    // Check if textarea actually scrolled
    const actualScroll = currentInput.scrollTop - oldScrollTop;
    const remainingScroll = scrollAmount - actualScroll;

    // If textarea couldn't scroll fully (hit top/bottom boundary),
    // scroll the window instead
    if (Math.abs(remainingScroll) > 1) {
        window.scrollBy(0, remainingScroll);
    }

    // If moveCaret is true, move caret by the same number of lines we scrolled
    // This includes both textarea scroll and window scroll
    if (moveCaret) {
        // Calculate total scroll in lines (textarea + window)
        const totalScrollAmount = scrollAmount;
        const linesScrolled = Math.round(
            totalScrollAmount / effectiveLineHeight,
        );
        const targetLine = caretLineBeforeScroll + linesScrolled;

        // Find the position at the target line
        const textLines = currentInput.value.split("\n");
        const clampedTargetLine = Math.max(
            0,
            Math.min(targetLine, textLines.length - 1),
        );

        // Get column position on current line
        const currentLine = getLine(currentInput, currentPos);
        const columnOffset = currentPos - currentLine.start;

        // Calculate new position at target line with same column offset
        let newPos = 0;
        for (let i = 0; i < clampedTargetLine; i++) {
            newPos += textLines[i].length + 1; // +1 for newline
        }
        newPos += Math.min(columnOffset, textLines[clampedTargetLine].length);

        setCursorPos(currentInput, newPos);
    }
}

export function scrollHalfPage(
    currentInput: EditableElement,
    down: boolean,
    moveCaret = false,
): void {
    const computedStyle = window.getComputedStyle(currentInput);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    const effectiveLineHeight = isNaN(lineHeight) ? fontSize * 1.2 : lineHeight;

    // Calculate visible lines (half page)
    const visibleHeight = currentInput.clientHeight;
    const halfPageLines = Math.floor(visibleHeight / effectiveLineHeight / 2);

    // Scroll by half page
    scrollTextarea(
        currentInput,
        down ? halfPageLines : -halfPageLines,
        moveCaret,
    );
}

export function isWordChar(char: string): boolean {
    return /\w/.test(char);
}

export function isWhitespace(char: string): boolean {
    return /\s/.test(char);
}

// WORD motion functions (whitespace-separated)
export function findWORDStart(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    if (forward) {
        // Skip current WORD (non-whitespace)
        while (pos < text.length && !isWhitespace(text[pos])) pos++;
        // Skip whitespace
        while (pos < text.length && isWhitespace(text[pos])) pos++;

        // In normal mode, cursor can't go past the last character
        if (pos >= text.length && text.length > 0) {
            pos = text.length - 1;
        }

        return pos;
    } else {
        // Move back one if we're at WORD start
        if (pos > 0) pos--;
        // Skip whitespace
        while (pos > 0 && isWhitespace(text[pos])) pos--;
        // Go to WORD start
        while (pos > 0 && !isWhitespace(text[pos - 1])) pos--;
        return pos;
    }
}

export function findWORDEnd(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    if (forward) {
        // Move to next char if at WORD boundary
        if (pos < text.length) pos++;
        // Skip whitespace
        while (pos < text.length && isWhitespace(text[pos])) pos++;
        // Go to WORD end
        while (pos < text.length && !isWhitespace(text[pos])) pos++;
        return Math.max(0, pos - 1);
    } else {
        // Skip current WORD end
        while (pos > 0 && !isWhitespace(text[pos])) pos--;
        // Skip whitespace
        while (pos > 0 && isWhitespace(text[pos])) pos--;
        return pos;
    }
}

export function findWordStart(
    currentInput: EditableElement,
    pos: number,
    forward = true,
): number {
    const text = currentInput.value;
    if (forward) {
        const startChar = text[pos];

        // Determine what type of word we're in
        if (isWordChar(startChar)) {
            // Skip word characters
            while (pos < text.length && isWordChar(text[pos])) pos++;
        } else if (!isWhitespace(startChar) && startChar !== "\n") {
            // Skip non-word, non-whitespace characters (punctuation)
            while (
                pos < text.length &&
                !isWordChar(text[pos]) &&
                !isWhitespace(text[pos]) &&
                text[pos] !== "\n"
            )
                pos++;
        }

        // Skip whitespace (not including newlines)
        while (
            pos < text.length &&
            isWhitespace(text[pos]) &&
            text[pos] !== "\n"
        )
            pos++;

        // If we hit a newline, move to the next line
        if (pos < text.length && text[pos] === "\n") {
            pos++;
            // If next line is empty (another newline), stop here (on the empty line)
            // Otherwise, skip leading whitespace
            if (pos < text.length && text[pos] !== "\n") {
                while (
                    pos < text.length &&
                    isWhitespace(text[pos]) &&
                    text[pos] !== "\n"
                )
                    pos++;
            }
        }

        // In normal mode, cursor can't go past the last character
        // If we've moved past the end, stay at the last valid position
        if (pos >= text.length && text.length > 0) {
            pos = text.length - 1;
        }

        return pos;
    } else {
        // Move back one if we're at word start
        if (pos > 0) pos--;
        // Skip whitespace
        while (pos > 0 && isWhitespace(text[pos]) && text[pos] !== "\n") pos--;

        // Determine what type of word we're in and go to its start
        if (isWordChar(text[pos])) {
            while (pos > 0 && isWordChar(text[pos - 1])) pos--;
        } else if (!isWhitespace(text[pos]) && text[pos] !== "\n") {
            // Non-word, non-whitespace characters (punctuation)
            while (
                pos > 0 &&
                !isWordChar(text[pos - 1]) &&
                !isWhitespace(text[pos - 1]) &&
                text[pos - 1] !== "\n"
            )
                pos--;
        }
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
        "<": { open: "<", close: ">" },
        ">": { open: "<", close: ">" },
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
    clearVisualRowsCache(); // Text changed, clear cache
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
    clearVisualRowsCache(); // Text changed, clear cache
}
