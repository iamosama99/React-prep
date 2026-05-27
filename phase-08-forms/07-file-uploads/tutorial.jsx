// ============================================================
// Topic:   File Uploads
// Phase:   8 — Forms
//
// APPROACH:
//   Exercise 1 — file input + preview using createObjectURL (with revoke cleanup)
//   Exercise 2 — client-side validation (type + size) + FormData POST (mocked)
//   Exercise 3 — drag-and-drop drop zone that also supports click-to-browse
// ============================================================

import { useState, useEffect, useRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// FILE PREVIEW — createObjectURL + cleanup
//
// Build an avatar uploader that shows a preview instantly, before any upload.
//
// TODO:
//   □ In handleChange:
//       const file = e.target.files[0]
//       If no file, return early
//       setFile(file)
//       setPreviewUrl(URL.createObjectURL(file))
//   □ Add a useEffect that revokes the previous URL when previewUrl changes
//       return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
//   □ In the JSX: show the <img> only when previewUrl exists
//   □ The "Remove" button clears both file and previewUrl state
//
// WHAT TO NOTICE:
//   - The preview appears instantly — no server round-trip
//   - Open DevTools Memory tab: without revoke, blob: URLs accumulate
//   - The file input can never have its value set — it's always uncontrolled
//   - `value` on a file input is browser-blocked (security constraint)

function Exercise1() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // TODO: revoke the blob URL when previewUrl changes or component unmounts
  useEffect(() => {
    return () => {
      // if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(e) {
    // TODO: get e.target.files[0], set file state, create blob URL
  }

  function handleRemove() {
    setFile(null);
    // TODO: revoke the current previewUrl, clear it
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* TODO: show preview image when previewUrl exists */}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '2px solid #e5e7eb' }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{
          cursor: 'pointer',
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          padding: '6px 12px',
          borderRadius: 4,
          fontSize: 14,
        }}>
          {file ? 'Change photo' : 'Choose photo'}
          {/* TODO: add onChange={handleChange} */}
          <input type="file" accept="image/*" style={{ display: 'none' }} />
        </label>

        {file && (
          <button type="button" onClick={handleRemove}
            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Remove
          </button>
        )}
      </div>

      {file && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
          {file.name} — {(file.size / 1024).toFixed(1)} KB
        </p>
      )}
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// VALIDATE + UPLOAD — client-side checks before sending
//
// Build a document uploader that validates before uploading:
//   □ Allowed types: application/pdf, image/jpeg, image/png
//   □ Max size: 5 MB
//   □ Show a clear error message for each violation
//   □ If valid: call mockUpload(file) which returns a Promise
//     and show a progress-style "Uploading…" → "Uploaded ✓" state
//
// TODO — implement validateFile(file):
//   Returns null if valid, or an error string if not.
//   Check file.type against ALLOWED_TYPES and file.size against MAX_SIZE.
//
// TODO — implement handleUpload():
//   If !file, return
//   Call validateFile — if error, setError and return
//   setStatus('uploading'), await mockUpload(file)
//   setStatus('done')
//
// WHAT TO NOTICE:
//   - file.type is set by the browser based on extension — easy to spoof
//     Always validate on the server too
//   - FormData is the correct way to send a file: fd.append('file', file)
//     Never manually set Content-Type when using FormData
//   - The upload state machine (idle → uploading → done | error) is clean
//     with a single status string in state

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB = 5;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

function mockUpload(file) {
  console.log('FormData POST →', file.name);
  // In a real app: const fd = new FormData(); fd.append('file', file);
  //                await fetch('/api/upload', { method: 'POST', body: fd });
  return new Promise(resolve => setTimeout(resolve, 1500));
}

function validateFile(file) {
  // TODO: return an error string or null
  // if (!ALLOWED_TYPES.includes(file.type)) return `Only PDF, JPEG, PNG. Got: ${file.type}`;
  // if (file.size > MAX_SIZE) return `Max ${MAX_SIZE_MB} MB. Got: ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return null;
}

function Exercise2() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'done'

  function handleChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setStatus('idle');
  }

  async function handleUpload() {
    if (!file) return;
    // TODO: validateFile — set error and return if invalid
    // TODO: setStatus('uploading'), await mockUpload(file), setStatus('done')
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 4 }}>
          Select a file (PDF, JPEG, or PNG — max {MAX_SIZE_MB} MB)
        </label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} />
      </div>

      {error && (
        <p style={{ color: '#dc2626', margin: 0, fontSize: 13 }}>⚠ {error}</p>
      )}

      {file && !error && (
        <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
          {file.name} — {(file.size / 1024).toFixed(1)} KB — {file.type || 'unknown type'}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || status === 'uploading'}
        style={{ justifySelf: 'start' }}
      >
        {status === 'uploading' ? 'Uploading…' : status === 'done' ? 'Upload another' : 'Upload'}
      </button>

      {status === 'done' && (
        <p style={{ color: '#15803d', margin: 0, fontWeight: 600 }}>✓ File uploaded successfully</p>
      )}
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// DRAG-AND-DROP ZONE — plus click-to-browse fallback
//
// Build a drop zone that:
//   □ Accepts dragged files and shows the first file's name + size
//   □ Highlights with a blue border while dragging over it (dragging state)
//   □ Also works as a click target — clicking it opens the file picker
//   □ Calls the same validate + accept logic as Exercise 2
//
// TODO — three event handlers:
//   handleDragOver(e):
//     e.preventDefault()   ← REQUIRED or `drop` never fires
//     setDragging(true)
//
//   handleDragLeave():
//     setDragging(false)
//
//   handleDrop(e):
//     e.preventDefault()
//     setDragging(false)
//     const files = Array.from(e.dataTransfer.files)
//     if (files[0]) setFile(files[0])
//
// The hidden <input type="file"> + ref let us trigger the file picker
// when the user clicks the zone (as a fallback for non-drag users).
//
// WHAT TO NOTICE:
//   - e.preventDefault() in dragover is mandatory — without it the browser
//     opens the file instead of firing the drop event
//   - e.dataTransfer.files is the same FileList you get from input's e.target.files
//   - The hidden input + click trigger gives you both interactions in one zone

function Exercise3() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    // TODO: e.preventDefault() + setDragging(true)
  }

  function handleDragLeave() {
    // TODO: setDragging(false)
  }

  function handleDrop(e) {
    // TODO: e.preventDefault(), setDragging(false), read e.dataTransfer.files[0]
  }

  function handleInputChange(e) {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#2563eb' : '#d1d5db'}`,
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#eff6ff' : '#f9fafb',
          transition: 'all 150ms',
        }}
      >
        {file ? (
          <p style={{ margin: 0, color: '#374151' }}>
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              {dragging ? 'Drop it!' : 'Drop a file here'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Hidden input — triggered by clicking the zone */}
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {file && (
        <button type="button" onClick={() => setFile(null)} style={{ justifySelf: 'start' }}>
          Clear
        </button>
      )}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Add progress tracking: wrap mockUpload with XMLHttpRequest
//     and listen to xhr.upload.onprogress for a real progress bar
//   - Support multiple file drop: iterate e.dataTransfer.files
//     and store an array of { file, status, progress } objects
//   - Integrate with React Hook Form using setValue('avatar', e.target.files[0])
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 520 }}>
      <h1>File Uploads</h1>

      <h2>Exercise 1 — File Preview with createObjectURL</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Client-Side Validation + Upload</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — Drag-and-Drop Zone</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
