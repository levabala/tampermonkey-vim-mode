# Fix: w doesn't work on empty lines

The `w` motion doesn't work on empty lines. It should jump to the next non-whitespace character on the next line.

## Current Behavior

- Cursor on empty line
- Press `w`
- Nothing happens or unexpected behavior

## Expected Behavior

- Cursor on empty line
- Press `w`
- Jump to next non-whitespace character on next line
- If next line is also empty, continue to following line

## Implementation Notes

- Check `w` motion implementation in `src/normal.ts`
- Should handle empty lines and whitespace-only lines
- Should match vim behavior

## Testing

Create tests to verify:

- `w` on empty line jumps to next non-empty line
- `w` on whitespace-only line works correctly
- Multiple consecutive empty lines are handled
- Works with counts (e.g., `3w` across empty lines)
