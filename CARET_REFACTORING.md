# Caret Positioning Refactoring

## Overview

This refactoring separates caret positioning logic from rendering implementation, making the caret system testable and easier to debug.

## Architecture

### New Interfaces (types.ts)

1. **CaretPosition**: Represents the calculated position and dimensions of the caret

    ```typescript
    interface CaretPosition {
        x: number;
        y: number;
        width: number;
        height: number;
    }
    ```

2. **CaretRenderer**: Abstract interface for rendering the caret

    ```typescript
    interface CaretRenderer {
        show(position: CaretPosition): void;
        hide(): void;
        isActive(): boolean;
    }
    ```

3. **TextMetrics**: Abstract interface for measuring text
    ```typescript
    interface TextMetrics {
        measureText(text: string): number;
        getCharWidth(char: string): number;
        getFontSize(): number;
        getLineHeight(): number;
    }
    ```

### Implementation (common.ts)

1. **DOMTextMetrics**: Canvas-based text measurement implementation
    - Uses HTML5 Canvas API for accurate text measurements
    - Handles font properties from input element styles

2. **DOMCaretRenderer**: DOM-based caret rendering implementation
    - Creates and manages the visual caret element
    - Supports show/hide/destroy operations

3. **calculateCaretPosition()**: Pure function that calculates caret position
    - Takes an input element and TextMetrics interface
    - Returns CaretPosition object
    - Handles both single-line inputs and multi-line textareas
    - Accounts for scroll offsets and padding

### Benefits

1. **Testability**: Position calculation can now be tested without DOM rendering
2. **Separation of Concerns**: Logic is separated from presentation
3. **Flexibility**: Easy to swap out rendering implementations (e.g., for testing or different rendering strategies)
4. **Debugging**: Position data can be inspected independently of rendering

## Testing

The new test file `test/caret.test.ts` includes:

1. **MockTextMetrics**: Simple test implementation with fixed measurements
2. **MockCaretRenderer**: Test implementation that tracks position changes
3. **Position Calculation Tests**:
    - Single-line inputs (start, middle, end positions)
    - Multi-line textareas
    - Scroll offset handling
    - Edge cases (special characters, emoji, out-of-bounds positions)
4. **Renderer Tests**:
    - Show/hide state management
    - DOM element creation and positioning
    - Cleanup on destroy

## Migration Notes

The refactoring maintains backward compatibility:

- `createCustomCaret()` accepts an optional `CaretRenderer` parameter
- `updateCustomCaret()` accepts an optional `TextMetrics` parameter
- Both functions use sensible defaults (DOMCaretRenderer, DOMTextMetrics) when parameters are omitted
- The existing `customCaret` variable is maintained for backward compatibility

## Usage Examples

### Standard Usage (No Changes Required)

```typescript
createCustomCaret(input);
updateCustomCaret(input);
removeCustomCaret(input);
```

### Testing with Mocks

```typescript
const mockMetrics = new MockTextMetrics(16, 19.2, 8);
const mockRenderer = new MockCaretRenderer();
const position = calculateCaretPosition(input, mockMetrics);
mockRenderer.show(position);
expect(mockRenderer.getLastPosition()).toEqual({
    x: 10,
    y: 20,
    width: 8,
    height: 16,
});
```

### Custom Renderer

```typescript
class CustomRenderer implements CaretRenderer {
    show(position: CaretPosition): void {
        // Custom rendering logic
    }
    hide(): void {}
    isActive(): boolean {
        return true;
    }
}

const renderer = new CustomRenderer();
createCustomCaret(input, renderer);
```

## Future Improvements

1. **Performance**: Cache TextMetrics instances to avoid recreating canvas contexts
2. **Accuracy**: Improve multi-line position calculation for complex wrapping scenarios
3. **Features**: Support different caret styles (block, underline, vertical bar)
4. **Accessibility**: Add ARIA attributes to the caret element
