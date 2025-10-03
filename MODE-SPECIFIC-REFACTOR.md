# Mode-Specific Refactoring Notes

This document tracks architectural issues with mode-specific command handling and state management.

## Issue 1: Visual Mode State Management

### Current Problem

When entering visual mode by pressing `v` in normal mode:

1. `processCommand()` is called in normal mode with `visualStart: null, visualEnd: null`
2. The state object is created with `visualStart: visualStart ?? 0` (becomes 0)
3. `processNormalCommand()` is called with this state
4. `enterVisualMode()` is called, which sets the module-level `visualStart = 71, visualEnd = 71`
5. Mode changes to `visual`
6. On the NEXT keypress (e.g., `l`), `processCommand()` reads the module-level variables
7. BUT: the module-level `visualStart` has been set to 0 at line 150-151 because the state object had 0

**Root Cause:** The state flow is bidirectional but broken:

- Module variables → State object (at processCommand entry)
- State object → Module variables (at processCommand exit, line 150-151)
- But when `enterVisualMode()` sets module variables directly, those changes get overwritten

### Debug Log Evidence

```
@@ processCommand {key: 'v', mode: 'normal', visualStart: null, visualEnd: null}
@@ processCommand state {stateVisualStart: 0, stateVisualEnd: 0}
@@ processNormalCommand {key: 'v', count: 1, ...}
@@ enterVisualMode {lineMode: false, from: 'normal'}
@@ updateVisualSelection {visualStart: 71, visualEnd: 71}  // Correctly set!

// Next keypress:
@@ processCommand {key: 'l', mode: 'visual', visualStart: 0, visualEnd: 0}  // WRONG! Should be 71
```

### Why This Architecture is Confusing

1. **Mixed responsibility**: Normal mode command handler (`processNormalCommand`) handles the `v` key which transitions to visual mode
2. **State synchronization complexity**: Module-level variables are copied to state, state is mutated, then copied back to module variables
3. **Mode transition side effects**: `enterVisualMode()` directly modifies module-level state, but this happens DURING command processing, and gets overwritten afterward

### Proposed Refactor

#### Option 1: Make enterVisualMode() update the state object

```typescript
function enterVisualMode(lineMode: boolean, state: State): void {
    // ... existing logic ...
    state.visualStart = pos;
    state.visualEnd = pos;
}
```

Then in normal.ts:

```typescript
case "v":
    enterVisualMode(false, state);
    break;
```

#### Option 2: Don't overwrite visualStart/visualEnd when transitioning modes

```typescript
// In processCommand, after calling the handler:
if (mode !== oldMode) {
    // Mode transition occurred, don't overwrite visual state
    // because enterVisualMode/enterNormalMode already set it
} else {
    visualStart = state.visualStart;
    visualEnd = state.visualEnd;
}
```

#### Option 3 (RECOMMENDED): Separate mode transition logic

Move mode transitions out of command handlers entirely:

```typescript
function processCommand(key: string): void {
    // Handle mode transitions FIRST
    if (mode === 'normal') {
        if (key === 'v') {
            enterVisualMode(false);
            return;
        }
        if (key === 'V') {
            enterVisualMode(true);
            return;
        }
        if (key === 'i' || key === 'a' || ...) {
            enterInsertMode();
            return;
        }
    }

    // Then handle mode-specific commands
    const state = { ... };
    if (mode === 'visual' || mode === 'visual-line') {
        processVisualCommand(key, state);
    } else {
        processNormalCommand(key, state);
    }

    // Update state (but NOT during mode transitions)
    visualStart = state.visualStart;
    visualEnd = state.visualEnd;
}
```

### Benefits of Option 3

- Clear separation: mode transitions vs command handling
- No more confusion about which handler processes mode transition keys
- Mode transition functions can directly set state without worrying about synchronization
- Easier to understand control flow

### Action Items

- [x] Choose refactoring approach (Option 2 implemented)
- [x] Write tests for visual mode entry from different positions
- [x] Implement refactor
- [ ] Consider Option 3 for future major refactor
- [ ] Update architecture documentation

---

## Issue 2: Duplicated Motion Logic Between Modes

### Current Problem

**Characterizing Bug:** `f{letter}` (find character) commands work correctly in normal mode but do NOT work in visual mode.

Example:

- Normal mode: `fa` moves cursor to next 'a' ✓
- Visual mode: `fa` does nothing ✗

**Root Cause:** Motion logic is duplicated and inconsistently implemented:

1. **In `normal.ts`**: Full motion implementation including `f`, `t`, `F`, `T` with character finding
2. **In `visual.ts`**: Only basic motions listed in `motionKeys` array:
    ```typescript
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
    ```
    Missing: `f`, `t`, `F`, `T`, and their multi-character sequences

### Why This Architecture is Problematic

1. **Code duplication**: Motion handling logic exists separately in both `processNormalCommand` and `processVisualCommand`
2. **Inconsistent behavior**: Same key does different things in different modes
3. **Maintenance burden**: Adding new motions requires updating multiple places
4. **Missing features**: Visual mode doesn't support all motions that normal mode does
5. **State management**: Character find state (`lastFindChar`, `lastFindDirection`, `lastFindType`) is shared but not properly used in visual mode

### Current Implementation

**Normal mode** (`src/normal.ts`):

```typescript
// Handles f, t, F, T with commandBuffer state machine
if (commandBuffer === "f" || commandBuffer === "t" || ...) {
    const pos = findCharInLine(currentInput, getCursorPos(currentInput), key, ...);
    setCursorPos(currentInput, pos);
    state.lastFindChar = key;
    state.lastFindDirection = forward;
    state.lastFindType = commandBuffer;
}
```

**Visual mode** (`src/visual.ts`):

```typescript
// Only basic motions
const motionKeys = ["h", "j", "k", "l", "w", "b", ...];
if (motionKeys.includes(key)) {
    executeMotion(currentInput, key, count);
    const newPos = getCursorPos(currentInput);
    extendVisualSelection(..., newPos);
}
// No handling for f, t, F, T!
```

### Proposed Refactor

#### Option 1: Unified motion executor

Create a single motion processing function that both modes can use:

```typescript
// src/motions.ts (new file)
export function processMotion(
    key: string,
    currentInput: EditableElement,
    state: MotionState,
): MotionResult {
    // Handle all motions: h, j, k, l, w, b, e, f, t, F, T, etc.
    // Return: { newPos: number, commandBuffer: string, completed: boolean }
}

// src/visual.ts
const result = processMotion(key, currentInput, state);
if (result.completed) {
    extendVisualSelection(
        currentInput,
        mode,
        visualStart,
        visualEnd,
        result.newPos,
    );
}

// src/normal.ts
const result = processMotion(key, currentInput, state);
if (result.completed) {
    setCursorPos(currentInput, result.newPos);
}
```

#### Option 2: Motion command registry

Define motions declaratively and process them uniformly:

```typescript
interface MotionDef {
    keys: string[];
    requiresChar?: boolean; // For f, t, etc.
    execute: (input: EditableElement, count: number, char?: string) => number;
}

const motions: MotionDef[] = [
    { keys: ["h"], execute: (input, count) => getCursorPos(input) - count },
    { keys: ["l"], execute: (input, count) => getCursorPos(input) + count },
    { keys: ["f"], requiresChar: true, execute: (input, count, char) => findCharInLine(...) },
    // ...
];
```

#### Option 3 (RECOMMENDED): Extract motion execution to shared module

```typescript
// src/motions.ts
export function executeMotion(
    input: EditableElement,
    motion: string,
    count: number,
    state: MotionState,
): { pos: number; state: MotionState } {
    // All motion logic here
    // Returns new position and updated state
}

// Both normal.ts and visual.ts import and use this
```

### Benefits of Unified Approach

1. **Single source of truth**: Motion behavior defined once
2. **Consistency**: Same motion works identically in all modes
3. **Easier testing**: Test motion logic independently of mode
4. **Feature parity**: Visual mode automatically gets all motions
5. **Easier to add new motions**: Define once, works everywhere

### Migration Path

1. Extract current motion logic from `normal.ts` to new `motions.ts`
2. Update `executeMotion` in `normal.ts` to handle ALL motions including `f`, `t`, etc.
3. Update `visual.ts` to use the same `executeMotion` function
4. Add tests for all motions in both modes
5. Remove duplicated motion code

### Test Cases Needed

- [ ] `f{char}` in visual mode extends selection to character
- [ ] `t{char}` in visual mode extends selection to before character
- [ ] `F{char}` in visual mode extends selection backward to character
- [ ] `T{char}` in visual mode extends selection backward to after character
- [ ] `;` repeats last find in visual mode
- [ ] `,` reverses last find in visual mode
- [ ] Count prefix works: `3fa` finds 3rd 'a' in visual mode
- [ ] All existing normal mode motions work in visual mode

### Action Items

- [ ] Create comprehensive motion test suite
- [ ] Extract motion logic to shared module
- [ ] Update visual mode to support all motions
- [ ] Test f/t/F/T in visual mode
- [ ] Document motion system architecture
- [ ] Remove duplicated code

---

## Summary

Both issues stem from the same architectural problem: **mode-specific command handlers duplicate logic instead of sharing it**. The recommended long-term solution is to extract shared logic (state management, motions, operators) into separate modules that all mode handlers can use.
