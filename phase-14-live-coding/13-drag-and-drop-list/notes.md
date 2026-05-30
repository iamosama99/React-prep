# Drag and Drop List

## Quick Reference

| Event | Fires on | Purpose |
|---|---|---|
| `onDragStart` | The dragged element | Store dragged index |
| `onDragOver` | Potential drop target | `preventDefault()` to allow drop; track target index |
| `onDrop` | The drop target | Reorder the array |
| `onDragEnd` | The dragged element | Clean up visual state |
| `onDragEnter` | A potential drop target | Visual feedback (highlight) |
| `onDragLeave` | A potential drop target | Remove highlight |

---

## Why This Matters

Drag and drop tests the HTML5 DnD API, which has several non-obvious quirks interviewers use to filter candidates:

- You must call `e.preventDefault()` in `onDragOver` or the drop will not fire
- `onDragLeave` fires when hovering over child elements (needs special handling)
- The correct array reorder using `splice` has a subtle two-step (remove then insert)
- Visual state must be cleaned up in `onDragEnd` — not just `onDrop`

Interviewers also watch whether you reach for a library (react-dnd, dnd-kit) or implement the native HTML5 API from scratch. In a live coding round, always implement it from scratch unless explicitly told otherwise.

---

## Core Concepts

### 1. Making Elements Draggable

```tsx
<li
  draggable  // or draggable={true}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onDragEnd={handleDragEnd}
>
  {item}
</li>
```

All drag events use `React.DragEvent<HTMLElement>`. The `draggable` attribute is required on each item — without it, the element is not draggable.

---

### 2. Storing the Dragged Index

Use a ref, not state, for the dragged index. State updates cause re-renders; you don't want a re-render mid-drag — it can interrupt the drag operation.

```tsx
const dragIndex = useRef<number | null>(null);

function handleDragStart(index: number) {
  dragIndex.current = index;
}
```

**Why ref instead of state?** During a drag, React may schedule re-renders (e.g., from `dragOverIndex` state updates). If `dragIndex` is state, those re-renders might clear or conflict with the drag state. A ref is mutated synchronously and never causes re-renders.

---

### 3. The Critical: `onDragOver` Must Call `preventDefault`

```tsx
function handleDragOver(e: React.DragEvent, index: number) {
  e.preventDefault(); // REQUIRED — without this, onDrop never fires
  setDragOverIndex(index);
}
```

The browser's default behavior for `dragover` is to reject the drop (cursor shows "no drop" symbol). Calling `e.preventDefault()` signals that the element accepts the drop, changing the cursor and enabling the `drop` event to fire.

**Gotcha:** If you forget `e.preventDefault()` in `onDragOver`, `onDrop` will never fire.

---

### 4. Array Reorder on Drop

```tsx
function handleDrop(dropIndex: number) {
  if (dragIndex.current === null || dragIndex.current === dropIndex) {
    dragIndex.current = null;
    return;
  }

  setItems(prev => {
    const next = [...prev];
    // Step 1: remove the dragged item
    const [removed] = next.splice(dragIndex.current!, 1);
    // Step 2: insert at the target position
    next.splice(dropIndex, 0, removed);
    return next;
  });

  dragIndex.current = null;
}
```

**The two-step splice:** `splice(from, 1)` removes the element and returns it as an array `[element]`. Then `splice(to, 0, element)` inserts it at the target index. The insert must happen after the remove because removing the element shifts indices.

**Gotcha:** After `splice(dragIndex, 1)`, all indices above `dragIndex` shift down by 1. If `dropIndex > dragIndex`, the effective target is `dropIndex` (already correct because the splice returns the modified array). If `dropIndex < dragIndex`, the effective target is still `dropIndex`. The two-step splice naturally handles both cases correctly.

---

### 5. Visual Feedback: Drag Indicator

Show a visual indicator on the target position:

```tsx
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

// On each item:
style={{
  borderTop: dragOverIndex === i ? '2px solid #3b82f6' : '2px solid transparent',
  opacity: isDragging === i ? 0.4 : 1,
}}
```

The `opacity: 0.4` on the dragged item is a common convention — it visually removes it from its original position while still showing where it was.

---

### 6. Cleanup in `onDragEnd`

`onDragEnd` fires on the **dragged element** when the drag operation ends — whether or not a drop occurred. This is the place to clean up all visual state:

```tsx
function handleDragEnd() {
  dragIndex.current = null;
  setDragOverIndex(null);
  setIsDragging(null);
}
```

**Gotcha:** If you only clean up in `onDrop`, the visual indicators will persist if the user drops the element back to its original position or outside a valid target.

---

### 7. `onDragLeave` Quirk

`onDragLeave` fires when the cursor moves over any **child element** inside the drop target, not just when it fully leaves the target. This causes the highlight to flicker.

Fix using `relatedTarget`:

```tsx
function handleDragLeave(e: React.DragEvent) {
  // relatedTarget is the element the cursor moved INTO
  // If it's still inside this element, don't remove the highlight
  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  setDragOverIndex(null);
}
```

Or use a CSS `pointer-events: none` on children to prevent child elements from triggering `dragleave` on the parent — less common but cleaner for simple cases.

---

### 8. dataTransfer vs Ref

Two ways to pass data from `dragstart` to `drop`:

**Ref approach** (simpler, same-page only):
```tsx
const dragIndex = useRef<number | null>(null);
// dragstart: dragIndex.current = index
// drop: use dragIndex.current
```

**dataTransfer approach** (works across windows/origins):
```tsx
// dragstart:
e.dataTransfer.setData('text/plain', String(index));
e.dataTransfer.effectAllowed = 'move';
// drop:
const from = Number(e.dataTransfer.getData('text/plain'));
```

For same-page reordering in an interview, the ref approach is simpler and avoids the string-to-number conversion. Use `dataTransfer` when the drag source and drop target might be in different components or windows.

---

## Common Interview Gotchas

**Gotcha:** Forgetting `e.preventDefault()` in `onDragOver`. Without it, the drop event never fires.

**Gotcha:** Not resetting `dragIndex.current` after the drop. If you don't reset it, the next drop will use the stale index.

**Gotcha:** Using state for `dragIndex` instead of a ref. State updates can cause re-renders that interrupt the drag.

**Gotcha:** Calling `e.preventDefault()` in `onDragStart` — this would prevent the drag from starting in some browsers.

**Gotcha:** The `onDragLeave` flicker when hovering over child elements. Use `relatedTarget` check or set `pointer-events: none` on children.

**Gotcha:** Not cleaning up in `onDragEnd`. If the drag ends outside a valid target (drop on body, Escape key), `onDrop` doesn't fire but `onDragEnd` always does.

**Gotcha:** Mutating the `items` array directly instead of creating a copy. Always `[...items]` before splicing.

---

## Self-Assessment

- [ ] I can list the 5 key DnD events and what each fires on
- [ ] I know why `e.preventDefault()` in `onDragOver` is required
- [ ] I can implement the two-step splice reorder from memory
- [ ] I know why dragIndex should be a ref, not state
- [ ] I understand the `onDragLeave` child-element quirk
- [ ] I know why cleanup goes in `onDragEnd`, not just `onDrop`

---

## Interview Q&A

**Q: Walk me through the HTML5 DnD events you'd use for a sortable list. `High`**

A: Five events. `draggable` attribute on each item makes it draggable. `onDragStart` on each item — I store the dragged item's index in a ref (not state, to avoid mid-drag re-renders). `onDragOver` on each item — I call `e.preventDefault()` (required for drop to work) and update a `dragOverIndex` state for visual highlighting. `onDrop` on each item — I read the stored index, reorder the array with a two-step splice, and reset state. `onDragEnd` on each item (fires on the source) — I clean up all visual state whether or not a valid drop occurred.

---

**Q: How do you reorder the array when an item is dropped? `High`**

A: Two-step splice on a copy of the array. First, `const [removed] = next.splice(dragIndex, 1)` — this removes the dragged item and returns it. Then `next.splice(dropIndex, 0, removed)` — this inserts it at the target position. The insert must come after the remove because removing the element shifts the indices of items above it. The two-step naturally handles both cases (dragging up and dragging down) without needing to adjust the target index.

---

**Q: Why must you call `preventDefault` in `onDragOver`? `Medium`**

A: The browser's default behavior for `dragover` is to signal "no drop allowed here" — the cursor shows a prohibited symbol and the `drop` event will not fire. Calling `e.preventDefault()` in `onDragOver` overrides that default, telling the browser this element accepts the drop. Without it, `onDrop` is never called. This is the single most common bug in DnD implementations.

---

**Q: Why use a ref for `dragIndex` instead of `useState`? `Medium`**

A: During a drag operation, other state updates (like `dragOverIndex`) cause re-renders. If `dragIndex` is state, React might schedule the re-render in a way that clears or batches the state update, causing you to lose the dragged index. A ref is mutated synchronously and doesn't cause re-renders — it holds its value reliably for the duration of the drag operation regardless of other state changes.

---

**Q: How do you handle the `onDragLeave` flickering issue? `Low`**

A: `onDragLeave` fires when the cursor moves over any child element inside the target, not just when it fully leaves. Fix it by checking `e.relatedTarget` — the element the cursor moved into. If `e.currentTarget.contains(e.relatedTarget as Node)` is true, the cursor is still inside the target (just moved to a child), so don't remove the highlight. Alternatively, for simple lists where items have no interactive children, set `pointerEvents: 'none'` on child elements to prevent them from triggering the leave event.
