# Test Structure

Tests are organized to match the source code architecture:

## Directory Structure

```
test/
├── setup/              # Setup, initialization, and mode switching tests
│   ├── test-helpers.js # Shared test utilities
│   ├── mode-switching.test.js
│   └── version.test.js
├── common/             # Shared utility function tests
│   ├── text-objects.test.js
│   └── undo-redo.test.js
├── normal/             # Normal mode command tests
│   ├── motions.test.js
│   ├── operators.test.js
│   └── insert-commands.test.js
└── visual/             # Visual mode tests (future)
```

## Running Tests

```bash
bun test                    # Run all tests
bun test setup             # Run only setup tests
bun test normal            # Run only normal mode tests
bun test test/normal/motions  # Run specific test file
```

## Test Helpers

The `setup/test-helpers.js` file provides shared utilities:

- `setupVimMode()` - Loads and initializes the vim mode script
- `createTestElements()` - Creates test input/textarea elements
- `cleanupTestElements()` - Cleans up test elements
- `getIndicator()` - Gets the mode indicator element
- `getModeText()` - Gets the current mode text from indicator

## Adding New Tests

1. Create a new test file in the appropriate directory
2. Import helpers from `../setup/test-helpers.js`
3. Follow the existing test structure with beforeEach/afterEach
