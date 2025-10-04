// ==UserScript==
// @name         Vim Mode for Text Inputs
// @namespace    http://tampermonkey.net/
// @version      1.0.61
// @description  Vim-like editing for textareas and inputs
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/refs/heads/main/dist/tampermonkey_vim_mode.js
// @downloadURL  https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/refs/heads/main/dist/tampermonkey_vim_mode.js
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    (() => {
        // src/setup.ts
        var version = (() => {
            if (
                typeof GM_info !== "undefined" &&
                GM_info.script &&
                GM_info.script.version
            ) {
                return GM_info.script.version;
            }
            if (typeof document !== "undefined" && document.scripts) {
                for (const script of Array.from(document.scripts)) {
                    const content = script.textContent;
                    if (
                        content &&
                        content.includes("Vim Mode for Text Inputs")
                    ) {
                        const match = content.match(/@version\s+([\d.]+)/);
                        if (match) return match[1];
                    }
                }
            }
            return "unknown";
        })();
        var DEBUG =
            typeof window !== "undefined" && window.location
                ? new URLSearchParams(window.location.search).get(
                      "VIM_DEBUG",
                  ) === "1"
                : false;
        var debug = (...args) => {
            if (DEBUG) console.log("@@", ...args);
        };
        var TAMPER_VIM_MODE =
            typeof window !== "undefined"
                ? (() => {
                      const storageKey = `tamper_vim_mode_${window.location.hostname}`;
                      const loadConfig = () => {
                          try {
                              const stored = localStorage.getItem(storageKey);
                              if (stored) {
                                  return JSON.parse(stored);
                              }
                          } catch (e) {
                              debug(
                                  "Failed to load config from localStorage",
                                  e,
                              );
                          }
                          return {
                              disableCustomCaret: false,
                              showLineNumbers: true,
                              relativeLineNumbers: false,
                          };
                      };
                      const config = loadConfig();
                      const handler = {
                          set(target, prop, value) {
                              target[prop] = value;
                              try {
                                  localStorage.setItem(
                                      storageKey,
                                      JSON.stringify(target),
                                  );
                              } catch (e) {
                                  debug(
                                      "Failed to save config to localStorage",
                                      e,
                                  );
                              }
                              return true;
                          },
                      };
                      const proxiedConfig = new Proxy(config, handler);
                      window.TAMPER_VIM_MODE = proxiedConfig;
                      return proxiedConfig;
                  })()
                : {
                      disableCustomCaret: false,
                      showLineNumbers: true,
                      relativeLineNumbers: false,
                  };
        var indicator;
        var modeText;
        if (typeof document !== "undefined") {
            indicator = document.createElement("div");
            indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        padding: 8px 16px;
        padding-bottom: 16px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        border-radius: 4px;
        z-index: 999999;
        pointer-events: none;
    `;
            modeText = document.createElement("div");
            indicator.appendChild(modeText);
            const versionLabel = document.createElement("div");
            versionLabel.textContent = `v${version}`;
            versionLabel.style.cssText = `
        position: absolute;
        bottom: 2px;
        left: 4px;
        font-size: 8px;
        font-weight: normal;
        opacity: 0.6;
    `;
            indicator.appendChild(versionLabel);
            if (document.body) {
                document.body.appendChild(indicator);
            } else {
                document.addEventListener("DOMContentLoaded", () => {
                    if (indicator) document.body.appendChild(indicator);
                });
            }
        }
        function updateIndicator(mode, currentInput) {
            if (!indicator || !modeText) return;
            let text, color;
            switch (mode) {
                case "insert":
                    text = "-- INSERT --";
                    color = "rgba(0, 100, 0, 0.85)";
                    break;
                case "visual":
                    text = "-- VISUAL --";
                    color = "rgba(100, 100, 0, 0.85)";
                    break;
                case "visual-line":
                    text = "-- VISUAL LINE --";
                    color = "rgba(100, 100, 0, 0.85)";
                    break;
                default:
                    text = "-- NORMAL --";
                    color = "rgba(0, 0, 0, 0.85)";
            }
            modeText.textContent = text;
            indicator.style.background = color;
            indicator.style.display = currentInput ? "block" : "none";
        }

        // src/common.ts
        var customCaret = null;
        var currentRenderer = null;
        var visualSelectionRenderer = null;
        var lineNumbersRenderer = null;

        class DOMTextMetrics {
            canvas;
            ctx;
            input;
            computedStyle;
            constructor(input) {
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
            measureText(text) {
                if (!this.ctx) return 0;
                return this.ctx.measureText(text).width;
            }
            getCharWidth(char) {
                if (!this.ctx) return 0;
                return this.ctx.measureText(char).width;
            }
            getFontSize() {
                return parseFloat(this.computedStyle.fontSize);
            }
            getLineHeight() {
                const lineHeight = this.computedStyle.lineHeight;
                return lineHeight === "normal"
                    ? this.getFontSize() * 1.2
                    : parseFloat(lineHeight);
            }
        }

        class DOMCaretRenderer {
            element;
            constructor() {
                this.element = document.createElement("div");
                this.element.style.position = "absolute";
                this.element.style.pointerEvents = "none";
                this.element.style.zIndex = "9999";
                this.element.style.backgroundColor = "white";
                this.element.style.mixBlendMode = "difference";
                document.body.appendChild(this.element);
            }
            show(position) {
                this.element.style.left = `${position.x}px`;
                this.element.style.top = `${position.y}px`;
                this.element.style.width = `${position.width}px`;
                this.element.style.height = `${position.height}px`;
                this.element.style.display = "block";
            }
            hide() {
                this.element.style.display = "none";
            }
            isActive() {
                return this.element.parentElement !== null;
            }
            destroy() {
                this.element.remove();
            }
        }

        class DOMVisualSelectionRenderer {
            container;
            rects = [];
            constructor() {
                this.container = document.createElement("div");
                this.container.style.position = "absolute";
                this.container.style.top = "0";
                this.container.style.left = "0";
                this.container.style.width = "0";
                this.container.style.height = "0";
                this.container.style.pointerEvents = "none";
                this.container.style.zIndex = "9998";
                document.body.appendChild(this.container);
            }
            render(rects) {
                this.clear();
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
            clear() {
                for (const rect of this.rects) {
                    rect.remove();
                }
                this.rects = [];
            }
            destroy() {
                this.clear();
                this.container.remove();
            }
        }
        function calculateVisualRows(input) {
            if (input.tagName !== "TEXTAREA") {
                const lines2 = input.value.split(`
`);
                return lines2.map((_, i) => ({
                    logicalLine: i + 1,
                    visualRow: 1,
                    totalVisualRows: 1,
                }));
            }
            const text = input.value;
            const lines = text.split(`
`);
            const result = [];
            const mirror = document.createElement("div");
            mirror.style.position = "absolute";
            mirror.style.visibility = "hidden";
            mirror.style.whiteSpace = "pre-wrap";
            mirror.style.wordWrap = "break-word";
            mirror.style.overflowWrap = "break-word";
            const computedStyle = window.getComputedStyle(input);
            const clientWidth = input.clientWidth;
            const paddingLeft = parseFloat(computedStyle.paddingLeft);
            const paddingRight = parseFloat(computedStyle.paddingRight);
            const contentWidth = clientWidth - paddingLeft - paddingRight;
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
                        : computedStyle[
                              prop.replace(/-([a-z])/g, (g) =>
                                  g[1].toUpperCase(),
                              )
                          ];
                mirror.style.setProperty(prop, value);
            });
            document.body.appendChild(mirror);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const fontSize = parseFloat(computedStyle.fontSize);
            const effectiveLineHeight = isNaN(lineHeight)
                ? fontSize * 1.2
                : lineHeight;
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
        function getCurrentVisualRow(input, visualRowsInfo) {
            const pos = getCursorPos(input);
            const textBefore = input.value.substring(0, pos);
            const currentLogicalLine =
                (textBefore.match(/\n/g) || []).length + 1;
            if (input.tagName !== "TEXTAREA") {
                return visualRowsInfo.findIndex(
                    (r) => r.logicalLine === currentLogicalLine,
                );
            }
            try {
                input.focus();
                input.setSelectionRange(pos, pos);
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    throw new Error("No selection available");
                }
                const range = selection.getRangeAt(0);
                if (typeof range.getBoundingClientRect !== "function") {
                    throw new Error("getBoundingClientRect not available");
                }
                const caretRect = range.getBoundingClientRect();
                const inputRect = input.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(input);
                const paddingTop = parseFloat(computedStyle.paddingTop);
                const borderTop = parseFloat(computedStyle.borderTopWidth);
                const lineHeight = parseFloat(computedStyle.lineHeight);
                const fontSize = parseFloat(computedStyle.fontSize);
                const effectiveLineHeight = isNaN(lineHeight)
                    ? fontSize * 1.2
                    : lineHeight;
                const relativeY =
                    caretRect.top -
                    inputRect.top -
                    paddingTop -
                    borderTop +
                    input.scrollTop;
                const visualRow = Math.max(
                    0,
                    Math.floor(relativeY / effectiveLineHeight),
                );
                return Math.min(visualRow, visualRowsInfo.length - 1);
            } catch {
                const firstRowIndex = visualRowsInfo.findIndex(
                    (r) =>
                        r.logicalLine === currentLogicalLine &&
                        r.visualRow === 1,
                );
                return firstRowIndex !== -1 ? firstRowIndex : 0;
            }
        }

        class DOMLineNumbersRenderer {
            container;
            currentInput = null;
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
            }
            render(input, currentLine, totalLines) {
                if (!TAMPER_VIM_MODE.showLineNumbers) {
                    this.hide();
                    return;
                }
                this.currentInput = input;
                const rect = input.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(input);
                const paddingTop = parseFloat(computedStyle.paddingTop);
                const paddingBottom = parseFloat(computedStyle.paddingBottom);
                const borderTop = parseFloat(computedStyle.borderTopWidth);
                const borderBottom = parseFloat(
                    computedStyle.borderBottomWidth,
                );
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
                const visualRowsInfo = calculateVisualRows(input);
                const currentVisualRow = getCurrentVisualRow(
                    input,
                    visualRowsInfo,
                );
                const lines = [];
                const useRelative = TAMPER_VIM_MODE.relativeLineNumbers;
                if (visualRowsInfo.length === 0) {
                    for (let i = 1; i <= totalLines; i++) {
                        let lineNum;
                        if (useRelative) {
                            if (i === currentLine) {
                                lineNum = String(i);
                            } else {
                                lineNum = String(Math.abs(i - currentLine));
                            }
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
                    visualRowsInfo.forEach((rowInfo, idx) => {
                        let lineNum;
                        if (rowInfo.visualRow === 1) {
                            const logicalLine = rowInfo.logicalLine;
                            if (useRelative) {
                                if (logicalLine === currentLine) {
                                    lineNum = String(logicalLine);
                                } else {
                                    lineNum = String(
                                        Math.abs(logicalLine - currentLine),
                                    );
                                }
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
                    });
                }
                this.container.innerHTML = lines.join(`
`);
                if (input.tagName === "TEXTAREA") {
                    this.container.style.overflow = "hidden";
                    const firstChild = this.container.firstChild;
                    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                        const wrapper = document.createElement("div");
                        wrapper.innerHTML = this.container.innerHTML;
                        wrapper.style.transform = `translateY(-${input.scrollTop}px)`;
                        this.container.innerHTML = "";
                        this.container.appendChild(wrapper);
                    } else if (
                        firstChild &&
                        firstChild.nodeType === Node.ELEMENT_NODE
                    ) {
                        firstChild.style.transform = `translateY(-${input.scrollTop}px)`;
                    }
                }
            }
            hide() {
                this.container.style.display = "none";
                this.currentInput = null;
            }
            destroy() {
                this.container.remove();
                this.currentInput = null;
            }
        }
        function calculateCaretPosition(input, metrics) {
            const pos = getCursorPos(input);
            const text = input.value;
            const char = text[pos] || " ";
            const computedStyle = window.getComputedStyle(input);
            const rect = input.getBoundingClientRect();
            const charWidth = metrics.getCharWidth(char);
            const lineHeight = metrics.getLineHeight();
            const paddingLeft = parseFloat(computedStyle.paddingLeft);
            const paddingTop = parseFloat(computedStyle.paddingTop);
            let x;
            let y;
            if (input.tagName === "TEXTAREA") {
                const mirror = document.createElement("div");
                mirror.style.position = "absolute";
                mirror.style.visibility = "hidden";
                mirror.style.whiteSpace = "pre-wrap";
                mirror.style.wordWrap = "break-word";
                mirror.style.width = `${rect.width}px`;
                const stylesToCopy = [
                    "font-family",
                    "font-size",
                    "font-weight",
                    "font-style",
                    "letter-spacing",
                    "text-transform",
                    "word-spacing",
                    "text-indent",
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
                const cursorSpan = document.createElement("span");
                cursorSpan.textContent = text[pos] || " ";
                mirror.appendChild(cursorSpan);
                const spanRect = cursorSpan.getBoundingClientRect();
                const mirrorRect = mirror.getBoundingClientRect();
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
                mirror.remove();
            } else {
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
        function createCustomCaret(input, renderer) {
            if (
                currentRenderer &&
                currentRenderer instanceof DOMCaretRenderer
            ) {
                currentRenderer.destroy();
            }
            if (customCaret) {
                customCaret.remove();
                customCaret = null;
            }
            if (TAMPER_VIM_MODE.disableCustomCaret) {
                debug(
                    "createCustomCaret: disabled via config, keeping native caret",
                );
                return;
            }
            if (!renderer) {
                const testCanvas = document.createElement("canvas");
                const testCtx = testCanvas.getContext("2d");
                if (!testCtx) {
                    debug(
                        "createCustomCaret: canvas not available, keeping native caret",
                    );
                    return;
                }
            }
            input.style.caretColor = "transparent";
            if (renderer) {
                currentRenderer = renderer;
            } else {
                const domRenderer = new DOMCaretRenderer();
                currentRenderer = domRenderer;
                customCaret = domRenderer["element"];
            }
            updateCustomCaret(input);
        }
        function updateCustomCaret(input, metrics) {
            if (!currentRenderer) return;
            const textMetrics = metrics || new DOMTextMetrics(input);
            const position = calculateCaretPosition(input, textMetrics);
            currentRenderer.show(position);
        }
        function removeCustomCaret(input) {
            if (currentRenderer) {
                if (currentRenderer instanceof DOMCaretRenderer) {
                    currentRenderer.destroy();
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
        function calculateSelectionRects(input, start, end, metrics) {
            const text = input.value;
            const rects = [];
            const selStart = Math.min(start, end);
            const selEnd = Math.max(start, end);
            const computedStyle = window.getComputedStyle(input);
            const rect = input.getBoundingClientRect();
            const lineHeight = metrics.getLineHeight();
            const paddingLeft = parseFloat(computedStyle.paddingLeft);
            const paddingTop = parseFloat(computedStyle.paddingTop);
            if (input.tagName === "TEXTAREA") {
                const mirror = document.createElement("div");
                mirror.style.position = "absolute";
                mirror.style.visibility = "hidden";
                mirror.style.whiteSpace = "pre-wrap";
                mirror.style.wordWrap = "break-word";
                mirror.style.width = `${rect.width}px`;
                const stylesToCopy = [
                    "font-family",
                    "font-size",
                    "font-weight",
                    "font-style",
                    "letter-spacing",
                    "text-transform",
                    "word-spacing",
                    "text-indent",
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
                const selectedText = text.substring(selStart, selEnd);
                const textBeforeSelection = text.substring(0, selStart);
                let lineStartInSelection = 0;
                while (lineStartInSelection < selectedText.length) {
                    const lineEndInSelection = selectedText.indexOf(
                        `
`,
                        lineStartInSelection,
                    );
                    const isLastLine = lineEndInSelection === -1;
                    const lineText = isLastLine
                        ? selectedText.substring(lineStartInSelection)
                        : selectedText.substring(
                              lineStartInSelection,
                              lineEndInSelection,
                          );
                    mirror.textContent =
                        textBeforeSelection +
                        selectedText.substring(0, lineStartInSelection);
                    const lineStartSpan = document.createElement("span");
                    lineStartSpan.textContent = lineText || " ";
                    mirror.appendChild(lineStartSpan);
                    const lineStartRect = lineStartSpan.getBoundingClientRect();
                    const mirrorRect = mirror.getBoundingClientRect();
                    const x =
                        rect.left +
                        window.scrollX +
                        (lineStartRect.left - mirrorRect.left) -
                        input.scrollLeft;
                    const y =
                        rect.top +
                        window.scrollY +
                        (lineStartRect.top - mirrorRect.top) -
                        input.scrollTop;
                    const width = lineStartRect.width;
                    const height = lineStartRect.height;
                    rects.push({ x, y, width, height });
                    if (isLastLine) break;
                    lineStartInSelection = lineEndInSelection + 1;
                }
                mirror.remove();
            } else {
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
        function createVisualSelection() {
            if (visualSelectionRenderer) {
                visualSelectionRenderer.destroy();
            }
            visualSelectionRenderer = new DOMVisualSelectionRenderer();
        }
        function updateVisualSelection(input, start, end, metrics) {
            if (!visualSelectionRenderer) {
                createVisualSelection();
            }
            const textMetrics = metrics || new DOMTextMetrics(input);
            const rects = calculateSelectionRects(
                input,
                start,
                end,
                textMetrics,
            );
            visualSelectionRenderer?.render(rects);
        }
        function clearVisualSelection() {
            visualSelectionRenderer?.clear();
        }
        function createLineNumbers() {
            if (lineNumbersRenderer) {
                lineNumbersRenderer.destroy();
            }
            lineNumbersRenderer = new DOMLineNumbersRenderer();
        }
        function updateLineNumbers(input) {
            if (!TAMPER_VIM_MODE.showLineNumbers) {
                lineNumbersRenderer?.hide();
                return;
            }
            if (!lineNumbersRenderer) {
                createLineNumbers();
            }
            const text = input.value;
            const pos = getCursorPos(input);
            const textBeforeCursor = text.substring(0, pos);
            const currentLine =
                (textBeforeCursor.match(/\n/g) || []).length + 1;
            const totalLines = (text.match(/\n/g) || []).length + 1;
            lineNumbersRenderer?.render(input, currentLine, totalLines);
        }
        function removeLineNumbers() {
            if (lineNumbersRenderer) {
                lineNumbersRenderer.destroy();
                lineNumbersRenderer = null;
            }
        }
        function getCursorPos(currentInput) {
            return currentInput.selectionStart ?? 0;
        }
        function setCursorPos(currentInput, pos) {
            pos = Math.max(0, Math.min(pos, currentInput.value.length));
            debug("setCursorPos", {
                pos,
                valueLength: currentInput.value.length,
            });
            currentInput.selectionStart = pos;
            currentInput.selectionEnd = pos;
            updateCustomCaret(currentInput);
            updateLineNumbers(currentInput);
        }
        function getLine(currentInput, pos) {
            const text = currentInput.value;
            let start = pos;
            while (
                start > 0 &&
                text[start - 1] !==
                    `
`
            )
                start--;
            let end = pos;
            while (
                end < text.length &&
                text[end] !==
                    `
`
            )
                end++;
            return { start, end, text: text.substring(start, end) };
        }
        function getLineStart(currentInput, pos) {
            const text = currentInput.value;
            while (
                pos > 0 &&
                text[pos - 1] !==
                    `
`
            )
                pos--;
            return pos;
        }
        function getLineEnd(currentInput, pos) {
            const text = currentInput.value;
            while (
                pos < text.length &&
                text[pos] !==
                    `
`
            )
                pos++;
            return pos;
        }
        function getFirstNonBlank(currentInput, lineStart) {
            const text = currentInput.value;
            let pos = lineStart;
            while (
                pos < text.length &&
                text[pos] !==
                    `
` &&
                /\s/.test(text[pos])
            ) {
                pos++;
            }
            return pos;
        }
        function scrollTextarea(currentInput, lines, moveCaret = false) {
            const computedStyle = window.getComputedStyle(currentInput);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const fontSize = parseFloat(computedStyle.fontSize);
            const effectiveLineHeight = isNaN(lineHeight)
                ? fontSize * 1.2
                : lineHeight;
            const scrollAmount = lines * effectiveLineHeight;
            const oldScrollTop = currentInput.scrollTop;
            let caretLineBeforeScroll = 0;
            let currentPos = 0;
            if (moveCaret) {
                currentPos = getCursorPos(currentInput);
                const textBeforeCaret = currentInput.value.substring(
                    0,
                    currentPos,
                );
                const linesBeforeCaret = (textBeforeCaret.match(/\n/g) || [])
                    .length;
                caretLineBeforeScroll = linesBeforeCaret;
            }
            currentInput.scrollTop += scrollAmount;
            const actualScroll = currentInput.scrollTop - oldScrollTop;
            const remainingScroll = scrollAmount - actualScroll;
            if (Math.abs(remainingScroll) > 1) {
                window.scrollBy(0, remainingScroll);
            }
            if (moveCaret) {
                const totalScrollAmount = scrollAmount;
                const linesScrolled = Math.round(
                    totalScrollAmount / effectiveLineHeight,
                );
                const targetLine = caretLineBeforeScroll + linesScrolled;
                const textLines = currentInput.value.split(`
`);
                const clampedTargetLine = Math.max(
                    0,
                    Math.min(targetLine, textLines.length - 1),
                );
                const currentLine = getLine(currentInput, currentPos);
                const columnOffset = currentPos - currentLine.start;
                let newPos = 0;
                for (let i = 0; i < clampedTargetLine; i++) {
                    newPos += textLines[i].length + 1;
                }
                newPos += Math.min(
                    columnOffset,
                    textLines[clampedTargetLine].length,
                );
                setCursorPos(currentInput, newPos);
            }
        }
        function scrollHalfPage(currentInput, down, moveCaret = false) {
            const computedStyle = window.getComputedStyle(currentInput);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const fontSize = parseFloat(computedStyle.fontSize);
            const effectiveLineHeight = isNaN(lineHeight)
                ? fontSize * 1.2
                : lineHeight;
            const visibleHeight = currentInput.clientHeight;
            const halfPageLines = Math.floor(
                visibleHeight / effectiveLineHeight / 2,
            );
            scrollTextarea(
                currentInput,
                down ? halfPageLines : -halfPageLines,
                moveCaret,
            );
        }
        function isWordChar(char) {
            return /\w/.test(char);
        }
        function isWhitespace(char) {
            return /\s/.test(char);
        }
        function findWORDStart(currentInput, pos, forward = true) {
            const text = currentInput.value;
            if (forward) {
                while (pos < text.length && !isWhitespace(text[pos])) pos++;
                while (pos < text.length && isWhitespace(text[pos])) pos++;
                return pos;
            } else {
                if (pos > 0) pos--;
                while (pos > 0 && isWhitespace(text[pos])) pos--;
                while (pos > 0 && !isWhitespace(text[pos - 1])) pos--;
                return pos;
            }
        }
        function findWORDEnd(currentInput, pos, forward = true) {
            const text = currentInput.value;
            if (forward) {
                if (pos < text.length) pos++;
                while (pos < text.length && isWhitespace(text[pos])) pos++;
                while (pos < text.length && !isWhitespace(text[pos])) pos++;
                return Math.max(0, pos - 1);
            } else {
                while (pos > 0 && !isWhitespace(text[pos])) pos--;
                while (pos > 0 && isWhitespace(text[pos])) pos--;
                return pos;
            }
        }
        function findWordStart(currentInput, pos, forward = true) {
            const text = currentInput.value;
            if (forward) {
                while (pos < text.length && isWordChar(text[pos])) pos++;
                while (pos < text.length && !isWordChar(text[pos])) pos++;
                return pos;
            } else {
                if (pos > 0) pos--;
                while (
                    pos > 0 &&
                    !isWordChar(text[pos]) &&
                    text[pos] !==
                        `
`
                )
                    pos--;
                while (pos > 0 && isWordChar(text[pos - 1])) pos--;
                return pos;
            }
        }
        function findWordEnd(currentInput, pos, forward = true) {
            const text = currentInput.value;
            if (forward) {
                if (pos < text.length) pos++;
                while (
                    pos < text.length &&
                    !isWordChar(text[pos]) &&
                    text[pos] !==
                        `
`
                )
                    pos++;
                while (pos < text.length && isWordChar(text[pos])) pos++;
                return Math.max(0, pos - 1);
            } else {
                while (pos > 0 && isWordChar(text[pos])) pos--;
                while (
                    pos > 0 &&
                    !isWordChar(text[pos]) &&
                    text[pos] !==
                        `
`
                )
                    pos--;
                return pos;
            }
        }
        function findCharInLine(
            currentInput,
            pos,
            char,
            forward = true,
            till = false,
        ) {
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
        function findMatchingPair(currentInput, pos) {
            const text = currentInput.value;
            const char = text[pos];
            const pairs = {
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
            for (
                let i = pos + step;
                forward ? i < text.length : i >= 0;
                i += step
            ) {
                if (text[i] === char) depth++;
                else if (text[i] === target) {
                    depth--;
                    if (depth === 0) return i;
                }
            }
            return pos;
        }
        function findParagraphBoundary(currentInput, pos, forward = true) {
            const text = currentInput.value;
            const lines = text.split(`
`);
            const currentLine =
                text.substring(0, pos).split(`
`).length - 1;
            if (forward) {
                for (let i = currentLine + 1; i < lines.length; i++) {
                    if (lines[i].trim() === "") {
                        return (
                            text
                                .split(
                                    `
`,
                                )
                                .slice(0, i).join(`
`).length + 1
                        );
                    }
                }
                return text.length;
            } else {
                for (let i = currentLine - 1; i >= 0; i--) {
                    if (lines[i].trim() === "") {
                        return text
                            .split(
                                `
`,
                            )
                            .slice(0, i + 1).join(`
`).length;
                    }
                }
                return 0;
            }
        }
        function findTextObject(currentInput, type, inner) {
            const pos = getCursorPos(currentInput);
            const text = currentInput.value;
            debug("findTextObject", { type, inner, pos });
            const pairs = {
                "(": { open: "(", close: ")" },
                ")": { open: "(", close: ")" },
                "[": { open: "[", close: "]" },
                "]": { open: "[", close: "]" },
                "{": { open: "{", close: "}" },
                "}": { open: "{", close: "}" },
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
                let depth = 0;
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
            if (start === -1 || end === -1) {
                debug("findTextObject: no pair found");
                return { start: pos, end: pos };
            }
            const result = inner
                ? { start: start + 1, end }
                : { start, end: end + 1 };
            debug("findTextObject result", result);
            return result;
        }
        function saveState(currentInput, undoStack, redoStack) {
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
            redoStack.length = 0;
            if (undoStack.length > 100) undoStack.shift();
        }
        function undo(currentInput, undoStack, redoStack) {
            if (undoStack.length === 0) return;
            debug("undo", { undoStackSize: undoStack.length });
            const current = {
                value: currentInput.value,
                selectionStart: currentInput.selectionStart ?? 0,
                selectionEnd: currentInput.selectionEnd ?? 0,
            };
            redoStack.push(current);
            const prev = undoStack.pop();
            currentInput.value = prev.value;
            currentInput.selectionStart = prev.selectionStart;
            currentInput.selectionEnd = prev.selectionEnd;
        }
        function redo(currentInput, undoStack, redoStack) {
            if (redoStack.length === 0) return;
            debug("redo", { redoStackSize: redoStack.length });
            const current = {
                value: currentInput.value,
                selectionStart: currentInput.selectionStart ?? 0,
                selectionEnd: currentInput.selectionEnd ?? 0,
            };
            undoStack.push(current);
            const next = redoStack.pop();
            currentInput.value = next.value;
            currentInput.selectionStart = next.selectionStart;
            currentInput.selectionEnd = next.selectionEnd;
        }

        // src/normal.ts
        function executeMotion(currentInput, motion, count = 1) {
            let pos = getCursorPos(currentInput);
            debug("executeMotion", { motion, count, startPos: pos });
            for (let i = 0; i < count; i++) {
                switch (motion) {
                    case "h":
                        pos = Math.max(0, pos - 1);
                        break;
                    case "l":
                        pos = Math.min(currentInput.value.length, pos + 1);
                        break;
                    case "j":
                        const currentLineJ = getLine(currentInput, pos);
                        const offsetJ = pos - currentLineJ.start;
                        const nextLineStartJ = currentLineJ.end + 1;
                        if (nextLineStartJ < currentInput.value.length) {
                            const nextLineJ = getLine(
                                currentInput,
                                nextLineStartJ,
                            );
                            pos = Math.min(
                                nextLineJ.start + offsetJ,
                                nextLineJ.end,
                            );
                        }
                        break;
                    case "k":
                        const currentLineK = getLine(currentInput, pos);
                        const offsetK = pos - currentLineK.start;
                        if (currentLineK.start > 0) {
                            const prevLineK = getLine(
                                currentInput,
                                currentLineK.start - 1,
                            );
                            pos = Math.min(
                                prevLineK.start + offsetK,
                                prevLineK.end,
                            );
                        }
                        break;
                    case "w":
                        pos = findWordStart(currentInput, pos, true);
                        break;
                    case "W":
                        pos = findWORDStart(currentInput, pos, true);
                        break;
                    case "b":
                        pos = findWordStart(currentInput, pos, false);
                        break;
                    case "B":
                        pos = findWORDStart(currentInput, pos, false);
                        break;
                    case "e":
                        pos = findWordEnd(currentInput, pos, true);
                        break;
                    case "E":
                        pos = findWORDEnd(currentInput, pos, true);
                        break;
                    case "ge":
                        pos = findWordEnd(currentInput, pos, false);
                        break;
                    case "0":
                        pos = getLineStart(currentInput, pos);
                        break;
                    case "^":
                        pos = getFirstNonBlank(
                            currentInput,
                            getLineStart(currentInput, pos),
                        );
                        break;
                    case "$":
                        pos = getLineEnd(currentInput, pos);
                        break;
                    case "gg":
                        pos = 0;
                        break;
                    case "G":
                        pos = currentInput.value.length;
                        break;
                    case "{":
                        pos = findParagraphBoundary(currentInput, pos, false);
                        break;
                    case "}":
                        pos = findParagraphBoundary(currentInput, pos, true);
                        break;
                    case "%":
                        pos = findMatchingPair(currentInput, pos);
                        break;
                }
            }
            debug("executeMotion result", { motion, count, endPos: pos });
            setCursorPos(currentInput, pos);
            return pos;
        }
        function getMotionRange(currentInput, motion, count = 1) {
            const startPos = getCursorPos(currentInput);
            debug("getMotionRange", { motion, count, startPos });
            executeMotion(currentInput, motion, count);
            const endPos = getCursorPos(currentInput);
            setCursorPos(currentInput, startPos);
            const range = {
                start: Math.min(startPos, endPos),
                end: Math.max(startPos, endPos),
            };
            debug("getMotionRange result", range);
            return range;
        }
        function deleteRange(currentInput, undoStack, redoStack, start, end) {
            debug("deleteRange", {
                start,
                end,
                deleted: currentInput.value.substring(start, end),
            });
            saveState(currentInput, undoStack, redoStack);
            const text = currentInput.value;
            currentInput.value = text.substring(0, start) + text.substring(end);
            setCursorPos(currentInput, start);
        }
        function yankRange(currentInput, clipboard, start, end) {
            const yanked = currentInput.value.substring(start, end);
            debug("yankRange", { start, end, yanked });
            clipboard.content = yanked;
        }
        function changeRange(
            currentInput,
            undoStack,
            redoStack,
            start,
            end,
            enterInsertMode,
        ) {
            debug("changeRange", { start, end });
            deleteRange(currentInput, undoStack, redoStack, start, end);
            enterInsertMode();
        }
        function repeatLastChange(state) {
            const { lastChange, currentInput } = state;
            if (!lastChange || !currentInput) return;
            debug("repeatLastChange", lastChange);
            const count = lastChange.count || 1;
            state.countBuffer = String(count);
            if (lastChange.operator) {
                if (lastChange.motion) {
                    state.operatorPending = lastChange.operator;
                    processNormalCommand(lastChange.motion, state);
                } else if (lastChange.textObject) {
                    state.operatorPending = lastChange.operator;
                    state.commandBuffer = lastChange.textObject[0];
                    processNormalCommand(lastChange.textObject[1], state);
                }
            } else if (lastChange.command) {
                switch (lastChange.command) {
                    case "o":
                    case "O":
                    case "s":
                    case "x":
                    case "X":
                    case "p":
                    case "P":
                        processNormalCommand(lastChange.command, state);
                        break;
                    case "r":
                        state.commandBuffer = "r";
                        processNormalCommand(lastChange.char ?? "", state);
                        break;
                }
            }
        }
        function processNormalCommand(key, state) {
            const {
                currentInput,
                countBuffer,
                commandBuffer,
                operatorPending,
                undoStack,
                redoStack,
                clipboard,
                enterInsertMode,
                enterVisualMode,
            } = state;
            if (!currentInput) return;
            const count = parseInt(countBuffer) || 1;
            debug("processNormalCommand", {
                key,
                count,
                countBuffer,
                commandBuffer,
                operatorPending,
            });
            if (operatorPending) {
                if (key === operatorPending) {
                    debug("processCommand: double operator", {
                        operator: operatorPending,
                        count,
                    });
                    const line = getLine(
                        currentInput,
                        getCursorPos(currentInput),
                    );
                    const start = line.start;
                    const end =
                        line.end < currentInput.value.length
                            ? line.end + 1
                            : line.end;
                    if (operatorPending === "d") {
                        yankRange(currentInput, clipboard, start, end);
                        deleteRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            start,
                            end,
                        );
                        state.lastChange = {
                            operator: "d",
                            motion: "d",
                            count,
                        };
                    } else if (operatorPending === "y") {
                        yankRange(currentInput, clipboard, start, end);
                        state.lastChange = {
                            operator: "y",
                            motion: "y",
                            count,
                        };
                    } else if (operatorPending === "c") {
                        yankRange(currentInput, clipboard, start, end);
                        changeRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            start,
                            end,
                            enterInsertMode,
                        );
                        state.lastChange = {
                            operator: "c",
                            motion: "c",
                            count,
                        };
                    }
                    state.operatorPending = null;
                    state.countBuffer = "";
                    return;
                }
                if (key === "i" || key === "a") {
                    state.commandBuffer = key;
                    return;
                }
                if (["f", "F", "t", "T"].includes(key)) {
                    state.commandBuffer = key;
                    return;
                }
                if (["f", "F", "t", "T"].includes(commandBuffer)) {
                    debug("processCommand: find motion with operator", {
                        operator: operatorPending,
                        findMotion: commandBuffer,
                        char: key,
                        count,
                    });
                    const forward = ["f", "t"].includes(commandBuffer);
                    const till = ["t", "T"].includes(commandBuffer);
                    state.lastFindChar = key;
                    state.lastFindDirection = forward;
                    state.lastFindType = commandBuffer;
                    const startPos = getCursorPos(currentInput);
                    for (let i = 0; i < count; i++) {
                        const newPos = findCharInLine(
                            currentInput,
                            getCursorPos(currentInput),
                            key,
                            forward,
                            till,
                        );
                        setCursorPos(currentInput, newPos);
                    }
                    const endPos = getCursorPos(currentInput);
                    debug("processCommand: find motion result", {
                        startPos,
                        endPos,
                        moved: startPos !== endPos,
                    });
                    setCursorPos(currentInput, startPos);
                    const inclusiveEnd = till ? endPos : endPos + 1;
                    const range2 = {
                        start: Math.min(startPos, inclusiveEnd),
                        end: Math.max(startPos, inclusiveEnd),
                    };
                    if (operatorPending === "d") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        deleteRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            range2.start,
                            range2.end,
                        );
                        state.lastChange = {
                            operator: "d",
                            motion: commandBuffer + key,
                            count,
                        };
                    } else if (operatorPending === "y") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        state.lastChange = {
                            operator: "y",
                            motion: commandBuffer + key,
                            count,
                        };
                    } else if (operatorPending === "c") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        changeRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            range2.start,
                            range2.end,
                            enterInsertMode,
                        );
                        state.lastChange = {
                            operator: "c",
                            motion: commandBuffer + key,
                            count,
                        };
                    }
                    state.operatorPending = null;
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (commandBuffer === "i" || commandBuffer === "a") {
                    const inner = commandBuffer === "i";
                    debug("processCommand: text object", {
                        operator: operatorPending,
                        textObject: commandBuffer + key,
                        inner,
                    });
                    const range2 = findTextObject(currentInput, key, inner);
                    if (operatorPending === "d") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        deleteRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            range2.start,
                            range2.end,
                        );
                        state.lastChange = {
                            operator: "d",
                            textObject: commandBuffer + key,
                            count,
                        };
                    } else if (operatorPending === "y") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        state.lastChange = {
                            operator: "y",
                            textObject: commandBuffer + key,
                            count,
                        };
                    } else if (operatorPending === "c") {
                        yankRange(
                            currentInput,
                            clipboard,
                            range2.start,
                            range2.end,
                        );
                        changeRange(
                            currentInput,
                            undoStack,
                            redoStack,
                            range2.start,
                            range2.end,
                            enterInsertMode,
                        );
                        state.lastChange = {
                            operator: "c",
                            textObject: commandBuffer + key,
                            count,
                        };
                    }
                    state.operatorPending = null;
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                debug("processCommand: motion-based operation", {
                    operator: operatorPending,
                    motion: key,
                    count,
                });
                const range = getMotionRange(currentInput, key, count);
                if (operatorPending === "d") {
                    yankRange(currentInput, clipboard, range.start, range.end);
                    deleteRange(
                        currentInput,
                        undoStack,
                        redoStack,
                        range.start,
                        range.end,
                    );
                    state.lastChange = { operator: "d", motion: key, count };
                } else if (operatorPending === "y") {
                    yankRange(currentInput, clipboard, range.start, range.end);
                    state.lastChange = { operator: "y", motion: key, count };
                } else if (operatorPending === "c") {
                    yankRange(currentInput, clipboard, range.start, range.end);
                    changeRange(
                        currentInput,
                        undoStack,
                        redoStack,
                        range.start,
                        range.end,
                        enterInsertMode,
                    );
                    state.lastChange = { operator: "c", motion: key, count };
                }
                state.operatorPending = null;
                state.commandBuffer = "";
                state.countBuffer = "";
                return;
            }
            if (commandBuffer) {
                const fullCommand = commandBuffer + key;
                if (fullCommand === "gg") {
                    executeMotion(currentInput, "gg", count);
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (commandBuffer === "g" && key === "e") {
                    executeMotion(currentInput, "ge", count);
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (["f", "F", "t", "T"].includes(commandBuffer)) {
                    const forward = ["f", "t"].includes(commandBuffer);
                    const till = ["t", "T"].includes(commandBuffer);
                    state.lastFindChar = key;
                    state.lastFindDirection = forward;
                    state.lastFindType = commandBuffer;
                    for (let i = 0; i < count; i++) {
                        const newPos = findCharInLine(
                            currentInput,
                            getCursorPos(currentInput),
                            key,
                            forward,
                            till,
                        );
                        setCursorPos(currentInput, newPos);
                    }
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (commandBuffer === "r") {
                    saveState(currentInput, undoStack, redoStack);
                    const pos = getCursorPos(currentInput);
                    const text = currentInput.value;
                    currentInput.value =
                        text.substring(0, pos) + key + text.substring(pos + 1);
                    state.lastChange = { command: "r", char: key, count };
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                state.commandBuffer = "";
            }
            switch (key) {
                case "h":
                case "j":
                case "k":
                case "l":
                case "w":
                case "W":
                case "b":
                case "B":
                case "e":
                case "E":
                case "0":
                case "^":
                case "$":
                case "G":
                case "{":
                case "}":
                case "%":
                    executeMotion(currentInput, key, count);
                    state.countBuffer = "";
                    break;
                case "g":
                case "f":
                case "F":
                case "t":
                case "T":
                case "r":
                    state.commandBuffer = key;
                    break;
                case ";":
                    if (state.lastFindChar) {
                        for (let i = 0; i < count; i++) {
                            const till = ["t", "T"].includes(
                                state.lastFindType,
                            );
                            const newPos = findCharInLine(
                                currentInput,
                                getCursorPos(currentInput),
                                state.lastFindChar,
                                state.lastFindDirection,
                                till,
                            );
                            setCursorPos(currentInput, newPos);
                        }
                    }
                    state.countBuffer = "";
                    break;
                case ",":
                    if (state.lastFindChar) {
                        for (let i = 0; i < count; i++) {
                            const till = ["t", "T"].includes(
                                state.lastFindType,
                            );
                            const newPos = findCharInLine(
                                currentInput,
                                getCursorPos(currentInput),
                                state.lastFindChar,
                                !state.lastFindDirection,
                                till,
                            );
                            setCursorPos(currentInput, newPos);
                        }
                    }
                    state.countBuffer = "";
                    break;
                case "i":
                    if (operatorPending) {
                        state.commandBuffer = "i";
                    } else {
                        enterInsertMode();
                        state.countBuffer = "";
                    }
                    break;
                case "a":
                    if (operatorPending) {
                        state.commandBuffer = "a";
                    } else {
                        setCursorPos(
                            currentInput,
                            getCursorPos(currentInput) + 1,
                        );
                        enterInsertMode();
                        state.countBuffer = "";
                    }
                    break;
                case "I":
                    setCursorPos(
                        currentInput,
                        getFirstNonBlank(
                            currentInput,
                            getLineStart(
                                currentInput,
                                getCursorPos(currentInput),
                            ),
                        ),
                    );
                    enterInsertMode();
                    state.countBuffer = "";
                    break;
                case "A":
                    setCursorPos(
                        currentInput,
                        getLineEnd(currentInput, getCursorPos(currentInput)),
                    );
                    enterInsertMode();
                    state.countBuffer = "";
                    break;
                case "o":
                    saveState(currentInput, undoStack, redoStack);
                    const posO = getLineEnd(
                        currentInput,
                        getCursorPos(currentInput),
                    );
                    currentInput.value =
                        currentInput.value.substring(0, posO) +
                        `
` +
                        currentInput.value.substring(posO);
                    setCursorPos(currentInput, posO + 1);
                    enterInsertMode();
                    state.lastChange = { command: "o", count };
                    state.countBuffer = "";
                    break;
                case "O":
                    saveState(currentInput, undoStack, redoStack);
                    const lineStartO = getLineStart(
                        currentInput,
                        getCursorPos(currentInput),
                    );
                    currentInput.value =
                        currentInput.value.substring(0, lineStartO) +
                        `
` +
                        currentInput.value.substring(lineStartO);
                    setCursorPos(currentInput, lineStartO);
                    enterInsertMode();
                    state.lastChange = { command: "O", count };
                    state.countBuffer = "";
                    break;
                case "s":
                    saveState(currentInput, undoStack, redoStack);
                    const posS = getCursorPos(currentInput);
                    currentInput.value =
                        currentInput.value.substring(0, posS) +
                        currentInput.value.substring(posS + 1);
                    enterInsertMode();
                    state.lastChange = { command: "s", count };
                    state.countBuffer = "";
                    break;
                case "x":
                    saveState(currentInput, undoStack, redoStack);
                    const posX = getCursorPos(currentInput);
                    const endX = Math.min(
                        posX + count,
                        currentInput.value.length,
                    );
                    clipboard.content = currentInput.value.substring(
                        posX,
                        endX,
                    );
                    currentInput.value =
                        currentInput.value.substring(0, posX) +
                        currentInput.value.substring(endX);
                    setCursorPos(currentInput, posX);
                    state.lastChange = { command: "x", count };
                    state.countBuffer = "";
                    break;
                case "X":
                    saveState(currentInput, undoStack, redoStack);
                    for (let i = 0; i < count; i++) {
                        const posXb = getCursorPos(currentInput);
                        if (posXb > 0) {
                            clipboard.content = currentInput.value[posXb - 1];
                            currentInput.value =
                                currentInput.value.substring(0, posXb - 1) +
                                currentInput.value.substring(posXb);
                            setCursorPos(currentInput, posXb - 1);
                        }
                    }
                    state.lastChange = { command: "X", count };
                    state.countBuffer = "";
                    break;
                case "D":
                    saveState(currentInput, undoStack, redoStack);
                    const posD = getCursorPos(currentInput);
                    const lineEndD = getLineEnd(currentInput, posD);
                    clipboard.content = currentInput.value.substring(
                        posD,
                        lineEndD,
                    );
                    currentInput.value =
                        currentInput.value.substring(0, posD) +
                        currentInput.value.substring(lineEndD);
                    state.lastChange = { command: "D", count };
                    state.countBuffer = "";
                    break;
                case "d":
                case "c":
                case "y":
                    state.operatorPending = key;
                    break;
                case "p":
                    saveState(currentInput, undoStack, redoStack);
                    const posP = getCursorPos(currentInput) + 1;
                    currentInput.value =
                        currentInput.value.substring(0, posP) +
                        clipboard.content +
                        currentInput.value.substring(posP);
                    setCursorPos(
                        currentInput,
                        posP + clipboard.content.length - 1,
                    );
                    state.lastChange = { command: "p", count };
                    state.countBuffer = "";
                    break;
                case "P":
                    saveState(currentInput, undoStack, redoStack);
                    const posPb = getCursorPos(currentInput);
                    currentInput.value =
                        currentInput.value.substring(0, posPb) +
                        clipboard.content +
                        currentInput.value.substring(posPb);
                    setCursorPos(
                        currentInput,
                        posPb + clipboard.content.length - 1,
                    );
                    state.lastChange = { command: "P", count };
                    state.countBuffer = "";
                    break;
                case "u":
                    undo(currentInput, undoStack, redoStack);
                    state.countBuffer = "";
                    break;
                case ".":
                    if (state.lastChange) {
                        repeatLastChange(state);
                    }
                    state.countBuffer = "";
                    break;
                case "v":
                    enterVisualMode(false);
                    state.countBuffer = "";
                    break;
                case "V":
                    enterVisualMode(true);
                    state.countBuffer = "";
                    break;
                default:
                    if (/\d/.test(key)) {
                        state.countBuffer += key;
                    } else {
                        state.commandBuffer = "";
                        state.countBuffer = "";
                        state.operatorPending = null;
                    }
            }
        }

        // src/visual.ts
        function updateVisualSelection2(
            currentInput,
            mode,
            visualStart,
            visualEnd,
        ) {
            if (!currentInput || visualStart === null || visualEnd === null)
                return;
            debug("updateVisualSelection", { visualStart, visualEnd });
            const adjustedEnd =
                mode === "visual-line"
                    ? visualEnd
                    : Math.min(visualEnd + 1, currentInput.value.length);
            updateVisualSelection(currentInput, visualStart, adjustedEnd);
            currentInput.selectionStart = visualEnd;
            currentInput.selectionEnd = visualEnd;
            updateCustomCaret(currentInput);
            updateLineNumbers(currentInput);
        }
        function extendVisualSelection(
            currentInput,
            mode,
            visualStart,
            visualEnd,
            newPos,
        ) {
            if (mode !== "visual" && mode !== "visual-line")
                return { visualStart, visualEnd };
            debug("extendVisualSelection BEFORE", {
                visualStart,
                visualEnd,
                newPos,
                mode,
            });
            if (mode === "visual-line") {
                visualEnd = getLineEnd(currentInput, newPos);
                if (newPos < visualStart) {
                    visualStart = getLineStart(currentInput, newPos);
                } else {
                    visualStart = getLineStart(currentInput, visualStart);
                }
            } else {
                visualEnd = newPos;
            }
            debug("extendVisualSelection AFTER", { visualStart, visualEnd });
            updateVisualSelection2(currentInput, mode, visualStart, visualEnd);
            return { visualStart, visualEnd };
        }
        function getCurrentRange(mode, visualStart, visualEnd, currentInput) {
            if (mode === "visual" || mode === "visual-line") {
                const start = Math.min(visualStart, visualEnd);
                const end = Math.max(visualStart, visualEnd);
                return {
                    start,
                    end:
                        mode === "visual-line"
                            ? end
                            : Math.min(end + 1, currentInput.value.length),
                };
            }
            const pos = getCursorPos(currentInput);
            return { start: pos, end: pos };
        }
        function processVisualCommand(key, state) {
            const {
                currentInput,
                countBuffer,
                commandBuffer,
                mode,
                visualStart,
                visualEnd,
                undoStack,
                redoStack,
                clipboard,
                enterInsertMode,
                exitVisualMode,
                enterVisualMode,
            } = state;
            if (!currentInput) return;
            const count = parseInt(countBuffer) || 1;
            debug("processVisualCommand", { key, count, mode });
            if (commandBuffer) {
                const fullCommand = commandBuffer + key;
                if (fullCommand === "gg") {
                    executeMotion(currentInput, "gg", count);
                    const newPos = getCursorPos(currentInput);
                    const newSelection = extendVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                        newPos,
                    );
                    state.visualStart = newSelection.visualStart;
                    state.visualEnd = newSelection.visualEnd;
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (commandBuffer === "g" && key === "e") {
                    executeMotion(currentInput, "ge", count);
                    const newPos = getCursorPos(currentInput);
                    const newSelection = extendVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                        newPos,
                    );
                    state.visualStart = newSelection.visualStart;
                    state.visualEnd = newSelection.visualEnd;
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                if (["f", "F", "t", "T"].includes(commandBuffer)) {
                    const forward = ["f", "t"].includes(commandBuffer);
                    const till = ["t", "T"].includes(commandBuffer);
                    state.lastFindChar = key;
                    state.lastFindDirection = forward;
                    state.lastFindType = commandBuffer;
                    let newPos = getCursorPos(currentInput);
                    for (let i = 0; i < count; i++) {
                        newPos = findCharInLine(
                            currentInput,
                            newPos,
                            key,
                            forward,
                            till,
                        );
                    }
                    setCursorPos(currentInput, newPos);
                    const newSelection = extendVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                        newPos,
                    );
                    state.visualStart = newSelection.visualStart;
                    state.visualEnd = newSelection.visualEnd;
                    state.commandBuffer = "";
                    state.countBuffer = "";
                    return;
                }
                state.commandBuffer = "";
            }
            const motionKeys = [
                "h",
                "j",
                "k",
                "l",
                "w",
                "b",
                "e",
                "0",
                "^",
                "$",
                "G",
                "{",
                "}",
                "%",
            ];
            if (motionKeys.includes(key)) {
                executeMotion(currentInput, key, count);
                const newPos = getCursorPos(currentInput);
                const newSelection = extendVisualSelection(
                    currentInput,
                    mode,
                    visualStart,
                    visualEnd,
                    newPos,
                );
                state.visualStart = newSelection.visualStart;
                state.visualEnd = newSelection.visualEnd;
                state.countBuffer = "";
                return;
            }
            if (key === "d") {
                const range = getCurrentRange(
                    mode,
                    visualStart,
                    visualEnd,
                    currentInput,
                );
                yankRange(currentInput, clipboard, range.start, range.end);
                deleteRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                );
                exitVisualMode();
                state.countBuffer = "";
                return;
            }
            if (key === "y") {
                const range = getCurrentRange(
                    mode,
                    visualStart,
                    visualEnd,
                    currentInput,
                );
                yankRange(currentInput, clipboard, range.start, range.end);
                exitVisualMode();
                state.countBuffer = "";
                return;
            }
            if (key === "c") {
                const range = getCurrentRange(
                    mode,
                    visualStart,
                    visualEnd,
                    currentInput,
                );
                yankRange(currentInput, clipboard, range.start, range.end);
                deleteRange(
                    currentInput,
                    undoStack,
                    redoStack,
                    range.start,
                    range.end,
                );
                enterInsertMode();
                state.countBuffer = "";
                return;
            }
            if (key === "v") {
                if (mode === "visual") {
                    exitVisualMode();
                } else {
                    enterVisualMode(false);
                }
                state.countBuffer = "";
                return;
            }
            if (key === "V") {
                if (mode === "visual-line") {
                    exitVisualMode();
                } else {
                    enterVisualMode(true);
                }
                state.countBuffer = "";
                return;
            }
            if (key === ";") {
                if (state.lastFindChar) {
                    let newPos = getCursorPos(currentInput);
                    for (let i = 0; i < count; i++) {
                        const till = ["t", "T"].includes(state.lastFindType);
                        newPos = findCharInLine(
                            currentInput,
                            newPos,
                            state.lastFindChar,
                            state.lastFindDirection,
                            till,
                        );
                    }
                    setCursorPos(currentInput, newPos);
                    const newSelection = extendVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                        newPos,
                    );
                    state.visualStart = newSelection.visualStart;
                    state.visualEnd = newSelection.visualEnd;
                }
                state.countBuffer = "";
                return;
            }
            if (key === ",") {
                if (state.lastFindChar) {
                    let newPos = getCursorPos(currentInput);
                    for (let i = 0; i < count; i++) {
                        const till = ["t", "T"].includes(state.lastFindType);
                        newPos = findCharInLine(
                            currentInput,
                            newPos,
                            state.lastFindChar,
                            !state.lastFindDirection,
                            till,
                        );
                    }
                    setCursorPos(currentInput, newPos);
                    const newSelection = extendVisualSelection(
                        currentInput,
                        mode,
                        visualStart,
                        visualEnd,
                        newPos,
                    );
                    state.visualStart = newSelection.visualStart;
                    state.visualEnd = newSelection.visualEnd;
                }
                state.countBuffer = "";
                return;
            }
            switch (key) {
                case "g":
                case "f":
                case "F":
                case "t":
                case "T":
                    state.commandBuffer = key;
                    break;
                case "x":
                    const range = getCurrentRange(
                        mode,
                        visualStart,
                        visualEnd,
                        currentInput,
                    );
                    yankRange(currentInput, clipboard, range.start, range.end);
                    deleteRange(
                        currentInput,
                        undoStack,
                        redoStack,
                        range.start,
                        range.end,
                    );
                    exitVisualMode();
                    state.countBuffer = "";
                    break;
                case "p":
                case "P":
                    saveState(currentInput, undoStack, redoStack);
                    const range2 = getCurrentRange(
                        mode,
                        visualStart,
                        visualEnd,
                        currentInput,
                    );
                    deleteRange(
                        currentInput,
                        undoStack,
                        redoStack,
                        range2.start,
                        range2.end,
                    );
                    currentInput.value =
                        currentInput.value.substring(0, range2.start) +
                        clipboard.content +
                        currentInput.value.substring(range2.start);
                    setCursorPos(currentInput, range2.start);
                    exitVisualMode();
                    state.countBuffer = "";
                    break;
                default:
                    if (/\d/.test(key)) {
                        state.countBuffer += key;
                    } else {
                        state.commandBuffer = "";
                        state.countBuffer = "";
                    }
            }
        }

        // src/main.ts
        var mode = "normal";
        var currentInput = null;
        var commandBuffer = "";
        var countBuffer = "";
        var operatorPending = null;
        var lastFindChar = null;
        var lastFindDirection = null;
        var lastFindType = null;
        var clipboard = { content: "" };
        var undoStack = [];
        var redoStack = [];
        var lastChange = null;
        var allowBlur = false;
        var escapePressed = false;
        var visualStart = null;
        var visualEnd = null;
        var ESCAPE_KEYS = [
            { key: "Escape", ctrlKey: false },
            { key: "[", ctrlKey: true },
        ];
        function isEscapeKey(e) {
            return ESCAPE_KEYS.some(
                (escKey) =>
                    e.key === escKey.key && e.ctrlKey === escKey.ctrlKey,
            );
        }
        function enterInsertMode() {
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
        function enterNormalMode() {
            debug("enterNormalMode", { from: mode });
            mode = "normal";
            visualStart = null;
            visualEnd = null;
            clearVisualSelection();
            updateIndicator(mode, currentInput);
            if (currentInput) {
                const pos = getCursorPos(currentInput);
                const lineEnd = getLineEnd(currentInput, pos);
                if (
                    pos === lineEnd &&
                    pos > 0 &&
                    currentInput.value[pos - 1] !==
                        `
`
                ) {
                    setCursorPos(currentInput, pos - 1);
                }
                createCustomCaret(currentInput);
                updateLineNumbers(currentInput);
            }
        }
        function enterVisualMode(lineMode = false) {
            debug("enterVisualMode", { lineMode, from: mode });
            mode = lineMode ? "visual-line" : "visual";
            if (currentInput) {
                const pos = getCursorPos(currentInput);
                if (lineMode) {
                    visualStart = getLineStart(currentInput, pos);
                    visualEnd = getLineEnd(currentInput, pos);
                } else {
                    visualStart = pos;
                    visualEnd = pos;
                }
                createCustomCaret(currentInput);
                updateVisualSelection2(
                    currentInput,
                    mode,
                    visualStart,
                    visualEnd,
                );
                updateLineNumbers(currentInput);
            }
            updateIndicator(mode, currentInput);
        }
        function exitVisualMode() {
            debug("exitVisualMode");
            visualStart = null;
            visualEnd = null;
            clearVisualSelection();
            enterNormalMode();
        }
        function processCommand(key) {
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
            countBuffer = state.countBuffer;
            commandBuffer = state.commandBuffer;
            operatorPending = state.operatorPending;
            lastFindChar = state.lastFindChar;
            lastFindDirection = state.lastFindDirection;
            lastFindType = state.lastFindType;
            lastChange = state.lastChange;
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
        function handleFocus(e) {
            const el = e.target;
            debug("handleFocus", {
                tag: el.tagName,
                isNewInput: currentInput !== el,
                currentMode: mode,
            });
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                if (
                    el.readOnly ||
                    el.getAttribute("aria-readonly") === "true"
                ) {
                    debug("handleFocus: skipping readonly element");
                    currentInput = null;
                    updateIndicator(mode, currentInput);
                    return;
                }
                if (currentInput !== el) {
                    currentInput = el;
                    mode = "insert";
                    undoStack = [];
                    redoStack = [];
                    updateIndicator(mode, currentInput);
                    updateLineNumbers(currentInput);
                    debug("Attaching direct keydown listener to element");
                    const originalOnKeyDown = el.onkeydown;
                    el.onkeydown = (event) => {
                        debug("onkeydown property handler", {
                            key: event.key,
                            ctrl: event.ctrlKey,
                        });
                        if (
                            isEscapeKey(event) ||
                            (event.ctrlKey &&
                                (event.key === "e" ||
                                    event.key === "y" ||
                                    event.key === "d" ||
                                    event.key === "u"))
                        ) {
                            debug(
                                "Special key in onkeydown - calling handleKeyDown",
                            );
                            event.preventDefault();
                            handleKeyDown(event);
                            return false;
                        }
                        if (originalOnKeyDown) {
                            return originalOnKeyDown.call(el, event);
                        }
                        return true;
                    };
                    el.addEventListener(
                        "keydown",
                        (event) => {
                            const kbEvent = event;
                            debug("DIRECT element keydown", {
                                key: kbEvent.key,
                                ctrl: kbEvent.ctrlKey,
                                target: kbEvent.target.tagName,
                                defaultPrevented: kbEvent.defaultPrevented,
                                propagationStopped: kbEvent.cancelBubble,
                            });
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
                    debug("handleFocus: same input refocused, keeping mode", {
                        mode,
                    });
                    updateIndicator(mode, currentInput);
                    if (mode === "normal") {
                        createCustomCaret(currentInput);
                    }
                }
            }
        }
        function handleBlur(e) {
            if (e.target === currentInput) {
                debug("handleBlur", {
                    mode,
                    allowBlur,
                    escapePressed,
                    relatedTarget: e.relatedTarget,
                    isTrusted: e.isTrusted,
                });
                if (e.relatedTarget) {
                    debug(
                        "handleBlur: focus moving to another element, allowing blur",
                    );
                    allowBlur = false;
                    removeCustomCaret(currentInput);
                    removeLineNumbers();
                    clearVisualSelection();
                    currentInput = null;
                    updateIndicator(mode, currentInput);
                    return;
                }
                const isEscapeBlur =
                    (escapePressed &&
                        (mode === "insert" ||
                            mode === "visual" ||
                            mode === "visual-line")) ||
                    ((mode === "insert" ||
                        mode === "visual" ||
                        mode === "visual-line") &&
                        !allowBlur &&
                        !e.relatedTarget &&
                        e.isTrusted);
                if (isEscapeBlur) {
                    debug(
                        "handleBlur: ESC caused blur, switching to normal mode",
                    );
                    escapePressed = false;
                    if (mode === "visual" || mode === "visual-line") {
                        exitVisualMode();
                    } else {
                        enterNormalMode();
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    const input = currentInput;
                    setTimeout(() => {
                        debug("handleBlur: refocusing in normal mode");
                        input.focus();
                    }, 0);
                    return;
                }
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
                    const input = currentInput;
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
        function handleKeyDown(e) {
            debug("handleKeyDown ENTRY", {
                hasCurrentInput: !!currentInput,
                key: e.key,
                ctrl: e.ctrlKey,
                mode,
                target: e.target.tagName,
                defaultPrevented: e.defaultPrevented,
                propagationStopped: e.cancelBubble,
                eventPhase: e.eventPhase,
            });
            if (!currentInput) {
                debug("handleKeyDown: no currentInput, returning");
                return;
            }
            if (e.defaultPrevented) {
                debug("handleKeyDown: event already handled, skipping");
                return;
            }
            debug("handleKeyDown", {
                key: e.key,
                ctrl: e.ctrlKey,
                mode,
                target: e.target.tagName,
            });
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
                    debug("handleKeyDown: switching from insert to normal");
                    enterNormalMode();
                    debug("handleKeyDown: mode switch complete", {
                        newMode: mode,
                    });
                } else if (mode === "visual" || mode === "visual-line") {
                    debug("handleKeyDown: exiting visual mode to normal");
                    exitVisualMode();
                    debug("handleKeyDown: mode switch complete", {
                        newMode: mode,
                    });
                } else {
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
            if (e.ctrlKey && e.key === "r" && mode !== "insert") {
                debug("handleKeyDown: Ctrl-r redo");
                e.preventDefault();
                redo(currentInput, undoStack, redoStack);
                return;
            }
            if (mode === "insert") {
                debug("handleKeyDown: insert mode, passing through");
                return;
            }
            debug("handleKeyDown: normal/visual mode, processing command");
            e.preventDefault();
            processCommand(e.key);
        }
        debug("Vim Mode initialized");
        if (typeof window === "undefined" || typeof document === "undefined") {
            debug("Skipping event listener setup - no window/document");
        } else {
            window.addEventListener(
                "keydown",
                (e) => {
                    if (isEscapeKey(e)) {
                        debug("GLOBAL ESC/Ctrl-[ keydown detected", {
                            key: e.key,
                            ctrl: e.ctrlKey,
                            target: e.target.tagName,
                            eventPhase: e.eventPhase,
                            defaultPrevented: e.defaultPrevented,
                            timestamp: e.timeStamp,
                        });
                        escapePressed = true;
                        setTimeout(() => {
                            escapePressed = false;
                            debug("escapePressed flag cleared");
                        }, 100);
                    }
                },
                true,
            );
            window.addEventListener(
                "keyup",
                (e) => {
                    if (isEscapeKey(e)) {
                        debug("GLOBAL ESC/Ctrl-[ keyup detected", {
                            key: e.key,
                            ctrl: e.ctrlKey,
                            target: e.target.tagName,
                            timestamp: e.timeStamp,
                        });
                    }
                },
                true,
            );
            const testListener = (e) => {
                if (isEscapeKey(e)) {
                    debug("RAW ESC/Ctrl-[ DETECTED on document", {
                        key: e.key,
                        ctrl: e.ctrlKey,
                        target: e.target.tagName,
                        currentTarget: e.currentTarget,
                        eventPhase: e.eventPhase,
                        defaultPrevented: e.defaultPrevented,
                        propagationStopped: e.cancelBubble,
                        timestamp: e.timeStamp,
                    });
                }
            };
            window.addEventListener(
                "keydown",
                (e) => {
                    if (isEscapeKey(e)) {
                        debug("WINDOW ESC/Ctrl-[ listener", {
                            key: e.key,
                            ctrl: e.ctrlKey,
                            target: e.target.tagName,
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
            document.addEventListener(
                "input",
                (e) => {
                    if (
                        currentInput &&
                        e.target === currentInput &&
                        mode === "insert"
                    ) {
                        debug("input event: updating line numbers");
                        requestAnimationFrame(() => {
                            if (currentInput) {
                                updateLineNumbers(currentInput);
                            }
                        });
                    }
                },
                true,
            );
            document.addEventListener(
                "keydown",
                (e) => {
                    if (isEscapeKey(e)) {
                        debug(
                            "Secondary ESC/Ctrl-[ listener (bubbling phase)",
                            {
                                key: e.key,
                                ctrl: e.ctrlKey,
                                defaultPrevented: e.defaultPrevented,
                                propagationStopped: e.cancelBubble,
                                currentInput: !!currentInput,
                                mode,
                            },
                        );
                    }
                },
                false,
            );
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
                            updateVisualSelection2(
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
                        updateVisualSelection2(
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
        }
        updateIndicator(mode, currentInput);
    })();
})();
