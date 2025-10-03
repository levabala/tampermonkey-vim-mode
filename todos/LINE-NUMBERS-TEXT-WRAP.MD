# Line numbers column doesn't honor text wrap

The line numbers column doesn't properly handle text wrapping when wrap is enabled. This is likely a complex issue.

## Current Behavior

- When text wrap is on, line numbers don't align correctly with wrapped lines

## Expected Behavior

- Line numbers should account for wrapped lines
- Visual alignment should be maintained

## Notes

- This is a complex problem
- May require significant refactoring of line number rendering logic
- Consider edge cases with different wrap modes

## Testing

Create tests to verify:

- Line numbers align with wrapped text
- Works with different wrap settings
- Handles edge cases (very long lines, varying line lengths)
