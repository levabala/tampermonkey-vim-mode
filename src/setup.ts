// ==UserScript==
// @name         Vim Mode for Text Inputs
// @namespace    http://tampermonkey.net/
// @version      1.0.77
// @description  Vim-like editing for textareas and inputs
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/refs/heads/main/dist/tampermonkey_vim_mode.js
// @downloadURL  https://raw.githubusercontent.com/levabala/tampermonkey-vim-mode/refs/heads/main/dist/tampermonkey_vim_mode.js
// @grant        none
// ==/UserScript==

import type { Mode, EditableElement } from "./types.js";

// Tampermonkey global types
interface GMInfo {
    script?: {
        version?: string;
    };
}

declare const GM_info: GMInfo | undefined;

// Extract version from userscript header
// In Tampermonkey, we can use GM_info if available, otherwise fallback to parsing the script source
export const version: string = (() => {
    // Try GM_info first (Tampermonkey API)
    if (
        typeof GM_info !== "undefined" &&
        GM_info.script &&
        GM_info.script.version
    ) {
        return GM_info.script.version;
    }

    // Fallback: try to find our script in document.scripts (only if document exists)
    if (typeof document !== "undefined" && document.scripts) {
        for (const script of Array.from(document.scripts)) {
            const content = script.textContent;
            if (content && content.includes("Vim Mode for Text Inputs")) {
                const match = content.match(/@version\s+([\d.]+)/);
                if (match) return match[1];
            }
        }
    }

    return "unknown";
})();

// Debug mode - enabled via VIM_DEBUG=1 query parameter
export const DEBUG: boolean =
    typeof window !== "undefined" && window.location
        ? new URLSearchParams(window.location.search).get("VIM_DEBUG") === "1"
        : false;
export const debug = (...args: unknown[]): void => {
    if (DEBUG) console.log("@@", ...args);
};

// Global configuration object
interface TamperVimModeConfig {
    disableCustomCaret: boolean;
    showLineNumbers: boolean;
    relativeLineNumbers: boolean;
}

// Extend Window interface to include TAMPER_VIM_MODE
declare global {
    interface Window {
        TAMPER_VIM_MODE: TamperVimModeConfig;
    }
}

// Initialize global config object with localStorage persistence
export const TAMPER_VIM_MODE: TamperVimModeConfig =
    typeof window !== "undefined"
        ? (() => {
              const storageKey = `tamper_vim_mode_${window.location.hostname}`;

              // Load from localStorage
              const loadConfig = (): TamperVimModeConfig => {
                  try {
                      const stored = localStorage.getItem(storageKey);
                      if (stored) {
                          return JSON.parse(stored);
                      }
                  } catch (e) {
                      debug("Failed to load config from localStorage", e);
                  }
                  return {
                      disableCustomCaret: false,
                      showLineNumbers: true,
                      relativeLineNumbers: false,
                  };
              };

              // Create config with getter/setter for persistence
              const config = loadConfig();
              const handler: ProxyHandler<TamperVimModeConfig> = {
                  set(target, prop, value) {
                      target[prop as keyof TamperVimModeConfig] = value;
                      try {
                          localStorage.setItem(
                              storageKey,
                              JSON.stringify(target),
                          );
                      } catch (e) {
                          debug("Failed to save config to localStorage", e);
                      }
                      return true;
                  },
              };

              const proxiedConfig = new Proxy(config, handler);

              // Expose to window
              window.TAMPER_VIM_MODE = proxiedConfig;

              return proxiedConfig;
          })()
        : {
              disableCustomCaret: false,
              showLineNumbers: true,
              relativeLineNumbers: false,
          };

// Mode indicator - only create if document exists
let indicator: HTMLDivElement | undefined;
let modeText: HTMLDivElement | undefined;

if (typeof document !== "undefined") {
    indicator = document.createElement("div");
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.5);
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

    // Defer appending indicator until DOM is ready
    if (document.body) {
        document.body.appendChild(indicator);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            if (indicator) document.body.appendChild(indicator);
        });
    }
}

export { indicator };

export function updateIndicator(
    mode: Mode,
    currentInput: EditableElement | null,
): void {
    if (!indicator || !modeText) return; // Guard for test environment

    let text, color;
    switch (mode) {
        case "insert":
            text = "-- INSERT --";
            color = "rgba(0, 100, 0, 0.5)";
            break;
        case "visual":
            text = "-- VISUAL --";
            color = "rgba(100, 100, 0, 0.5)";
            break;
        case "visual-line":
            text = "-- VISUAL LINE --";
            color = "rgba(100, 100, 0, 0.5)";
            break;
        default:
            text = "-- NORMAL --";
            color = "rgba(0, 0, 0, 0.5)";
    }
    modeText.textContent = text;
    indicator.style.background = color;
    indicator.style.display = currentInput ? "block" : "none";
}
