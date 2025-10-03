# Fix: ESC/C-] in visual mode shouldn't blur

When pressing ESC or Ctrl-] in visual mode, the input shouldn't blur. Instead, it should switch to normal mode while maintaining focus.

## Current Behavior

- Press ESC or Ctrl-] in visual mode
- Input loses focus (blurs)

## Expected Behavior

- Press ESC or Ctrl-] in visual mode
- Mode switches to normal mode
- Input remains focused

## Testing

Create tests to verify:

- ESC in visual mode switches to normal without blur
- Ctrl-] in visual mode switches to normal without blur
- Focus is maintained after mode switch
- Selection is cleared appropriately
