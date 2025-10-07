import { TaskManager } from "./task-manager.js";
import type { EditableElement, LineNumbersRenderer } from "./types.js";
import { TAMPER_VIM_MODE, debug } from "./setup.js";

/**
 * Chunk represents a segment of line numbers
 * Position is relative - we don't recompute chunks when preceding chunks change
 */
interface LineNumberChunk {
    startLine: number;
    endLine: number;
    element: HTMLDivElement;
    isDirty: boolean;
}

const CHUNK_SIZE = 30; // Lines per chunk

/**
 * Calculate visual rows for text wrapping
 * Returns array of visual row info for each logical line
 */
function calculateVisualRows(
    input: EditableElement,
): { logicalLine: number; visualRow: number; totalVisualRows: number }[] {
    if (input.tagName !== "TEXTAREA") {
        // Single-line inputs don't wrap
        const lines = input.value.split("\n");
        return lines.map((_, i) => ({
            logicalLine: i + 1,
            visualRow: 1,
            totalVisualRows: 1,
        }));
    }

    const text = input.value;
    const lines = text.split("\n");
    const result: {
        logicalLine: number;
        visualRow: number;
        totalVisualRows: number;
    }[] = [];

    // Create a mirror element to measure wrapping
    const mirror = document.createElement("div");
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflowWrap = "break-word";

    const computedStyle = window.getComputedStyle(input);

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

    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    const effectiveLineHeight = isNaN(lineHeight) ? fontSize * 1.2 : lineHeight;

    lines.forEach((line, index) => {
        mirror.textContent = line || " ";
        const mirrorHeight = mirror.offsetHeight;
        const visualRows = Math.max(
            1,
            Math.round(mirrorHeight / effectiveLineHeight),
        );

        for (let vRow = 1; vRow <= visualRows; vRow++) {
            result.push({
                logicalLine: index + 1,
                visualRow: vRow,
                totalVisualRows: visualRows,
            });
        }
    });

    mirror.remove();
    return result;
}

/**
 * ChunkedLineNumbersRenderer - Incremental line number rendering
 *
 * Key features:
 * - Divides line numbers into chunks of 30 lines
 * - Each chunk is independently positioned (relative positioning)
 * - Only updates affected chunks on text changes
 * - Uses TaskManager to maintain 60fps
 */
export class ChunkedLineNumbersRenderer implements LineNumbersRenderer {
    private container: HTMLDivElement;
    private chunks: LineNumberChunk[] = [];
    private currentInput: EditableElement | null = null;
    private taskManager: TaskManager;
    private visualRowsCache: {
        text: string;
        clientWidth: number;
        rows: {
            logicalLine: number;
            visualRow: number;
            totalVisualRows: number;
        }[];
    } | null = null;
    private lastTotalLines = 0;
    private lastCurrentLine = 0;

    constructor() {
        this.container = document.createElement("div");
        this.container.setAttribute("data-vim-line-numbers", "true");
        this.container.style.position = "absolute";
        this.container.style.pointerEvents = "none";
        this.container.style.zIndex = "9997";
        this.container.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        this.container.style.color = "rgba(255, 255, 255, 0.6)";
        this.container.style.fontFamily = "monospace";
        this.container.style.textAlign = "right";
        this.container.style.whiteSpace = "pre";
        this.container.style.padding = "0 8px 0 4px";
        this.container.style.borderRadius = "2px";
        this.container.style.boxSizing = "border-box";
        document.body.appendChild(this.container);

        this.taskManager = new TaskManager();
    }

    render(
        input: EditableElement,
        currentLine: number,
        totalLines: number,
    ): void {
        if (!TAMPER_VIM_MODE.showLineNumbers) {
            this.hide();
            return;
        }

        const text = input.value;
        const clientWidth = input.clientWidth;

        // Calculate visual rows with caching
        if (
            !this.visualRowsCache ||
            this.visualRowsCache.text !== text ||
            this.visualRowsCache.clientWidth !== clientWidth
        ) {
            this.visualRowsCache = {
                text,
                clientWidth,
                rows: calculateVisualRows(input),
            };
        }

        const visualRowsInfo = this.visualRowsCache.rows;
        const hasWrappedLines = visualRowsInfo.some(
            (row) => row.totalVisualRows > 1,
        );

        // Don't show line numbers for textareas with 5 or fewer lines unless wrapped
        if (totalLines <= 5 && !hasWrappedLines) {
            this.hide();
            return;
        }

        debug("ChunkedLineNumbersRenderer.render", {
            currentLine,
            totalLines,
        });

        this.currentInput = input;

        // Position container
        this.updateContainerPosition(input);

        // Determine which chunks need updates
        const chunksNeeded = Math.ceil(totalLines / CHUNK_SIZE);
        this.ensureChunks(chunksNeeded);

        // Mark chunks as dirty based on what changed
        this.markDirtyChunks(
            currentLine,
            totalLines,
            TAMPER_VIM_MODE.relativeLineNumbers,
        );

        // Schedule chunk updates via task manager
        this.scheduleChunkUpdates(
            input,
            currentLine,
            totalLines,
            visualRowsInfo,
        );

        // Apply scroll transform to container for textareas
        if (input.tagName === "TEXTAREA") {
            this.container.style.transform = `translateY(-${input.scrollTop}px)`;
        }
    }

    hide(): void {
        this.container.style.display = "none";
        this.currentInput = null;
        this.taskManager.clear();
    }

    destroy(): void {
        this.container.remove();
        this.currentInput = null;
        this.taskManager.clear();
    }

    private updateContainerPosition(input: EditableElement): void {
        const rect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const borderTop = parseFloat(computedStyle.borderTopWidth);
        const borderBottom = parseFloat(computedStyle.borderBottomWidth);

        const fontSize = computedStyle.fontSize;
        const fontFamily = computedStyle.fontFamily;
        const lineHeightStr = computedStyle.lineHeight;

        this.container.style.fontSize = fontSize;
        this.container.style.fontFamily = fontFamily;
        this.container.style.lineHeight = lineHeightStr;
        this.container.style.display = "block";
        this.container.style.top = `${rect.top + window.scrollY + paddingTop + borderTop}px`;
        this.container.style.right = `${window.innerWidth - (rect.left + window.scrollX) + 2}px`;
        this.container.style.left = "auto";
        this.container.style.height = `${rect.height - paddingTop - paddingBottom - borderTop - borderBottom}px`;
        this.container.style.width = "auto";
        this.container.style.minWidth = "40px";

        if (input.tagName === "TEXTAREA") {
            this.container.style.overflow = "hidden";
        }
    }

    private ensureChunks(chunksNeeded: number): void {
        // Remove excess chunks
        while (this.chunks.length > chunksNeeded) {
            const chunk = this.chunks.pop()!;
            chunk.element.remove();
        }

        // Add missing chunks
        while (this.chunks.length < chunksNeeded) {
            const chunkIndex = this.chunks.length;
            const startLine = chunkIndex * CHUNK_SIZE + 1;
            const endLine = Math.min(startLine + CHUNK_SIZE - 1, 999999); // Will be clamped later

            const element = document.createElement("div");
            element.style.position = "relative";
            this.container.appendChild(element);

            this.chunks.push({
                startLine,
                endLine,
                element,
                isDirty: true,
            });
        }

        // Update chunk boundaries
        for (let i = 0; i < this.chunks.length; i++) {
            this.chunks[i].startLine = i * CHUNK_SIZE + 1;
            this.chunks[i].endLine = Math.min(
                (i + 1) * CHUNK_SIZE,
                999999, // Will be clamped in rendering
            );
        }
    }

    private markDirtyChunks(
        currentLine: number,
        totalLines: number,
        useRelativeLineNumbers: boolean,
    ): void {
        const totalLinesChanged = totalLines !== this.lastTotalLines;
        const currentLineChanged = currentLine !== this.lastCurrentLine;
        const isFirstRender = this.lastTotalLines === 0;

        // On first render, mark all chunks dirty
        if (isFirstRender) {
            for (const chunk of this.chunks) {
                chunk.isDirty = true;
            }
            this.lastTotalLines = totalLines;
            this.lastCurrentLine = currentLine;
            return;
        }

        // If total lines changed, only chunks at/after the change need updating
        if (totalLinesChanged) {
            const minAffectedLine = Math.min(totalLines, this.lastTotalLines);
            const minAffectedChunkIndex = Math.floor(
                (minAffectedLine - 1) / CHUNK_SIZE,
            );

            // Mark chunks from the change point onward
            for (let i = minAffectedChunkIndex; i < this.chunks.length; i++) {
                this.chunks[i].isDirty = true;
            }
        }

        // If using relative line numbers and current line changed, mark affected chunks
        if (useRelativeLineNumbers && currentLineChanged) {
            // With relative line numbers, ALL chunks need updating when current line changes
            // because relative numbers change for all lines
            for (const chunk of this.chunks) {
                chunk.isDirty = true;
            }
        } else if (currentLineChanged) {
            // Absolute line numbers: only mark chunks containing old/new current line
            // for highlighting updates
            const oldChunkIndex = Math.floor(
                (this.lastCurrentLine - 1) / CHUNK_SIZE,
            );
            const newChunkIndex = Math.floor((currentLine - 1) / CHUNK_SIZE);

            if (oldChunkIndex >= 0 && oldChunkIndex < this.chunks.length) {
                this.chunks[oldChunkIndex].isDirty = true;
            }
            if (newChunkIndex >= 0 && newChunkIndex < this.chunks.length) {
                this.chunks[newChunkIndex].isDirty = true;
            }
        }

        // If nothing changed, still mark the current chunk dirty for highlighting
        if (!totalLinesChanged && !currentLineChanged) {
            const currentChunkIndex = Math.floor(
                (currentLine - 1) / CHUNK_SIZE,
            );
            if (
                currentChunkIndex >= 0 &&
                currentChunkIndex < this.chunks.length
            ) {
                this.chunks[currentChunkIndex].isDirty = true;
            }
        }

        this.lastTotalLines = totalLines;
        this.lastCurrentLine = currentLine;
    }

    private scheduleChunkUpdates(
        input: EditableElement,
        currentLine: number,
        totalLines: number,
        visualRowsInfo: {
            logicalLine: number;
            visualRow: number;
            totalVisualRows: number;
        }[],
    ): void {
        // Clear any pending tasks from previous render
        this.taskManager.clear();

        // Find chunk containing current line (highest priority)
        const currentChunkIndex = Math.floor((currentLine - 1) / CHUNK_SIZE);

        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            if (!chunk.isDirty) continue;

            // Priority: higher for chunks near current line
            const distanceFromCurrent = Math.abs(i - currentChunkIndex);
            const priority = 1000 - distanceFromCurrent;

            this.taskManager.scheduleTask({
                priority,
                execute: () => {
                    this.renderChunk(
                        chunk,
                        input,
                        currentLine,
                        totalLines,
                        visualRowsInfo,
                    );
                    chunk.isDirty = false;
                },
            });
        }
    }

    private renderChunk(
        chunk: LineNumberChunk,
        input: EditableElement,
        currentLine: number,
        totalLines: number,
        visualRowsInfo: {
            logicalLine: number;
            visualRow: number;
            totalVisualRows: number;
        }[],
    ): void {
        const clampedEndLine = Math.min(chunk.endLine, totalLines);
        const lines: string[] = [];
        const useRelative = TAMPER_VIM_MODE.relativeLineNumbers;

        // Find current visual row for highlighting
        const currentVisualRow = visualRowsInfo.findIndex(
            (r) => r.logicalLine === currentLine && r.visualRow === 1,
        );

        const useSimpleMode = visualRowsInfo.length === 0;

        if (useSimpleMode) {
            // Simple line-based rendering
            for (let i = chunk.startLine; i <= clampedEndLine; i++) {
                let lineNum: string;
                if (useRelative) {
                    lineNum =
                        i === currentLine
                            ? String(i)
                            : String(Math.abs(i - currentLine));
                } else {
                    lineNum = String(i);
                }

                if (i === currentLine) {
                    lines.push(
                        `<span style="color: rgba(255, 255, 255, 1); font-weight: bold; background-color: rgba(255, 255, 255, 0.2); display: inline-block; width: 100%; padding: 0 2px;">${lineNum.padStart(3, " ")}</span>`,
                    );
                } else {
                    lines.push(lineNum.padStart(3, " "));
                }
            }
        } else {
            // Visual row-based rendering (handles wrapping)
            // Find start index in visualRowsInfo for this chunk
            let startIdx = 0;
            while (
                startIdx < visualRowsInfo.length &&
                visualRowsInfo[startIdx].logicalLine < chunk.startLine
            ) {
                startIdx++;
            }

            // Render visual rows for this chunk
            let idx = startIdx;
            while (
                idx < visualRowsInfo.length &&
                visualRowsInfo[idx].logicalLine <= clampedEndLine
            ) {
                const rowInfo = visualRowsInfo[idx];
                let lineNum: string;

                if (rowInfo.visualRow === 1) {
                    const logicalLine = rowInfo.logicalLine;
                    if (useRelative) {
                        lineNum =
                            logicalLine === currentLine
                                ? String(logicalLine)
                                : String(Math.abs(logicalLine - currentLine));
                    } else {
                        lineNum = String(logicalLine);
                    }
                } else {
                    lineNum = "";
                }

                if (idx === currentVisualRow) {
                    lines.push(
                        `<span style="color: rgba(255, 255, 255, 1); font-weight: bold; background-color: rgba(255, 255, 255, 0.2); display: inline-block; width: 100%; padding: 0 2px;">${lineNum.padStart(3, " ")}</span>`,
                    );
                } else {
                    lines.push(lineNum.padStart(3, " "));
                }

                idx++;
            }
        }

        // Update chunk element innerHTML directly (transform is applied to chunk element itself)
        chunk.element.innerHTML = lines.join("\n");
    }
}
