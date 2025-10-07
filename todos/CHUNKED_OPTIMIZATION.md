# Chunked Line Numbers Optimization

## Problem

Currently, line numbers are debounced (50ms) which handles rapid operations well, but the entire line numbers column is re-rendered on every update. For very large textareas (1500+ lines), this means:

- Generating HTML for all line numbers
- Replacing the entire innerHTML
- Browser has to parse and render all DOM nodes

## Proposed Solution: Chunked Rendering with Incremental Updates

Split line numbers into chunks with relative numbering within each chunk, so we only update the affected chunks when text changes.

### Architecture

1. **Chunk Structure**
    - Divide line numbers into chunks of ~100 lines each
    - Each chunk is a separate DOM element
    - Store chunk boundaries (start line, end line)

2. **Change Detection**
    - When text changes, calculate which line range was affected
    - Only regenerate chunks that contain or are after the affected lines
    - Chunks before the change remain untouched

3. **Relative Numbering Within Chunks**
    - If relative line numbers are enabled, only chunks near the cursor need updates
    - Chunks far from cursor can cache their relative number offsets

### Benefits

- **Incremental updates**: Only regenerate changed chunks (e.g., 1-2 chunks instead of all 15 chunks for 1500 lines)
- **Reduced DOM operations**: Browser only re-renders changed chunks
- **Better cache locality**: Unchanged chunks stay in browser's render cache
- **Virtual scrolling potential**: Can later optimize to only render visible chunks

### Example Implementation Sketch

```typescript
interface LineNumberChunk {
    startLine: number;
    endLine: number;
    element: HTMLDivElement;
    cachedHTML: string;
}

class ChunkedLineNumbersRenderer {
    private chunks: LineNumberChunk[] = [];
    private chunkSize = 100;

    render(input, currentLine, totalLines) {
        // Determine which chunks need updating
        const affectedChunks = this.findAffectedChunks(currentLine, totalLines);

        // Only regenerate affected chunks
        for (const chunk of affectedChunks) {
            this.updateChunk(chunk, currentLine, totalLines);
        }
    }

    private findAffectedChunks(currentLine, totalLines) {
        // Find chunks that contain the current line (for highlighting)
        // Or chunks whose line count changed (for text edits)
        // Return only those chunks
    }
}
```

### Implementation Steps

1. Refactor `DOMLineNumbersRenderer` to use chunks
2. Implement chunk boundary calculation
3. Add change detection logic
4. Update only affected chunks on render
5. Add E2E tests for chunked rendering
6. Measure performance improvement

### Performance Targets

With chunking, we expect:

- Single line insert: Update 1-2 chunks (~1-2ms DOM update)
- 20 rapid pastes: Update 20 chunks over 50ms debounce period
- Large file (1500 lines): Only update visible/affected chunks

### Future Enhancements

- **Virtual scrolling**: Only render chunks in viewport + buffer
- **Web Worker**: Calculate line number HTML in background thread
- **RequestAnimationFrame**: Schedule updates during idle frames
