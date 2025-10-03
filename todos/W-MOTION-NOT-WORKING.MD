# Fix: W motion doesn't work

The `W` (WORD) motion doesn't work properly.

## Current Behavior

- Press `W`
- Doesn't work or has unexpected behavior

## Expected Behavior

- `W` should move forward to the start of the next WORD
- WORD is defined as a sequence of non-whitespace characters
- Different from `w` which stops at word boundaries (punctuation, etc.)

## Implementation Notes

- Check if `W` is implemented in `src/normal.ts`
- May need to implement if missing
- Should handle whitespace correctly
- Should differentiate from `w` behavior

## Testing

Create tests to verify:

- `W` moves to next WORD
- `W` treats punctuation differently than `w`
- `W` works across whitespace
- Works with counts (e.g., `3W`)
- Behavior matches vim's WORD motion
