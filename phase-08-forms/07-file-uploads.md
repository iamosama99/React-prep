# File Uploads

## Quick Reference

| Concept | Details |
|---|---|
| `<input type="file">` | Always uncontrolled — `value` is read-only; use `ref` to access files |
| Getting files | `e.target.files` (FileList) or `ref.current.files` |
| Sending files | `FormData` — `fd.append('file', file)`, POST with no `Content-Type` header |
| Progress | `XMLHttpRequest` + `upload.onprogress`; or fetch + ReadableStream (complex) |
| Drag-drop | `dragover.preventDefault()` + `drop` event's `e.dataTransfer.files` |
| Preview | `URL.createObjectURL(file)` — revoke on cleanup |
| Validation | Check `file.size`, `file.type` before upload |

---

## Why File Inputs Are Special

A file `<input>` can never be controlled in React — the browser blocks setting `input.value` for security reasons (you can't programmatically pick a file for the user). This means you always handle files through either `e.target.files` in an `onChange` handler or `ref.current.files` when you need the value later.

This is one area where uncontrolled input is not a choice — it's a browser constraint.

---

## Basic File Input

```jsx
function FileUpload() {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);

  function handleChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  // Revoke the object URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleUpload() {
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);

    await fetch('/api/upload', {
      method: 'POST',
      body: fd,
      // Do NOT set Content-Type — the browser must set it with the boundary
    });
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} />
      {preview && <img src={preview} alt="Preview" width={200} />}
      <button onClick={handleUpload} disabled={!file}>Upload</button>
    </div>
  );
}
```

`URL.createObjectURL` creates a local blob URL that the browser resolves without a network request. Revoke it when done to release memory.

---

> **Check yourself:** Why can't you set `value` on a file input? What does this mean for how you read the selected file?

---

## Client-Side Validation

Validate before uploading to avoid unnecessary network requests and give immediate feedback.

```jsx
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, and WebP files are allowed';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'File must be smaller than 5 MB';
  }
  return null;
}

function handleChange(e) {
  const selected = e.target.files[0];
  if (!selected) return;
  const error = validateFile(selected);
  if (error) {
    setError(error);
    return;
  }
  setError(null);
  setFile(selected);
}
```

Note: `file.type` is set by the browser based on extension — it can be spoofed. Always validate file type server-side as well.

---

## Upload Progress with XMLHttpRequest

`fetch` doesn't expose upload progress. Use `XMLHttpRequest` when you need a progress bar.

```jsx
function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Network error'));

    xhr.open('POST', '/api/upload');
    xhr.send(fd);
  });
}

// In the component:
const [progress, setProgress] = React.useState(0);

async function handleUpload() {
  await uploadWithProgress(file, setProgress);
}

// Render:
{progress > 0 && (
  <progress value={progress} max={100}>{progress}%</progress>
)}
```

---

> **Check yourself:** Why can't you use `fetch` for upload progress? What browser API fills that gap?

---

## Drag-and-Drop Upload

```jsx
function DropZone({ onFileDrop }) {
  const [dragging, setDragging] = React.useState(false);

  function handleDragOver(e) {
    e.preventDefault(); // Required — allows the drop event to fire
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFileDrop(files);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ border: `2px dashed ${dragging ? 'blue' : 'gray'}`, padding: 40 }}
    >
      Drop files here
    </div>
  );
}
```

`e.preventDefault()` in `dragover` is mandatory — without it the browser navigates to the file instead of triggering the `drop` event. `e.dataTransfer.files` is the same FileList you get from an input's `e.target.files`.

---

## Multiple File Upload

```jsx
<input type="file" multiple onChange={handleChange} />

function handleChange(e) {
  const files = Array.from(e.target.files); // FileList → Array
  const validFiles = files.filter(f => validateFile(f) === null);
  setFiles(validFiles);
}
```

For multiple files, manage an array in state and track per-file progress if needed:

```jsx
const [uploads, setUploads] = React.useState([]); // [{ file, progress, status }]
```

---

## Integrating with React Hook Form

File inputs need special handling in RHF because `register` expects `value` to be a string.

```jsx
const { register, handleSubmit } = useForm();

// Wrong — file inputs can't be controlled by RHF's value system
// Correct: use onChange separately or use watch/setValue

const { setValue } = useForm();

<input
  type="file"
  onChange={e => setValue('avatar', e.target.files[0])}
/>
```

Or use `register` and read `e.target.files` in the submit handler:

```jsx
<input type="file" {...register('avatar')} />

// In onSubmit:
function onSubmit(data) {
  const file = data.avatar[0]; // FileList, not a File — index 0
  const fd = new FormData();
  fd.append('avatar', file);
}
```

---

## Self-Assessment

- [ ] I can build a file input that reads the selected file and shows a preview
- [ ] I know why `value` can't be set on file inputs
- [ ] I can validate file size and type before uploading
- [ ] I can implement upload progress using `XMLHttpRequest`
- [ ] I can implement a drag-and-drop drop zone
- [ ] I know why `e.preventDefault()` is required in `dragover`
- [ ] I can integrate file uploads with React Hook Form

---

## Interview Q&A

**Q: Why is a file input always uncontrolled? (High)**

A: The browser intentionally blocks setting `input[type=file].value` programmatically — if it were allowed, a malicious script could silently select a file and upload it. Since React can't set the value, the input can never be controlled. You read the selected file from `e.target.files` in an `onChange` handler or from `ref.current.files`, but you never control what the user sees in the input itself.

---

**Q: How do you send a file to a server? (High)**

A: Use the `FormData` API — instantiate it, call `fd.append('fieldName', file)`, and set `fd` as the `body` in a `fetch` POST. Never manually set `Content-Type` when using `FormData`; the browser must set it automatically to include the multipart boundary string. Without the boundary, the server can't parse the body.

---

**Q: How do you show upload progress? (Medium)**

A: `fetch` doesn't expose upload progress (only download progress, via `response.body`). Use `XMLHttpRequest` instead — it fires `upload.onprogress` events with `e.loaded` and `e.total` as the upload advances. Wrap it in a Promise so you can `await` it from React event handlers. Set progress state in `onprogress` and render it with a `<progress>` element.

---

**Q: What must you call in `dragover` to make the `drop` event fire, and why? (Medium)**

A: `e.preventDefault()`. By default, browsers handle dropped files by navigating to them. Calling `preventDefault()` in `dragover` cancels that default behavior and signals to the browser that your code handles the drop. Without it, the browser intercepts the drop event and the `drop` handler never fires.

---

**Q: How do you create a file preview without uploading? (Low)**

A: Call `URL.createObjectURL(file)` — it returns a `blob:` URL that the browser can use as an image `src` without a network request. The URL is valid for the lifetime of the document unless you call `URL.revokeObjectURL(url)`. Always revoke it in a `useEffect` cleanup to prevent memory leaks when the component unmounts or the file changes.
