# OTP Input

## Quick Reference

| Concept | Implementation |
|---|---|
| State | `string[]` of length N, initialized to `Array(N).fill('')` |
| Refs | `useRef<(HTMLInputElement \| null)[]>([])` |
| Auto-advance | On change: if digit entered, `refs[i+1]?.focus()` |
| Backspace on empty | `onKeyDown`: if Backspace + empty, focus `refs[i-1]`, clear it |
| Paste | `e.preventDefault()`, strip non-digits, fill from current index |
| Arrow keys | ArrowLeft → `refs[i-1]?.focus()`, ArrowRight → `refs[i+1]?.focus()` |
| Completion | Check if all inputs filled after each update |
| Digit-only | `e.target.value.replace(/\D/g, '').slice(-1)` |

---

## Why This Matters

OTP input is a staple of live-coding rounds because it tests:

- Ref management (array of refs, imperative focus control)
- Event coordination across multiple inputs (onChange, onKeyDown, onPaste)
- Immutable state updates for arrays
- Edge cases that reveal thoroughness: paste, backspace on empty, auto-advance on last cell

Interviewers specifically watch: how you structure the refs, how you handle backspace on an empty field, and whether you think to handle paste. The onChange → auto-advance flow is table stakes; paste is what separates good candidates.

---

## Core Concepts

### 1. Architecture: Array of Single-Character Inputs

One `<input maxLength={1}>` per digit. The OTP value is derived by joining the array.

```tsx
const LENGTH = 6;
const [values, setValues] = useState<string[]>(Array(LENGTH).fill(''));
const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

// Derive the OTP string
const otp = values.join('');
```

**Why not one input with maxLength={6}?** Visual control — individual boxes are the expected UI. Cursor positioning and per-cell styling are much simpler with separate inputs.

---

### 2. Setting Up Refs

```tsx
// Attach ref to each input
<input
  ref={el => { inputRefs.current[i] = el; }}
  // ...
/>
```

**Gotcha:** Don't use `ref={inputRefs.current[i]}` — that reads the current array element at render time. Use the callback form `ref={el => { ... }}` to assign imperatively.

Focus a specific input:

```tsx
function focusInput(index: number) {
  inputRefs.current[index]?.focus();
}
```

---

### 3. Auto-Advance on Input

```tsx
function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
  // Filter to digits only, take the last character typed
  const digit = e.target.value.replace(/\D/g, '').slice(-1);

  // Immutable update
  const newValues = [...values];
  newValues[index] = digit;
  setValues(newValues);

  // Auto-advance to next input
  if (digit && index < length - 1) {
    inputRefs.current[index + 1]?.focus();
  }

  // Completion callback
  if (digit && index === length - 1 && newValues.every(v => v !== '')) {
    onComplete?.(newValues.join(''));
  }
}
```

**Why `.replace(/\D/g, '').slice(-1)`?** When a user types in an already-filled box, the browser's onChange gives you the new value (e.g., "37" if they type 7 over "3"). `replace(/\D/g, '')` strips non-digits, `.slice(-1)` takes the last digit — the one they just typed.

**Gotcha:** Don't check `e.target.value` directly — on mobile, the input might contain the previous character plus the new one. Always normalize.

---

### 4. Backspace Handling

```tsx
function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Backspace') {
    if (values[index] === '') {
      // Input is already empty — move to previous and clear it
      if (index > 0) {
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
      }
    }
    // If input has a value, normal backspace behavior clears it
    // onChange will fire with '' and handle the state update
  }
}
```

**Why check for empty first?** If the current input has a value, the browser's default Backspace clears it and fires onChange, which updates state normally. We only need custom behavior when the input is already empty — in that case, we "go back" to the previous input.

**Gotcha:** Don't call `e.preventDefault()` on Backspace when the input has a value — you'd prevent the browser from clearing it.

---

### 5. Paste Handling

```tsx
function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
  e.preventDefault(); // prevent default paste into the single input

  const pasted = e.clipboardData.getData('text');
  const digits = pasted.replace(/\D/g, '').split('').slice(0, length - index);

  if (digits.length === 0) return;

  const newValues = [...values];
  digits.forEach((digit, i) => {
    newValues[index + i] = digit;
  });
  setValues(newValues);

  // Focus the last filled input (or the next empty one)
  const lastFilledIndex = Math.min(index + digits.length - 1, length - 1);
  inputRefs.current[lastFilledIndex]?.focus();

  // Check completion
  if (newValues.every(v => v !== '')) {
    onComplete?.(newValues.join(''));
  }
}
```

**Why `e.preventDefault()`?** Without it, the browser pastes the full string into the currently focused single-character input, which then fires onChange. We want to distribute the paste across multiple inputs ourselves.

**Gotcha:** Paste from index — if the user focuses input 2 and pastes "12345", you should fill inputs 2, 3, 4, 5 (4 characters max), not fill from the beginning. Use `index` as the starting position and `slice(0, length - index)` to cap overflow.

---

### 6. Arrow Key Navigation

```tsx
case 'ArrowLeft':
  e.preventDefault();
  if (index > 0) inputRefs.current[index - 1]?.focus();
  break;
case 'ArrowRight':
  e.preventDefault();
  if (index < length - 1) inputRefs.current[index + 1]?.focus();
  break;
```

**Why prevent default?** Arrow keys in an input normally move the cursor within the text. Since each input has at most 1 character, there's nowhere for the cursor to go — but calling `preventDefault` prevents any unexpected behavior on different browsers.

---

### 7. Mobile Considerations

- Use `type="text"` with `inputMode="numeric"` — shows the numeric keyboard on mobile but allows `type` to work properly with `maxLength`
- Using `type="number"` causes issues: backspace doesn't fire onChange, `maxLength` is ignored by browsers for number inputs
- Pattern: `pattern="[0-9]*"` as an additional hint for iOS Safari

```tsx
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={1}
  autoComplete="one-time-code"  // prompts the browser to offer OTP from SMS
/>
```

---

### 8. onComplete Callback

```tsx
// After every state update, check if all inputs are filled
function checkComplete(newValues: string[]) {
  if (newValues.every(v => v !== '')) {
    onComplete?.(newValues.join(''));
  }
}
```

Call `checkComplete` after `handleChange` and after `handlePaste`.

---

## Common Interview Gotchas

**Gotcha:** Using `ref={inputRefs.current[i]}` instead of the callback form. The callback form `ref={el => { inputRefs.current[i] = el; }}` is required to populate the array correctly during render.

**Gotcha:** Using `type="number"` — backspace doesn't fire onChange, maxLength is ignored.

**Gotcha:** Not handling paste from a non-zero index. The paste should fill from the focused input, not always from index 0.

**Gotcha:** Calling `e.preventDefault()` on all Backspace events. Only call it when the input is empty and you're moving focus to the previous input. Otherwise let the browser clear the current input naturally.

**Gotcha:** Not calling `onComplete` after paste — checking completion in `handleChange` only misses paste-triggered completion.

**Gotcha:** `maxLength={1}` alone doesn't prevent pasting multiple characters — you still need the `onPaste` handler.

---

## Self-Assessment

- [ ] I can set up an array ref correctly using the callback form
- [ ] I can implement auto-advance on digit entry from memory
- [ ] I can implement backspace-on-empty (go back) correctly
- [ ] I know why `type="text"` + `inputMode="numeric"` is better than `type="number"`
- [ ] I can implement paste handling that fills from the focused position
- [ ] I know when to and when not to `preventDefault` on Backspace

---

## Interview Q&A

**Q: How do you handle auto-advance in an OTP input? `High`**

A: In the `onChange` handler, normalize the input to a single digit with `e.target.value.replace(/\D/g, '').slice(-1)`. Update the values array immutably. If a digit was entered (non-empty) and we're not on the last input, call `inputRefs.current[index + 1]?.focus()`. If we're on the last input and all fields are filled, call the `onComplete` callback. The refs are stored in a `useRef<(HTMLInputElement | null)[]>([])` array, populated using the callback ref form `ref={el => { inputRefs.current[i] = el; }}`.

---

**Q: How do you handle paste in an OTP input? `High`**

A: Call `e.preventDefault()` to stop the browser from pasting into the single input. Read the clipboard text with `e.clipboardData.getData('text')`, strip non-digits with `.replace(/\D/g, '')`, and limit to the remaining inputs from the current index: `.slice(0, length - index)`. Build a new values array filling from `index` onwards. Focus the last filled input. Check completion afterward. The key detail: paste should start from the currently focused input (index), not always from index 0.

---

**Q: How do you handle backspace on an empty input? `Medium`**

A: In `onKeyDown`, check `e.key === 'Backspace'` and whether the current input is empty (`values[index] === ''`). If both are true: update the previous input to `''` in state, focus the previous input. Do NOT call `e.preventDefault()` here — you want the focus change to happen. If the input has a value, don't intercept Backspace — let the browser clear it normally, which fires `onChange` to update state.

---

**Q: Why use `type="text"` with `inputMode="numeric"` instead of `type="number"`? `Medium`**

A: `type="number"` has several problems for OTP: (1) browsers ignore `maxLength` on number inputs — the user can type any length; (2) Backspace sometimes doesn't fire `onChange` when deleting the last digit; (3) leading zeros are stripped. `type="text"` plus `inputMode="numeric"` shows the numeric keyboard on mobile (best of both worlds) while maintaining the text semantics that make `maxLength`, `onChange`, and `onKeyDown` behave predictably. Add `pattern="[0-9]*"` as an extra hint for iOS Safari.
