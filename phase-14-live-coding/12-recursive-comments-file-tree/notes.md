# Recursive Comments / File Tree

## Quick Reference

| Concept | Pattern |
|---|---|
| Data shape (tree) | `{ id, name, type, children?: TreeNode[] }` |
| Data shape (comment) | `{ id, author, text, replies?: Comment[] }` |
| Recursive component | Component renders itself for its children |
| Expand state | `Set<string>` of expanded node IDs |
| Depth tracking | Pass `depth` prop, increment at each recursive call |
| Indentation | `paddingLeft: \`${depth * 1.5}rem\`` |
| Immutable tree add | Recursive traversal returning new objects at each level |
| State placement | Expand state lives in the parent/root, not in each node |

---

## Why This Matters

Recursive components test conceptual understanding that simple components don't. Interviewers use them to check:

- Whether you understand that React components can call themselves
- Whether you correctly separate state (expand/collapse lives at the root, not in each node)
- Whether you can write an immutable tree update (the hardest part)
- Whether you know to pass `depth` for indentation rather than using CSS levels

The recursive comment thread with "add reply" is the most common variant — it combines the recursive rendering pattern with the immutable tree mutation challenge.

---

## Core Concepts

### 1. Recursive Component Pattern

A component that renders itself for its children:

```tsx
function TreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div>
      <div style={{ paddingLeft: `${depth * 1.5}rem` }}>
        {node.name}
      </div>
      {node.children?.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

**Gotcha:** The component name must be capitalized for React to recognize it as a component (not a DOM element). Lowercase component names are interpreted as HTML tags.

---

### 2. Where to Put Expand/Collapse State

**Wrong approach:** Put state inside each node component.

```tsx
function TreeNode({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(false); // ❌ — isolated, can't control externally
  return /* ... */;
}
```

**Problems with this:** You can't "expand all", "collapse all", programmatically open a specific node, or sync the state to a URL parameter.

**Correct approach:** State lives in the root, passed down as props.

```tsx
// Root component
function FileTree({ root }: { root: TreeNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return <TreeNodeView node={root} depth={0} expanded={expanded} onToggle={toggle} />;
}

// Node view — purely presentational (reads from props, calls callbacks)
function TreeNodeView({ node, depth, expanded, onToggle }: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && onToggle(node.id)}
        style={{ paddingLeft: `${depth * 1.5}rem`, cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren ? (isExpanded ? '▼' : '▶') : '  '}
        {node.type === 'folder' ? '📁' : '📄'} {node.name}
      </div>
      {isExpanded && node.children?.map(child => (
        <TreeNodeView
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
```

---

### 3. Immutable Tree Update

Adding a reply to a deeply nested comment requires traversing the tree recursively and returning new objects at each level (without mutating).

```tsx
function addReply(
  comments: Comment[],
  parentId: string,
  newReply: Comment
): Comment[] {
  return comments.map(comment => {
    if (comment.id === parentId) {
      // Found the parent — add the reply
      return {
        ...comment,
        replies: [...(comment.replies ?? []), newReply],
      };
    }
    if (comment.replies && comment.replies.length > 0) {
      // Recurse into replies
      return {
        ...comment,
        replies: addReply(comment.replies, parentId, newReply),
      };
    }
    return comment; // unchanged
  });
}
```

**Why this works:** Each `map` call returns a new array. The spread `{...comment}` creates a new object. Only the path from the root to the target node is recreated — all other nodes remain the same object reference.

**Gotcha:** Don't forget to handle the case where a comment has no replies (`replies ?? []`). If `replies` is undefined, you can't spread it.

**Gotcha:** The function must always return a value — don't accidentally return `undefined` for the non-matching branch.

---

### 4. Depth Tracking

Pass `depth` as a numeric prop starting at 0:

```tsx
<CommentNode comment={root} depth={0} ... />

// Inside CommentNode, recurse with depth + 1:
{comment.replies?.map(reply => (
  <CommentNode key={reply.id} comment={reply} depth={depth + 1} ... />
))}
```

Apply it for visual indentation:

```tsx
// Option A: paddingLeft on the container
style={{ paddingLeft: `${depth * 1.5}rem` }}

// Option B: paddingLeft + left border for the indent guide
style={{
  paddingLeft: depth > 0 ? '1.5rem' : 0,
  marginLeft: depth > 0 ? '0.5rem' : 0,
  borderLeft: depth > 0 ? '2px solid #eee' : 'none',
}}
```

---

### 5. Building IDs

When creating new comments/nodes, generate unique IDs:

```tsx
// Simple: Date.now() as string
const id = Date.now().toString();

// Safer: crypto.randomUUID() (available in modern browsers + Node 14.17+)
const id = crypto.randomUUID();

// Or a simple counter (fine for interview contexts)
let counter = 0;
const id = `comment-${++counter}`;
```

---

### 6. Reply Box State

Each comment node needs a local "show reply box" state — this IS an appropriate use of local state since it's purely UI, not data:

```tsx
function CommentNode({ comment, depth, onReply }: { ... }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  function submitReply() {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  }

  return (
    <div>
      {/* comment display */}
      <button onClick={() => setShowReplyBox(v => !v)}>Reply</button>
      {showReplyBox && (
        <div>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} />
          <button onClick={submitReply}>Submit</button>
        </div>
      )}
      {/* recursive replies */}
      {comment.replies?.map(reply => (
        <CommentNode key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
}
```

---

## Common Interview Gotchas

**Gotcha:** Putting expand/collapse state inside the recursive node. This works for basic toggle but prevents "expand all", programmatic control, and URL sync. State that represents data structure belongs at the root.

**Gotcha:** Mutating the replies array directly instead of returning a new array from `addReply`. The entire tree must be immutably updated — any mutation won't trigger a re-render for components that reference the unchanged parts.

**Gotcha:** Forgetting `key` on recursive calls. Each child in the `map` needs a unique `key`. Since IDs are unique in the tree, use `key={child.id}`.

**Gotcha:** Treating `replies: undefined` and `replies: []` differently in your traversal. Guard with `replies ?? []` or `replies && replies.length > 0` consistently.

**Gotcha:** Not stopping the recursion. The base case is when a node has no children (`!node.children || node.children.length === 0`). The recursive component naturally handles this — when `children` is undefined, `children?.map(...)` returns undefined and renders nothing.

---

## Self-Assessment

- [ ] I can write a recursive component that renders itself for its children
- [ ] I know why expand/collapse state belongs at the root, not in each node
- [ ] I can implement `addReply` — the immutable tree traversal function — from memory
- [ ] I can handle `replies: undefined` gracefully in the immutable update
- [ ] I know how to pass and apply `depth` for indentation
- [ ] I can generate unique IDs for new nodes without a library

---

## Interview Q&A

**Q: How do you track expand/collapse state for a large tree? `High`**

A: A `Set<string>` of expanded node IDs at the root component — O(1) lookup, trivially extensible to "expand all" or "collapse all" by setting to a set of all IDs or an empty set. The state is owned by the root (or a common ancestor) and passed down as `expanded: Set<string>` plus an `onToggle` callback. This means node components are purely presentational — they read from props and call callbacks. Putting the state inside each recursive node means you can never control the tree externally.

---

**Q: How do you add a reply to a deeply nested comment immutably? `High`**

A: A recursive function that `map`s over the comments array. For each comment: if its `id` matches the target parent, return a new comment object with the new reply appended to its `replies` array. Otherwise, if it has replies, return a new comment object with `replies` recursively processed. If it matches neither, return the comment unchanged. The key is that every branch returns a value — the matching path creates new objects all the way up, while unchanged branches return the same object references. React's reconciliation handles the diff efficiently.

---

**Q: How do you pass depth for indentation in a recursive tree? `Medium`**

A: Add a `depth: number` prop, starting at 0 in the root render call. At each recursive call, pass `depth + 1`. Apply indentation as `paddingLeft: \`${depth * 1.5}rem\`` on each node's container. For comment threads, a left border (`borderLeft: depth > 0 ? '2px solid #eee' : 'none'`) provides the traditional "thread" visual. Depth can also control font size, color, or indentation unit — whatever the design requires.

---

**Q: When is it OK to use local state inside a recursive node component? `Low`**

A: For purely UI state that doesn't need to be shared, controlled externally, or synced anywhere. The "show reply input" toggle is the canonical example — it's transient UI state that only affects that specific node's rendering, has no meaning to the parent or siblings, and doesn't need to survive navigation or be serializable. In contrast, "which items are expanded" needs to be at the root because: (a) you want "expand all" to work, (b) you might need to expand a specific item programmatically, (c) it might need to sync to URL. The test: if another component could legitimately need to read or change this state, it doesn't belong in local state of a recursive node.
