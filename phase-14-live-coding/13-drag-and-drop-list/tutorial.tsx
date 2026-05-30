// ============================================================
// Topic:   Drag and Drop List
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: basic DnD — reorder array, no visual feedback.
//   3. Exercise 2: add drag indicator + opacity on dragged item.
//   4. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 13-drag-and-drop-list
// ============================================================

import { useState, useRef, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Basic Draggable List (No Visual Feedback)
//
// The goal: make the list reorder correctly on drag-and-drop.
// No fancy styling needed yet — just get the logic right.
//
// TODO in handleDrop:
//   1. Guard: if dragIndex.current is null or equals dropIndex, return
//   2. Create a copy of items: const next = [...items]
//   3. Remove dragged item: const [removed] = next.splice(dragIndex.current, 1)
//   4. Insert at target: next.splice(dropIndex, 0, removed)
//   5. setItems(next)
//   6. Reset dragIndex.current = null
//
// CRITICAL: don't forget e.preventDefault() in onDragOver
// ─────────────────────────────────────────────────────────────

const INITIAL_ITEMS = ['React', 'TypeScript', 'Vite', 'Tailwind', 'Zustand', 'React Query'];

function DraggableList() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const dragIndex = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, _index: number) {
    // TODO: call e.preventDefault() — CRITICAL
    // Without this, onDrop will never fire
  }

  function handleDrop(dropIndex: number) {
    // TODO: implement the two-step splice reorder
    // Guard → copy array → splice out → splice in → setItems → reset
  }

  function handleDragEnd() {
    // TODO: reset dragIndex.current
    dragIndex.current = null;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, maxWidth: '400px' }}>
      {items.map((item, i) => (
        <li
          key={item}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            marginBottom: '0.5rem',
            cursor: 'grab',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            userSelect: 'none',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '1.1rem' }}>⠿</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — DnD List with Visual Feedback
//
// Add:
//   1. Opacity: 0.4 on the item currently being dragged
//      (track which index is being dragged with useState)
//   2. Drop indicator: blue border-top on the target item
//      (track dragOverIndex with useState)
//   3. Clear both in onDragEnd (not just onDrop)
//
// For the border indicator:
//   borderTop: dragOverIndex === i ? '2px solid #3b82f6' : '2px solid transparent'
// ─────────────────────────────────────────────────────────────

function DraggableListWithFeedback() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingIndex, setIsDraggingIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
    // TODO: setIsDraggingIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    // TODO: setDragOverIndex(index)
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex.current === null || dragIndex.current === dropIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      setIsDraggingIndex(null);
      return;
    }

    setItems(prev => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex.current!, 1);
      next.splice(dropIndex, 0, removed);
      return next;
    });

    dragIndex.current = null;
    // TODO: clear dragOverIndex and isDraggingIndex
  }

  function handleDragEnd() {
    dragIndex.current = null;
    // TODO: clear dragOverIndex and isDraggingIndex
    // This fires even if drop happened outside a valid target
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, maxWidth: '400px' }}>
      {items.map((item, i) => (
        <li
          key={item}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ddd',
            // TODO: borderTop — use dragOverIndex === i for the blue indicator
            borderTop: '1px solid #ddd', // replace with conditional
            borderRadius: '6px',
            marginBottom: '0.5rem',
            cursor: 'grab',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            userSelect: 'none',
            // TODO: opacity — 0.4 when this item is being dragged
            opacity: 1, // replace with conditional
            transition: 'opacity 0.15s, border-top 0.1s',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '1.1rem' }}>⠿</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete DnD list with:
//   - Correct two-step splice reorder
//   - dragIndex in a ref (not state)
//   - Drag indicator (blue border-top)
//   - Dragged item opacity
//   - dragEnd cleanup (handles drop outside valid target)
//   - onDragLeave with relatedTarget fix for flicker
//   - Reset button to restore original order
//   - Notes on dataTransfer vs ref approach
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

interface DnDItem {
  id: string;
  label: string;
  color: string;
}

const REF_ITEMS: DnDItem[] = [
  { id: '1', label: 'React', color: '#61dafb' },
  { id: '2', label: 'TypeScript', color: '#3178c6' },
  { id: '3', label: 'Vite', color: '#646cff' },
  { id: '4', label: 'Tailwind CSS', color: '#38bdf8' },
  { id: '5', label: 'Zustand', color: '#e97316' },
  { id: '6', label: 'React Query', color: '#ef4444' },
  { id: '7', label: 'Zod', color: '#1d4ed8' },
];

function ReferenceDraggableList() {
  const [items, setItems] = useState<DnDItem[]>(REF_ITEMS);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingIndex, setIsDraggingIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
    setIsDraggingIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault(); // REQUIRED — enables onDrop to fire
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if we actually left the list item (not just moved to a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  }

  function handleDrop(dropIndex: number) {
    if (dragIndex.current === null || dragIndex.current === dropIndex) {
      cleanup();
      return;
    }

    setItems(prev => {
      const next = [...prev];
      // Step 1: remove the dragged item
      const [removed] = next.splice(dragIndex.current!, 1);
      // Step 2: insert at target position
      next.splice(dropIndex, 0, removed);
      return next;
    });

    cleanup();
  }

  function handleDragEnd() {
    // Fires when drag ends, whether or not drop was valid
    // This is the safety net — cleans up even if user drops outside the list
    cleanup();
  }

  function cleanup() {
    dragIndex.current = null;
    setDragOverIndex(null);
    setIsDraggingIndex(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>Drag items to reorder</span>
        <button
          onClick={() => setItems(REF_ITEMS)}
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}
        >
          Reset order
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, maxWidth: '420px' }}>
        {items.map((item, i) => {
          const isOver = dragOverIndex === i;
          const isDragging = isDraggingIndex === i;
          return (
            <li
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderTop: isOver ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '6px',
                marginBottom: '0.4rem',
                cursor: isDragging ? 'grabbing' : 'grab',
                background: isDragging ? '#f0f9ff' : '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                userSelect: 'none',
                opacity: isDragging ? 0.4 : 1,
                transition: 'opacity 0.15s, border-top 0.1s, background 0.1s',
                boxShadow: isDragging ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ color: '#9ca3af', fontSize: '1.1rem', flexShrink: 0 }}>⠿</span>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#d1d5db', fontFamily: 'monospace' }}>
                #{i + 1}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Drag and Drop List</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Implement a sortable list using the HTML5 Drag and Drop API.
      The critical rule: <code>e.preventDefault()</code> in <code>onDragOver</code> is required for <code>onDrop</code> to fire.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Basic DnD (Reorder, No Visual Feedback)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in <code>handleDragOver</code> (the preventDefault) and <code>handleDrop</code>
          (the two-step splice reorder). Don't worry about visual indicators yet.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <DraggableList />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Drag React to the bottom. Drag TypeScript to the top.
          The order should update after each drop. If nothing happens on drop, you probably forgot <code>e.preventDefault()</code>.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — DnD with Visual Feedback</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Add the drag indicator (blue border-top on target), opacity on the dragged item,
          and cleanup in <code>onDragEnd</code>.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <DraggableListWithFeedback />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>The item you start dragging should turn transparent (opacity 0.4)</li>
            <li>A blue line should appear above the item you hover over</li>
            <li>Both visual states should disappear on drop AND when dragging ends</li>
          </ul>
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Full solution with all visual feedback, onDragLeave flickering fix, color dots,
          position counter, and reset button. Read this only after attempting the exercises.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <ReferenceDraggableList />
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li><code>dragIndex</code> is a ref — doesn't cause re-renders mid-drag</li>
            <li><code>onDragLeave</code> checks <code>relatedTarget</code> to prevent flickering when hovering child elements</li>
            <li><code>onDragEnd</code> calls <code>cleanup()</code> — fires even when dropped outside the list</li>
            <li>The position counter (<code>#{'{i + 1}'}</code>) makes it easy to verify the reorder worked</li>
            <li>Border changes from <code>1px</code> to <code>3px</code> for the indicator — causes layout shift, a minor UX compromise for simplicity</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
