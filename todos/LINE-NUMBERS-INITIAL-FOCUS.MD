# Fix: Line numbers column doesn't appear on initial focus

The line numbers column doesn't appear when initially focusing into insert mode, but appears later. This should be fixed so it appears immediately.

## Current Behavior

- Focus input in insert mode → no line numbers column
- Later interaction → line numbers column appears

## Expected Behavior

- Focus input in insert mode → line numbers column appears immediately

## Testing

Create tests to verify:

- Line numbers column renders on initial focus
- Column appears in insert mode
- Column styling is correct from the start
