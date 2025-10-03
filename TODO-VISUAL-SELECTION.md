# Visual Selection Rendering Issues

## Overlapping Selection Rectangles

### Current Problem

When visual selection spans multiple lines, the individual selection rectangles overlap, creating dark zones between lines. This is likely caused by:

1. **Border overlap**: Each rectangle has a `1px solid rgba(80, 120, 255, 0.5)` border
2. **Rectangle positioning**: Adjacent line rectangles may overlap vertically due to line height calculations
3. **Alpha blending**: Multiple overlapping semi-transparent layers (`rgba(80, 120, 255, 0.3)`) accumulate, creating darker areas

### Visual Evidence

When selecting across multiple lines:

```
Line 1: [████████████] ← Rectangle 1
Line 2: [████████████] ← Rectangle 2
        ↑
        Dark zone where borders/backgrounds overlap
```

### Current Implementation

In `src/common.ts`, `DOMVisualSelectionRenderer.render()`:

```typescript
div.style.backgroundColor = "rgba(80, 120, 255, 0.3)";
div.style.border = "1px solid rgba(80, 120, 255, 0.5)";
```

Each line gets its own div with background and border, causing overlap.

### Proposed Solutions

#### Option 1: Remove borders between lines

- Only add top border on first rectangle
- Only add bottom border on last rectangle
- No borders on middle rectangles
- This prevents border overlap but still allows background overlap

#### Option 2: Use single container with outline

- Create one parent div for entire selection
- Use `outline` instead of `border` (doesn't affect layout/overlap)
- May be complex for non-contiguous selections

#### Option 3: Adjust rectangle positions to prevent overlap

- Calculate exact line height and positioning
- Ensure rectangles are exactly adjacent, not overlapping
- May require more precise measurement

#### Option 4: Use SVG instead of divs

- Render selection as SVG paths
- Can create continuous path across lines without overlap
- Single stroke/fill for entire selection
- More complex but more flexible

#### Option 5 (RECOMMENDED): Smart border rendering

```typescript
render(rects: SelectionRect[]): void {
    this.clear();

    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${rect.x}px`;
        div.style.top = `${rect.y}px`;
        div.style.width = `${rect.width}px`;
        div.style.height = `${rect.height}px`;
        div.style.backgroundColor = "rgba(80, 120, 255, 0.3)";

        // Only add borders that don't overlap with adjacent rectangles
        if (i === 0) {
            // First rectangle: top, left, right borders
            div.style.borderTop = "1px solid rgba(80, 120, 255, 0.5)";
            div.style.borderLeft = "1px solid rgba(80, 120, 255, 0.5)";
            div.style.borderRight = "1px solid rgba(80, 120, 255, 0.5)";
        } else if (i === rects.length - 1) {
            // Last rectangle: bottom, left, right borders
            div.style.borderBottom = "1px solid rgba(80, 120, 255, 0.5)";
            div.style.borderLeft = "1px solid rgba(80, 120, 255, 0.5)";
            div.style.borderRight = "1px solid rgba(80, 120, 255, 0.5)";
        } else {
            // Middle rectangles: only left, right borders
            div.style.borderLeft = "1px solid rgba(80, 120, 255, 0.5)";
            div.style.borderRight = "1px solid rgba(80, 120, 255, 0.5)";
        }

        div.style.pointerEvents = "none";
        this.container.appendChild(div);
        this.rects.push(div);
    }
}
```

### Additional Considerations

1. **Background overlap**: Even without borders, semi-transparent backgrounds will still overlap. May need to:
    - Reduce rectangle height slightly to prevent overlap
    - Use `background-clip: padding-box`
    - Adjust vertical positioning

2. **Box-sizing**: Ensure `box-sizing: border-box` so borders don't expand rectangle size

3. **Line wrapping**: Handle cases where selection wraps within a single line (less common in textareas but possible)

### Testing Checklist

- [ ] Visual selection on single line (no overlap issue)
- [ ] Visual selection across 2 lines (check border between)
- [ ] Visual selection across 3+ lines (check all borders)
- [ ] Visual selection with different font sizes
- [ ] Visual selection in light theme
- [ ] Visual selection in dark theme
- [ ] Compare with native browser selection appearance

### Action Items

- [ ] Reproduce the dark zone issue visually
- [ ] Measure actual overlap distance
- [ ] Implement Option 5 (smart border rendering)
- [ ] Test across multiple lines
- [ ] Update visual selection tests
- [ ] Document final solution
