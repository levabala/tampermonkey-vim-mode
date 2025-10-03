# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tampermonkey userscript that adds Vim-like modal editing to all text inputs and textareas on any webpage. The entire implementation is contained in a single self-contained JavaScript file.

## Architecture

**TypeScript modular design**: The project is now written in TypeScript with a modular architecture. Source files are in `src/` and bundled using Bun into a single userscript at `dist/tampermonkey_vim_mode.js`.

**Source structure**:

- `src/main.ts`: Entry point that orchestrates the userscript
- `src/setup.ts`: Contains userscript metadata header
- `src/types.ts`: TypeScript type definitions
- `src/common.ts`: Shared utilities and state management
- `src/normal.ts`: Normal mode command handling
- `src/insert.ts`: Insert mode handling
- `src/visual.ts`: Visual mode handling

**Build process**: Run `bun run build` to bundle TypeScript sources into the final userscript. The build script (`build.ts`) uses Bun to compile and bundle everything into an IIFE with the userscript header.

**Build system**: The project uses Bun as the build tool and runtime. Key commands:

- `bun run build`: Build the userscript from TypeScript sources
- `bun run test`: Run test suite with Vitest
- `bun run test:watch`: Run tests in watch mode
- `bun run test:ui`: Run tests with UI
- `bun run test:coverage`: Run tests with coverage report
- `bun run typecheck`: Type-check TypeScript without emitting files
- `bun run lint`: Lint code with ESLint
- `bun run lint:fix`: Auto-fix linting issues
- `bun run format`: Format code with Prettier

**Development workflow**:

1. Edit TypeScript files in `src/`
2. Run `bun run build` to generate `dist/tampermonkey_vim_mode.js`
3. Reload the script in Tampermonkey to test changes

**Testing**: Automated tests using Vitest with jsdom for DOM manipulation. Tests are in the `test/` directory.

**Deployment**: The built script (`dist/tampermonkey_vim_mode.js`) is distributed via GitHub Gist (see `@updateURL` and `@downloadURL` in the userscript header).

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
- Visual mode: `v` for character-wise selection

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
- run typecheck, lint:fix and format via bun run before committing changes (in parallel)
- when bumping version you must do it in src/, not in dist/
- TAMPER_VIM_MODE holds the config. changes to it must be backwards compatible
- run but run typecheck before committing
