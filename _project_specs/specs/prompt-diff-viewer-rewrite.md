# PromptDiffViewer - Complete UI Rewrite

**Status**: BLOCKED - Needs UI Agent
**Priority**: High
**Component**: `components/prompt-diff-viewer.tsx`
**Test Page**: `/test-diff-viewer`

---

## Current Issues

1. **Horizontal scrollbar** - text gets cut off, ugly UX
2. **Text doesn't wrap** - characters displayed vertically when CSS forced
3. **No independent panel scroll** - both panels should scroll independently
4. **Edit mode not functional** - button shows toast but doesn't enable editing
5. **Poor visual separation** - panels not clearly distinguished
6. **Diff colors weak** - additions (green) and deletions (red) not prominent enough

---

## Requirements

### Layout
- [ ] Two side-by-side panels (50/50 width)
- [ ] Clear visual separator between panels (border or gap)
- [ ] Fixed header row with panel titles ("Current" / "Proposed")
- [ ] Sticky action buttons at bottom

### Text Handling
- [ ] Text wraps at panel edge (NO horizontal scroll)
- [ ] Each panel has INDEPENDENT vertical scroll
- [ ] If text fits in one panel but not the other, only the longer one scrolls
- [ ] Minimum height: 400px
- [ ] Maximum height: 70vh (responsive)

### Diff Visualization
- [ ] Deletions: Red background on LEFT panel (lines removed)
- [ ] Additions: Green background on RIGHT panel (lines added)
- [ ] Word-level highlighting for changes within a line
- [ ] Line numbers visible
- [ ] Unchanged lines shown in neutral color

### Edit Mode
- [ ] "Edit Before Approve" enables inline editing on RIGHT panel
- [ ] Textarea or contenteditable for manual prompt modification
- [ ] Save/Cancel buttons appear in edit mode
- [ ] Diff updates live as user edits

### Dark Mode
- [ ] All colors adapt to dark theme
- [ ] Maintain readability (contrast ratios)
- [ ] Use CSS variables from globals.css

---

## Technical Approach Options

### Option A: Custom Implementation (Recommended)
Build from scratch without react-diff-viewer:
- Two `<pre>` or `<textarea>` elements
- Use `diff` npm package for computing differences
- Custom rendering with Tailwind classes
- Full control over layout

### Option B: Different Library
Try alternatives:
- `monaco-editor` diff view (VS Code style)
- `diff2html` with custom styling
- `react-diff-view` (GitHub style)

### Option C: Fix react-diff-viewer-continued
- Override all internal styles
- May require forking the library
- High effort, fragile

---

## Mock Data for Testing

```typescript
const OLD_PROMPT = `You are a medical appointment assistant...`;
const NEW_PROMPT = `You are a medical appointment assistant...efficiently...`;
```

See `/app/test-diff-viewer/page.tsx` for full test data.

---

## Acceptance Criteria

1. No horizontal scrollbar under any circumstance
2. Text readable without truncation
3. Clear visual diff (red removals, green additions)
4. Works in both light and dark mode
5. Edit mode allows manual prompt modification
6. Responsive on different screen sizes

---

## Files to Modify

- `components/prompt-diff-viewer.tsx` - Main component (rewrite)
- `app/globals.css` - Remove any diff-related CSS hacks
- `app/test-diff-viewer/page.tsx` - Keep as test page

---

## Notes from Failed Attempts

- `table-layout: fixed` breaks the library's internal table
- `white-space: pre-wrap` causes vertical character display
- `overflow-x: hidden` cuts off content without wrapping
- The library generates complex nested tables that resist CSS overrides

**Conclusion**: A custom implementation is likely faster than fighting the library.
