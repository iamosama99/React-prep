// ============================================================
// Topic:   Synthetic Events
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useEffect, useRef } from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// EVENT INSPECTOR — Make every event property visible
//
// Build an interactive event inspector. When you interact with the demo area,
// the inspector shows you exactly what's in the SyntheticEvent object.
//
// WHAT TO BUILD:
//
// EventInspector — a stateful component
//   Has a "demo area" with several interactive elements:
//     □ A button (click)
//     □ A text input (change, focus, blur)
//     □ A form (submit — use preventDefault!)
//
//   Each element's event handler calls a shared handleEvent(e) function.
//
//   handleEvent(e) captures and displays:
//     □ e.type              — event type ('click', 'change', etc.)
//     □ e.target.tagName    — which element fired it
//     □ e.target.value      — value (for inputs)
//     □ e.currentTarget === e.target  — are they the same here?
//     □ typeof e.nativeEvent — should be 'object'
//     □ e.bubbles           — does this event bubble?
//
//   Display all of this in a <pre> panel below the demo area.
//   Update it on every event.
//
// WHAT TO OBSERVE:
//   - 'change' on the input fires on EVERY keystroke (not on blur like native change)
//   - nativeEvent is always there — the real underlying browser event
//   - e.type changes with each interaction

function Exercise1() {
  const [info, setInfo] = useState(null);

  function handleEvent(e) {
    // TODO: capture event properties and setInfo
    // Don't forget to call e.preventDefault() for the form submit
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        {/* TODO: add interactive elements here — button, input, form */}
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Add a button, input, and form here — each calls handleEvent
        </p>
      </div>

      {info ? (
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: 8, fontSize: '0.8rem', overflowX: 'auto' }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      ) : (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Interact with the elements above to inspect the SyntheticEvent.
        </p>
      )}
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// PROPAGATION PLAYGROUND — stopPropagation, preventDefault, return false
//
// This exercise makes the three most important event behaviors tangible.
// You will demonstrate each one by clicking through a nested layout and
// observing which handlers fire.
//
// SETUP (already provided): Three nested divs — Outer > Middle > Inner.
//   Each has an onClick. There is also a link that navigates on click.
//   A log panel shows which handlers fired in order.
//
// YOUR TASKS — add handlers for each button below:
//
// Button 1 — "Click Inner (no stop)":
//   No stopPropagation. Click Inner div. Which handlers fire? ___
//   Order: ___
//
// Button 2 — "stopPropagation in Middle":
//   Add e.stopPropagation() in the Middle div's onClick.
//   Click Inner. Which handlers fire now? ___
//   Prediction: does Outer fire? ___
//
// Button 3 — "preventDefault on link":
//   The link below navigates to "#test" by default.
//   Add e.preventDefault() in its onClick handler.
//   Click it. Does the URL change? ___
//   Does the click handler still fire? ___
//
// Button 4 — "return false from handler":
//   Change the link's onClick to: return false
//   Does the URL change this time? ___
//   MORAL: return false does NOT prevent default in React (unlike vanilla JS).
//
// DISCUSS: After observing all four, write a one-line summary for each:
//   stopPropagation: ___
//   preventDefault: ___
//   return false: ___

function Exercise2() {
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog(prev => [msg, ...prev].slice(0, 8));
  const clearLog = () => setLog([]);

  // Outer / Middle / Inner divs — add onClick handlers that call addLog
  // Then experiment with stopPropagation / preventDefault / return false

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      {/* Nested click area */}
      <div>
        <div
          onClick={() => addLog('OUTER clicked')}
          style={{ padding: '1rem', background: '#fef9c3', border: '2px solid #fde047', borderRadius: 8, cursor: 'pointer' }}
        >
          Outer
          <div
            onClick={(e) => {
              // TODO Part 2: add e.stopPropagation() here
              addLog('MIDDLE clicked');
            }}
            style={{ padding: '1rem', background: '#dbeafe', border: '2px solid #93c5fd', borderRadius: 6, cursor: 'pointer' }}
          >
            Middle
            <div
              onClick={() => addLog('INNER clicked')}
              style={{ padding: '0.75rem', background: '#dcfce7', border: '2px solid #86efac', borderRadius: 4, cursor: 'pointer' }}
            >
              Inner (click me)
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          {/* TODO Part 3 & 4: add onClick with preventDefault, then try return false */}
          <a href="#test" style={{ color: '#3b82f6' }}>
            Link — does it navigate? (add onClick here)
          </a>
        </div>
      </div>

      {/* Log panel */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <strong>Event log (newest first):</strong>
          <button onClick={clearLog} style={{ fontSize: '0.75rem' }}>Clear</button>
        </div>
        {log.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click something above</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {log.map((entry, i) => (
              <li key={i} style={{ fontSize: '0.85rem', padding: '0.2rem 0', borderBottom: '1px solid #f1f5f9' }}>
                {entry}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// CLICK-OUTSIDE TO CLOSE — The delegation-aware dropdown
//
// Build a dropdown that closes when you click anywhere outside it.
// This is one of the most common real-world uses of event knowledge.
//
// WHAT TO BUILD:
//
// Dropdown — a button that toggles a menu panel
//   □ "Options ▼" button toggles the menu open/closed
//   □ When open, shows a menu panel with 3 items: Edit, Duplicate, Delete
//   □ Clicking a menu item logs the action and closes the menu
//   □ Clicking OUTSIDE the dropdown (anywhere else on the page) closes it
//
// HOW TO DETECT "OUTSIDE":
//   Use a useRef on the dropdown's wrapper div.
//   In a useEffect, add a mousedown listener to document.
//   In that listener: if !dropdownRef.current.contains(event.target), close the menu.
//   Clean up the listener on unmount.
//
// WHY mousedown (not click):
//   mousedown fires before click — it lets you close the dropdown before the
//   click event reaches any element that might re-open it.
//
// IMPORTANT — React 17+ delegation note:
//   React attaches synthetic events to the React root, not document.
//   Our document.addEventListener is a NATIVE listener — it runs at the document level.
//   This means our native listener fires AFTER React's synthetic events bubble up.
//   If we used document.addEventListener('click'), it might conflict with
//   the button's React onClick. mousedown avoids this timing issue.
//
// VERIFY:
//   □ Open the menu by clicking the button
//   □ Click a menu item — logs the action + closes
//   □ Click anywhere outside the dropdown — closes
//   □ Click the button again while open — closes (toggle)

const MENU_ITEMS = ['Edit', 'Duplicate', 'Delete'];

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // TODO: useEffect that adds a document mousedown listener
  // Close when the click target is outside dropdownRef.current
  // Remember to return a cleanup function

  function handleItemClick(item) {
    console.log(`Action: ${item}`);
    setIsOpen(false);
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setIsOpen(prev => !prev)}>
        Options {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '4px 0',
          margin: '4px 0 0',
          listStyle: 'none',
          minWidth: 140,
          zIndex: 10,
        }}>
          {MENU_ITEMS.map(item => (
            <li
              key={item}
              onClick={() => handleItemClick(item)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: item === 'Delete' ? '#ef4444' : 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Exercise3() {
  return (
    <div style={{ minHeight: 200, padding: '1rem', background: '#f8fafc', borderRadius: 8, position: 'relative' }}>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Click anywhere in this box (outside the dropdown) to test close-on-outside-click.
        Check the console for menu item actions.
      </p>
      <Dropdown />
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. Event pooling is gone — access event properties async
//    In any handler: setTimeout(() => console.log(e.target.value), 1000)
//    In React 17+, this works fine. In React 16, e.target.value would be null.
//    You don't need event.persist() anymore.
//
// 2. Capture phase
//    Add onClickCapture to the Outer div in Exercise 2.
//    Click Inner — in what order do handlers fire?
//    (capture fires top-down, bubble fires bottom-up)
//
// 3. nativeEvent access
//    In any handler, log e.nativeEvent.constructor.name
//    It will be MouseEvent, InputEvent, SubmitEvent, etc. — the real browser event.
//    Also try e.nativeEvent.isTrusted — true for real user actions, false for programmatic.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>Synthetic Events</h1>

      <h2>Exercise 1 — Event inspector: make SyntheticEvent visible</h2>
      <Exercise1 />

      <h2>Exercise 2 — Propagation: stopPropagation, preventDefault, return false</h2>
      <Exercise2 />

      <h2>Exercise 3 — Click-outside-to-close dropdown</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
