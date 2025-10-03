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

## Investigation Results (2025-10-04)

After investigating this issue and writing comprehensive tests:

### Current Implementation Analysis

The line numbers implementation (`DOMLineNumbersRenderer` in `src/common.ts:153-272`) already:

1. **Correctly shows one line number per logical line** (lines separated by `\n`)
    - This matches standard Vim behavior where line numbers don't repeat for wrapped portions

2. **Properly copies font and line-height properties** from the textarea
    - Lines 188-199: Matches `fontSize`, `fontFamily`, and `lineHeight`
    - This ensures visual alignment with the textarea's text

3. **Handles scroll synchronization** with wrapped text
    - Lines 238-260: Uses `translateY` to sync scroll position
    - Applies same `paddingTop` as textarea

### Test Results

All tests in `test/line-numbers.test.ts` pass, verifying:

- Line numbers render only for logical lines (not wrapped visual lines) ✓
- Font size and line-height match textarea ✓
- Scroll handling works with wrapped lines ✓
- Current line highlighting works with wrapped text ✓
- Relative line numbers work correctly ✓
- Mixed wrapped/non-wrapped lines handled properly ✓

### Conclusion

**The implementation appears to be working correctly according to Vim's expected behavior.**

Two possibilities:

1. **This is not actually a bug** - The behavior matches standard Vim (one line number per logical line)
2. **The bug only manifests in real browser usage** - jsdom tests may not catch layout-specific issues

### Recommendation

**Manual verification needed**: Test in an actual browser with:

- Very long lines that wrap multiple times
- Different textarea widths
- Different font sizes and line-heights
- Scrolling behavior with wrapped content

If no visual issues are found, this TODO can be closed as "working as intended".
