# Fix: Focus on window triggers unwanted insert mode switch

Focusing on the window triggers focus on an already-focused input, which causes an unwanted switch to insert mode even if the input was already focused in another mode (e.g., normal or visual).

## Current Behavior

- Input is focused in normal/visual mode
- Window receives focus
- Input receives focus event
- Mode switches to insert mode unexpectedly

## Expected Behavior

- Window focus should not trigger mode changes
- Input should maintain current mode when already focused

## Testing

Create tests to verify:

- Window focus doesn't change mode when input already focused
- Works correctly from normal mode
- Works correctly from visual mode
- Initial focus still properly enters insert mode
