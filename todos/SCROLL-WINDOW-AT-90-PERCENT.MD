# Scroll window as caret reaches 90% of screen

Implement scrolling behavior that keeps the caret visible by scrolling the window when the caret position reaches 90% of the viewport height.

## Requirements

- Scroll should happen in the same snap-like way as caret movement
- Should trigger when caret is at 90% vertical position in the viewport
- Maintain smooth user experience consistent with vim behavior

## Testing

Create tests to verify:

- Scrolling triggers at correct viewport percentage
- Scroll amount is appropriate
- Works with different viewport sizes
