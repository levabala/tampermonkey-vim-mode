# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tampermonkey userscript that adds Vim-like modal editing to all text inputs and textareas on any webpage. The entire implementation is contained in a single self-contained JavaScript file.

## Architecture

**Single-file design**: The entire userscript lives in `tampermonkey_vim_mode.js`. There is no build process, no dependencies, and no module system - it's pure vanilla JavaScript wrapped in an IIFE.

**State management**: Global state is maintained through closure variables at the top level:

- `mode`: Current editing mode ('normal' or 'insert')
- `currentInput`: The currently focused input/textarea element
- `commandBuffer`, `countBuffer`, `operatorPending`: Used to parse multi-character Vim commands
- `clipboard`: Internal clipboard for yank/paste operations
- `undoStack`, `redoStack`: Undo/redo history per input
- `lastChange`: Tracks the last change for dot-repeat (`.` command)

**Command processing flow**:

1. `handleKeyDown()` intercepts all keyboard events
2. In insert mode, keys are passed through normally
3. In normal mode, keys are fed to `processCommand()`
4. `processCommand()` handles the stateful parsing of Vim commands (operators, counts, motions, text objects)
5. Motion functions (`executeMotion()`, `getMotionRange()`) calculate cursor positions
6. Operator functions (`deleteRange()`, `yankRange()`, `changeRange()`) modify text

**Text object parsing**: The script implements `i` (inner) and `a` (around) text objects for pairs like `()`, `[]`, `{}`, `""`, `''`. The `findTextObject()` function searches bidirectionally from the cursor to find matching delimiters.

## Key Implementation Details

- **Mode indicator**: A fixed-position DOM element shows current mode (bottom-left corner)
- **Focus management**: The script prevents blur in insert mode to maintain Vim-like behavior, using the `allowBlur` flag
- **Line-based operations**: Helper functions (`getLine()`, `getLineStart()`, `getLineEnd()`) handle multi-line text manipulation
- **Character finding**: `f`, `t`, `F`, `T` commands are tracked with `lastFindChar`, `lastFindDirection`, and `lastFindType` for `;` and `,` repeat
- **Dot-repeat**: The `lastChange` object stores enough information to replay commands via `.`

## Development

**No build system**: Edit `tampermonkey_vim_mode.js` directly. Changes take effect by reloading the script in Tampermonkey.

**Testing**: Manual testing in a browser with Tampermonkey installed. Focus any input/textarea and press `Escape` to enter normal mode.

**Deployment**: The script is distributed via GitHub Gist (see `@updateURL` and `@downloadURL` in the userscript header).

## Vim Feature Coverage

Refer to `SPEC.md` for the complete list of supported Vim commands. The implementation covers:

- Basic motions: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `^`, `$`, `gg`, `G`
- Advanced motions: `f`, `t`, `%`, `{`, `}`
- Operators: `d`, `c`, `y` combined with motions or text objects
- Insert commands: `i`, `a`, `I`, `A`, `o`, `O`, `s`
- Delete/paste: `x`, `X`, `p`, `P`
- Undo/redo: `u`, `Ctrl-r`
- Repeat: `.`
- Counts: Numeric prefixes work with most commands
- use bun run test to run test

## Testing Workflow

When asked to write a test and fix a bug, follow this workflow to verify the test catches the bug:

1. **Write the test first** - Create a test that reproduces the bug
2. **Commit the test separately** - `git add test/... && git commit -m "Add test for [bug description]"`
3. **Verify test fails** - Run `bun run test` and confirm the new test fails
4. **Implement the fix** - Make code changes to fix the bug
5. **Verify test passes** - Run `bun run test` and confirm all tests pass
6. **Commit the fix** - `git add [fixed files] && git commit -m "Fix [bug description]"`

This ensures the test actually catches the bug and isn't a false positive.

- use bun!
- run lint:fix and format via bun run before committing changes
