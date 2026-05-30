// ============================================================
// Topic:   Star Rating
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: implement BasicStarRating (hover + click).
//   3. Exercise 2: add ARIA + keyboard accessibility.
//   4. Exercise 3: implement read-only display rating.
//   5. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 10-star-rating
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Basic Star Rating (Mouse Only)
//
// Implement hover preview + click to commit.
//
// TODO:
//   1. Add onMouseEnter to each star → setHovered(star)
//   2. Add onClick to each star → onChange(star)
//   3. Display filled (★) or empty (☆) based on displayValue
//      (displayValue = hovered ?? value)
//   4. Container onMouseLeave → setHovered(null)
//
// The star characters: filled = '★' (U+2605), empty = '☆' (U+2606)
// ─────────────────────────────────────────────────────────────

function BasicStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  // TODO: compute displayValue using nullish coalescing
  const displayValue = 0; // replace with: hovered ?? value

  return (
    // TODO: add onMouseLeave to the container
    <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          // TODO: onMouseEnter, onClick
          style={{
            fontSize: '2rem',
            cursor: 'pointer',
            color: star <= displayValue ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.1s',
            lineHeight: 1,
          }}
        >
          {/* TODO: show ★ when filled, ☆ when empty */}
          ☆
        </span>
      ))}
    </div>
  );
}

// Demo for Exercise 1
function BasicStarRatingDemo() {
  const [rating, setRating] = useState(0);
  return (
    <div>
      <BasicStarRating value={rating} onChange={setRating} />
      <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.9rem' }}>
        Selected: <strong>{rating === 0 ? 'none' : `${rating} star${rating === 1 ? '' : 's'}`}</strong>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Accessible Star Rating (ARIA + Keyboard)
//
// Build on the basic version with full accessibility:
//   - role="radiogroup" on the container
//   - role="radio" + aria-checked + aria-label on each star
//   - tabIndex={0} on the container, tabIndex={-1} on stars
//   - onKeyDown: ArrowRight/Up → +1, ArrowLeft/Down → -1,
//                Home → 1, End → 5
//   - preventDefault on all handled keys
// ─────────────────────────────────────────────────────────────

function AccessibleStarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  function handleKeyDown(e: React.KeyboardEvent) {
    // TODO: handle ArrowRight, ArrowUp → increase (max 5)
    // TODO: handle ArrowLeft, ArrowDown → decrease (min 0)
    // TODO: handle Home → set to 1
    // TODO: handle End → set to 5
    // TODO: call e.preventDefault() for all handled keys
  }

  return (
    <div>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#555' }}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'inline-flex',
          gap: '0.25rem',
          outline: 'none',
          borderRadius: '4px',
          // TODO: add focus indicator (e.g., box-shadow on :focus-visible)
          // You'll need CSS or a focus state for this
        }}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            tabIndex={-1}
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
            style={{
              fontSize: '2rem',
              cursor: 'pointer',
              color: star <= displayValue ? '#f59e0b' : '#d1d5db',
              transition: 'color 0.1s',
              lineHeight: 1,
            }}
          >
            {star <= displayValue ? '★' : '☆'}
          </span>
        ))}
      </div>
      <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.85rem' }}>
        Rating: <strong>{value === 0 ? 'none' : `${value}/5`}</strong>
        <span style={{ color: '#aaa' }}> (Tab to focus, then use arrow keys)</span>
      </p>
    </div>
  );
}

// Demo for Exercise 2
function AccessibleStarRatingDemo() {
  const [rating1, setRating1] = useState(3);
  const [rating2, setRating2] = useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <AccessibleStarRating value={rating1} onChange={setRating1} label="Product quality" />
      <AccessibleStarRating value={rating2} onChange={setRating2} label="Shipping experience" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Read-Only Rating Display
//
// Render a non-interactive star rating (e.g., average review score).
//
// ARIA pattern changes:
//   - role="img" on the container (not radiogroup)
//   - aria-label="4.2 out of 5 stars" on the container
//   - aria-hidden="true" on each star span (decorative)
//   - No tabIndex, no event handlers
//
// TODO: implement ReadOnlyStarRating
// ─────────────────────────────────────────────────────────────

function ReadOnlyStarRating({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(value);

  return (
    // TODO: role="img", aria-label describing the value
    <div style={{ display: 'inline-flex', gap: '0.15rem', alignItems: 'center' }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span
          key={star}
          // TODO: aria-hidden="true"
          style={{
            fontSize: '1.25rem',
            color: star <= rounded ? '#f59e0b' : '#d1d5db',
            lineHeight: 1,
          }}
        >
          {star <= rounded ? '★' : '☆'}
        </span>
      ))}
      <span style={{ marginLeft: '0.35rem', fontSize: '0.9rem', color: '#666' }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete star rating with:
//   - Two-state design (selected + hovered)
//   - Container onMouseLeave
//   - ARIA: radiogroup, radio, aria-checked, aria-label
//   - Keyboard: ArrowRight/Left/Up/Down, Home, End
//   - Focus ring via box-shadow
//   - Read-only variant with role="img"
//   - Configurable max stars and size
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  max?: number;
  size?: string;
  allowClear?: boolean; // click same star again to clear
}

function ReferenceStarRating({
  value,
  onChange,
  label,
  max = 5,
  size = '2rem',
  allowClear = true,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const displayValue = hovered ?? value;

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        onChange(Math.min(max, value + 1));
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        onChange(Math.max(0, value - 1));
        break;
      case 'Home':
        e.preventDefault();
        onChange(1);
        break;
      case 'End':
        e.preventDefault();
        onChange(max);
        break;
    }
  }

  function handleClick(star: number) {
    if (allowClear && star === value) {
      onChange(0); // click same star to clear
    } else {
      onChange(star);
    }
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'inline-flex',
          gap: '0.2rem',
          outline: 'none',
          borderRadius: '6px',
          boxShadow: focused ? '0 0 0 3px rgba(59, 130, 246, 0.4)' : 'none',
          padding: '2px',
        }}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map(star => {
          const filled = star <= displayValue;
          return (
            <span
              key={star}
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
              tabIndex={-1}
              onMouseEnter={() => setHovered(star)}
              onClick={() => handleClick(star)}
              style={{
                fontSize: size,
                cursor: 'pointer',
                color: filled ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.1s, transform 0.1s',
                transform: star === hovered ? 'scale(1.15)' : 'scale(1)',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {filled ? '★' : '☆'}
            </span>
          );
        })}
      </div>
      <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
        {value === 0 ? 'No rating' : `${value} / ${max}`}
      </span>
    </div>
  );
}

function ReferenceReadOnlyStarRating({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(value);
  return (
    <div
      role="img"
      aria-label={`${value} out of ${max} stars`}
      style={{ display: 'inline-flex', gap: '0.15rem', alignItems: 'center' }}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span
          key={star}
          aria-hidden="true"
          style={{ fontSize: '1.25rem', color: star <= rounded ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}
        >
          {star <= rounded ? '★' : '☆'}
        </span>
      ))}
      <span style={{ marginLeft: '0.35rem', fontSize: '0.9rem', color: '#555' }}>
        {value.toFixed(1)} / {max}
      </span>
    </div>
  );
}

function ReferenceDemo() {
  const [quality, setQuality] = useState(4);
  const [shipping, setShipping] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#555' }}>Product Quality (interactive)</p>
        <ReferenceStarRating value={quality} onChange={setQuality} label="Product quality" allowClear />
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#aaa' }}>Click the same star again to clear. Tab to focus, use arrow keys.</p>
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#555' }}>Shipping Experience (interactive)</p>
        <ReferenceStarRating value={shipping} onChange={setShipping} label="Shipping experience" />
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#555' }}>Average Review Score (read-only)</p>
        <ReferenceReadOnlyStarRating value={4.2} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#555' }}>10-star scale (read-only)</p>
        <ReferenceReadOnlyStarRating value={7.5} max={10} />
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Star Rating</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Implement a star rating component with hover preview, click to commit, keyboard accessibility,
      and a read-only display variant.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Basic Star Rating (Mouse Only)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in the TODOs: hover state, displayValue calculation, filled/empty star display,
          container onMouseLeave. No ARIA or keyboard yet.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <BasicStarRatingDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Hovering over star 3 should fill stars 1, 2, 3 in gold.
          Moving the mouse off the widget should revert to the clicked value.
          Clicking star 4 should permanently set it even after you move the mouse away.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — Accessible Star Rating (ARIA + Keyboard)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Add ARIA attributes and keyboard navigation. Tab into the widget, then use
          arrow keys to change the rating. The widget should have a focus ring.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <AccessibleStarRatingDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Tab to focus the widget — it should show a focus ring.
          ArrowRight increases rating. ArrowLeft decreases. Home sets to 1. End sets to 5.
          Inspect in DevTools: each star should have <code>role="radio"</code> and <code>aria-checked</code>.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 3 — Read-Only Rating Display</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Complete the <code>ReadOnlyStarRating</code> — add the correct ARIA for a display-only widget
          (<code>role="img"</code>, descriptive <code>aria-label</code>, <code>aria-hidden</code> on star spans).
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><span style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.75rem' }}>4.2 avg:</span><ReadOnlyStarRating value={4.2} /></div>
            <div><span style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.75rem' }}>2.7 avg:</span><ReadOnlyStarRating value={2.7} /></div>
            <div><span style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.75rem' }}>5.0 avg:</span><ReadOnlyStarRating value={5.0} /></div>
          </div>
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Inspect in DevTools — the container should have <code>role="img"</code>
          and <code>aria-label="4.2 out of 5 stars"</code>. Each star span should have <code>aria-hidden="true"</code>.
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Full solution with all features: hover preview, keyboard nav, focus ring, clear-on-reclick,
          configurable max, read-only variant. Read this only after attempting the exercises.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <ReferenceDemo />
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Focus ring via <code>boxShadow</code> (CSS outline suppressed with <code>outline:none</code>, box-shadow used instead)</li>
            <li>Scale transform on hovered star for a subtle scale-up effect</li>
            <li><code>allowClear</code> prop — click the same star to reset to 0</li>
            <li>Read-only uses <code>role="img"</code> with a human-readable <code>aria-label</code></li>
            <li>Individual stars get <code>aria-hidden="true"</code> in read-only mode — screen reader reads only the container label</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
