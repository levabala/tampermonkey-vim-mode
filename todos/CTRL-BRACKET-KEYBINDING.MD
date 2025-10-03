# Fix: C-] sometimes doesn't work

Ctrl-] keybinding sometimes doesn't work. Need to ensure keybindings are stored in a single structure and processed together as a set of bindings.

## Current Behavior

- Ctrl-] works inconsistently
- May be due to keybindings being scattered across different handlers

## Expected Behavior

- Ctrl-] should work reliably in all modes
- Should behave like ESC (switch to normal mode, exit insert mode, etc.)

## Implementation Notes

- Consolidate keybinding definitions into a single structure
- Process all keybindings through a unified handler
- Ensure Ctrl-] and ESC are treated equivalently

## Testing

Create tests to verify:

- Ctrl-] works in insert mode
- Ctrl-] works in visual mode
- Ctrl-] works in all contexts where ESC works
- Behavior is consistent across different scenarios
