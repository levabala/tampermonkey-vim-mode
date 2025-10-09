// Register operations module
import { debug } from "./setup.js";
import type { Register } from "./types.js";
import { VimState } from "./state/vim-state.js";

/**
 * Yank text to a register
 */
export async function yankToRegister(
    vimState: VimState,
    registerName: string | null,
    content: string,
    linewise: boolean,
): Promise<void> {
    const reg = registerName || '"';
    debug("yankToRegister", { register: reg, content, linewise });

    // Set the specified register
    await vimState.setRegister(reg, content, linewise);

    // Also set the default register (") if yanking to a named register
    if (reg !== '"') {
        await vimState.setRegister('"', content, linewise);
    }

    // Keep legacy clipboard in sync with default register
    vimState.setClipboard(content, linewise);
}

/**
 * Get content from a register for pasting
 */
export async function getRegisterContent(
    vimState: VimState,
    registerName: string | null,
): Promise<Register | null> {
    const reg = registerName || '"';
    debug("getRegisterContent", { register: reg });

    // For system clipboard, load it first
    if (reg === "+") {
        await vimState.loadSystemClipboard();
    }

    const content = vimState.getRegister(reg);
    if (!content) {
        debug("getRegisterContent: register empty", { register: reg });
        return null;
    }

    return content;
}
