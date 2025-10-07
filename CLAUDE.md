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
- `bun run test:e2e`: Run E2E tests with Playwright
- `bun run test:e2e:ui`: Run E2E tests with Playwright UI
- `bun run test:e2e:headed`: Run E2E tests in headed mode
- `bun run test:e2e:report`: Run E2E tests and show report
- `bun run typecheck`: Type-check TypeScript without emitting files
- `bun run typecheck:tsgo`: Type-check with tsgo (faster TypeScript compiler)
- `bun run lint`: Lint code with ESLint
- `bun run lint:fix`: Auto-fix linting issues
- `bun run format`: Format code with Prettier

**Development workflow**:

1. Edit TypeScript files in `src/`
2. Run `bun run build` to generate `dist/tampermonkey_vim_mode.js`
3. Reload the script in Tampermonkey to test changes

**Testing**: Using Playwright for E2E browser-based integration testing. Test files are in the `e2e/` directory.

**Performance tests**: Performance tests in `e2e/performance.spec.ts` are excluded from the default `bun run test:e2e` run. To run them:

```bash
INCLUDE_PERF=1 bunx playwright test --reporter=list e2e/performance.spec.ts
```

**Writing E2E tests**:

- All tests use `file://` protocol (NOT `http://localhost`)
- Use `test.beforeEach` to load the test page:
    ```typescript
    test.beforeEach(async ({ page }) => {
        const htmlPath = path.join(process.cwd(), "test.html");
        await page.goto(`file://${htmlPath}`);
        await page.waitForTimeout(500);
    });
    ```
- The `test.html` file contains a single textarea with pre-filled content
- To enter normal mode from insert mode: `await textarea.press("Escape")`
- For multi-page tests (tab switching): use `context.newPage()` and `page.bringToFront()`
- Always run `bun run build` before running E2E tests

**Deployment**: The built script (`dist/tampermonkey_vim_mode.js`) is distributed via GitHub Gist (see `@updateURL` and `@downloadURL` in the userscript header).

## Vim Feature Coverage

The implementation covers:

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

1. **Write the test first** - Create an E2E test in `e2e/` that reproduces the bug
2. **Commit the test separately** - `git add e2e/... && git commit -m "Add test for [bug description]"`
3. **Verify test fails** - Run `bun run test:e2e` and confirm the new test fails
4. **Implement the fix** - Make code changes to fix the bug
5. **Verify test passes** - Run `bun run test:e2e` and confirm all tests pass
6. **Commit the fix** - `git add [fixed files] && git commit -m "Fix [bug description]"`

This ensures the test actually catches the bug and isn't a false positive.

## Performance Testing

**Performance benchmarks**: The project includes performance tests in `e2e/performance.spec.ts` that measure the speed of common operations (j/k motions, gg/G jumps) on large textareas (150 lines with 10% wrapped lines).

**Running performance tests**:

```bash
bun run build && INCLUDE_PERF=1 bunx playwright test --reporter=list e2e/performance.spec.ts
```

**Performance targets**:

- j/k motions: < 20ms per motion average
- 10j/10k: < 50ms per 10-count motion
- gg/G: < 30ms per jump

**Performance test textarea**: The `test.html` file includes a dedicated `#performance-textarea` with 150 lines where every 10th line wraps (exceeds visible width). This simulates real-world usage with mixed line lengths.

**Performance regression testing workflow** (optional, for performance-sensitive changes):

When making changes that could impact performance (motion handling, text processing, rendering):

1. **Make and commit your changes** - Implement your code and commit it normally

2. **Run performance test on new code** - Measure performance with your changes:

    ```bash
    bun run build && INCLUDE_PERF=1 bunx playwright test --reporter=list e2e/performance.spec.ts 2>&1 | tee perf-after.txt
    ```

3. **Temporarily revert the commit** - Go back to the previous state:

    ```bash
    git revert HEAD --no-commit
    ```

4. **Run performance test on old code** - Measure baseline performance:

    ```bash
    bun run build && INCLUDE_PERF=1 bunx playwright test --reporter=list e2e/performance.spec.ts 2>&1 | tee perf-baseline.txt
    ```

5. **Compare results** - Review the timing differences in the console output:
    - If performance degraded significantly (>20% slower), prompt whether optimization is required
    - If optimization is needed, implement it and update the commit
    - If degradation is acceptable, document the tradeoff in the commit message

6. **Restore your commit** - Undo the revert:

    ```bash
    git reset --hard HEAD~1  # Remove the uncommitted revert
    ```

7. **Push if satisfied** - Push your changes:

    ```bash
    git push
    ```

8. **Clean up** - Remove temporary performance logs:
    ```bash
    rm perf-baseline.txt perf-after.txt
    ```

This workflow is **optional** and should only be used when:

- Making changes to motion commands (j/k/w/b/e/etc)
- Modifying text processing functions (getLine, findWord\*, etc)
- Changing rendering/caret positioning logic
- User reports performance issues

For most changes, the standard pre-commit checks are sufficient.

## Important Guidelines

- **Always use Bun**: All commands should use `bun run` (not npm/yarn)
- **Pre-commit checks**: Run `typecheck`, `lint:fix`, `test:e2e`, and `format` in parallel BEFORE committing changes (even if directly asked to just commit)
- **Type checking**: Run `bun run typecheck:tsgo` after each TypeScript file update for fast validation
- **Version bumping**: When bumping version, update it in `src/setup.ts`, not in `dist/`
- **Config compatibility**: `TAMPER_VIM_MODE` holds user config - changes must be backwards compatible
- **Test HTML file**: Use existing `test.html` for manual testing - don't create new test HTML files
- **Nvim parity testing**: Tests in `e2e/nvim-parity.spec.ts` must verify text changes, not just cursor position. For motion tests, follow the motion with a text-changing operation (like `x` to delete a character) to verify cursor landed in the correct position. The framework includes a guard that fails tests where input text equals output text.
- call tests only with existing "bun run" commands (you can add more args to them)
- all the custom temporary scripts/shell commands must be run with a timeout
- you must run build before e2e tests
- before running e2e you must `bun run build`
