// ============================================================
// Topic:   Recursive Comments / File Tree
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: file tree with expand/collapse (no add).
//   3. Exercise 2: addReply function + recursive comment thread.
//   4. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 12-recursive-comments-file-tree
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — File Tree (Expand/Collapse, Read-Only)
//
// Key points:
//   - Expand state lives in FileTreeDemo, NOT inside each node
//   - FileTreeNode is purely presentational — reads props, calls callbacks
//   - Recursive: FileTreeNode renders FileTreeNode for each child
//   - Depth: pass depth prop, increment at each recursive call
//
// TODO in FileTreeNode:
//   1. Show ▶ or ▼ indicator for folders based on isExpanded
//   2. Show 📁 for folders, 📄 for files
//   3. When a folder is clicked, call onToggle(node.id)
//   4. When isExpanded AND folder has children, render children
//      recursively with depth + 1
// ─────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

const FILE_TREE: TreeNode = {
  id: 'root',
  name: 'src',
  type: 'folder',
  children: [
    {
      id: 'components',
      name: 'components',
      type: 'folder',
      children: [
        { id: 'button', name: 'Button.tsx', type: 'file' },
        { id: 'input', name: 'Input.tsx', type: 'file' },
        {
          id: 'forms',
          name: 'forms',
          type: 'folder',
          children: [
            { id: 'login', name: 'LoginForm.tsx', type: 'file' },
            { id: 'signup', name: 'SignupForm.tsx', type: 'file' },
          ],
        },
      ],
    },
    {
      id: 'hooks',
      name: 'hooks',
      type: 'folder',
      children: [
        { id: 'usefetch', name: 'useFetch.ts', type: 'file' },
        { id: 'uselocal', name: 'useLocalStorage.ts', type: 'file' },
      ],
    },
    { id: 'app', name: 'App.tsx', type: 'file' },
    { id: 'main', name: 'main.tsx', type: 'file' },
  ],
};

function FileTreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.type === 'folder' && (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && onToggle(node.id)}
        style={{
          paddingLeft: `${depth * 1.5}rem`,
          padding: `0.2rem 0.5rem 0.2rem ${depth * 1.5}rem`,
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          userSelect: 'none',
          fontSize: '0.9rem',
        }}
      >
        {/* TODO: show ▶ when collapsed folder, ▼ when expanded, nothing for files */}
        <span style={{ width: '1rem', color: '#888', fontSize: '0.7rem' }}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>

        {/* TODO: show 📁 for folders, 📄 for files */}
        <span>{node.type === 'folder' ? '📁' : '📄'}</span>

        <span style={{ color: node.type === 'folder' ? '#1a1a1a' : '#555' }}>
          {node.name}
        </span>
      </div>

      {/* TODO: render children recursively when isExpanded */}
      {/* isExpanded && node.children?.map(child => ( */}
      {/*   <FileTreeNode */}
      {/*     key={child.id} */}
      {/*     node={child} */}
      {/*     depth={depth + 1} */}
      {/*     expanded={expanded} */}
      {/*     onToggle={onToggle} */}
      {/*   /> */}
      {/* )) */}
    </div>
  );
}

function FileTreeDemo() {
  // Expand state lives HERE, not inside FileTreeNode
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    // Collect all folder IDs
    function getAllFolderIds(node: TreeNode): string[] {
      if (node.type === 'file') return [];
      const childIds = node.children?.flatMap(getAllFolderIds) ?? [];
      return [node.id, ...childIds];
    }
    setExpanded(new Set(getAllFolderIds(FILE_TREE)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          onClick={expandAll}
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}
        >
          Collapse All
        </button>
      </div>
      <div style={{ fontFamily: 'monospace', background: '#fafafa', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee' }}>
        <FileTreeNode
          node={FILE_TREE}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Recursive Comments with "Reply"
//
// The hard part: addReply — an immutable recursive tree update.
//
// TODO in addReply:
//   1. map over comments
//   2. If comment.id === parentId → return new object with reply appended
//   3. Else if comment.replies exists → recurse into replies
//   4. Else → return comment unchanged
//
// TODO in CommentNode:
//   1. Show comment.author, comment.text, a "Reply" button
//   2. Show/hide reply input box (local state — this IS ok for pure UI)
//   3. On submit: call onReply(comment.id, replyText)
//   4. Render comment.replies recursively with depth + 1
// ─────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  replies?: Comment[];
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Alice',
    text: 'This is a great article on recursive components!',
    timestamp: '2h ago',
    replies: [
      {
        id: 'c2',
        author: 'Bob',
        text: 'Agreed! The depth tracking part was especially clear.',
        timestamp: '1h ago',
        replies: [
          {
            id: 'c3',
            author: 'Alice',
            text: 'Thanks Bob! The trick is always passing depth + 1 in the recursive call.',
            timestamp: '45m ago',
          },
        ],
      },
    ],
  },
  {
    id: 'c4',
    author: 'Carol',
    text: 'One question: why does expand state live in the parent and not each node?',
    timestamp: '30m ago',
    replies: [],
  },
];

function addReply(comments: Comment[], parentId: string, newReply: Comment): Comment[] {
  // TODO: implement immutable recursive tree update
  // return comments.map(comment => {
  //   if (comment.id === parentId) {
  //     return { ...comment, replies: [...(comment.replies ?? []), newReply] };
  //   }
  //   if (comment.replies && comment.replies.length > 0) {
  //     return { ...comment, replies: addReply(comment.replies, parentId, newReply) };
  //   }
  //   return comment;
  // });
  return comments; // remove this line once implemented
}

function CommentNode({
  comment,
  depth,
  onReply,
}: {
  comment: Comment;
  depth: number;
  onReply: (parentId: string, text: string) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  function submitReply() {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  }

  return (
    <div
      style={{
        paddingLeft: depth > 0 ? '1.5rem' : 0,
        marginLeft: depth > 0 ? '0.5rem' : 0,
        borderLeft: depth > 0 ? '2px solid #e5e7eb' : 'none',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a' }}>{comment.author}</span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{comment.timestamp}</span>
        </div>
        {/* TODO: render comment.text */}
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#374151', lineHeight: 1.5 }}>
          {comment.text}
        </p>
        {/* TODO: Reply button that toggles showReplyBox */}
        <button
          onClick={() => setShowReplyBox(v => !v)}
          style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {showReplyBox ? 'Cancel' : 'Reply'}
        </button>
      </div>

      {/* TODO: show reply box when showReplyBox is true */}
      {showReplyBox && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim()}
            style={{ marginTop: '0.35rem', padding: '0.35rem 0.9rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Submit
          </button>
        </div>
      )}

      {/* TODO: render replies recursively with depth + 1 */}
      {/* {comment.replies?.map(reply => ( */}
      {/*   <CommentNode key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} /> */}
      {/* ))} */}
    </div>
  );
}

function CommentThreadDemo() {
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);

  function handleReply(parentId: string, text: string) {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: 'You',
      text,
      timestamp: 'just now',
    };
    setComments(prev => addReply(prev, parentId, newComment));
  }

  return (
    <div>
      {comments.map(comment => (
        <CommentNode key={comment.id} comment={comment} depth={0} onReply={handleReply} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete file tree + comment thread with all features:
//   - File tree: expand/collapse, expand-all/collapse-all
//   - Comments: recursive render, add reply, immutable update
//   - Depth indentation with left border thread indicator
//   - Local state for reply box (UI state, not data)
//   - Root state for expand/collapse (data, not UI state)
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

// Reference: addReply — immutable recursive tree update
function refAddReply(comments: Comment[], parentId: string, newReply: Comment): Comment[] {
  return comments.map(comment => {
    if (comment.id === parentId) {
      return { ...comment, replies: [...(comment.replies ?? []), newReply] };
    }
    if (comment.replies && comment.replies.length > 0) {
      return { ...comment, replies: refAddReply(comment.replies, parentId, newReply) };
    }
    return comment;
  });
}

function RefFileTreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.type === 'folder' && (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && onToggle(node.id)}
        style={{
          paddingLeft: `${depth * 1.5}rem`,
          padding: `0.25rem 0.5rem 0.25rem ${depth * 1.5}rem`,
          cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          userSelect: 'none',
          fontSize: '0.9rem',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (hasChildren) (e.currentTarget as HTMLDivElement).style.background = '#f0f0f0'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <span style={{ width: '1rem', color: '#888', fontSize: '0.7rem', flexShrink: 0 }}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <span>{node.type === 'folder' ? '📁' : '📄'}</span>
        <span style={{ color: node.type === 'folder' ? '#1a1a1a' : '#555' }}>
          {node.name}
        </span>
      </div>
      {isExpanded && node.children?.map(child => (
        <RefFileTreeNode
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

function RefFileTreeDemo() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function getAllFolderIds(node: TreeNode): string[] {
    if (node.type === 'file') return [];
    return [node.id, ...(node.children?.flatMap(getAllFolderIds) ?? [])];
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button onClick={() => setExpanded(new Set(getAllFolderIds(FILE_TREE)))} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}>Expand All</button>
        <button onClick={() => setExpanded(new Set())} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}>Collapse All</button>
      </div>
      <div style={{ fontFamily: 'monospace', background: '#fafafa', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee' }}>
        <RefFileTreeNode node={FILE_TREE} depth={0} expanded={expanded} onToggle={toggle} />
      </div>
    </div>
  );
}

function RefCommentNode({
  comment,
  depth,
  onReply,
}: {
  comment: Comment;
  depth: number;
  onReply: (parentId: string, text: string) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  function submitReply() {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  }

  const replyCount = comment.replies?.length ?? 0;

  return (
    <div
      style={{
        paddingLeft: depth > 0 ? '1.5rem' : 0,
        marginLeft: depth > 0 ? '0.5rem' : 0,
        borderLeft: depth > 0 ? '2px solid #e5e7eb' : 'none',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a1a' }}>{comment.author}</span>
            {depth > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: '#e5e7eb', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                depth {depth}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{comment.timestamp}</span>
        </div>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
          {comment.text}
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowReplyBox(v => !v)}
            style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {showReplyBox ? 'Cancel' : 'Reply'}
          </button>
          {replyCount > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
      </div>

      {showReplyBox && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.author}...`}
            rows={2}
            autoFocus
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim()}
            style={{ marginTop: '0.35rem', padding: '0.35rem 0.9rem', background: replyText.trim() ? '#3b82f6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: '4px', cursor: replyText.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem', transition: 'background 0.15s' }}
          >
            Submit Reply
          </button>
        </div>
      )}

      {/* Recursive: render replies with depth + 1 */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {comment.replies.map(reply => (
            <RefCommentNode key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

function RefCommentThreadDemo() {
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);

  function handleReply(parentId: string, text: string) {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: 'You',
      text,
      timestamp: 'just now',
    };
    setComments(prev => refAddReply(prev, parentId, newComment));
  }

  return (
    <div>
      {comments.map(comment => (
        <RefCommentNode key={comment.id} comment={comment} depth={0} onReply={handleReply} />
      ))}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Recursive Comments / File Tree</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Two recursive component patterns: an expandable file tree and a nested comment thread with reply.
      The key skills: recursive rendering, state placement, and immutable tree updates.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — File Tree (Expand/Collapse)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          The expand state is already in <code>FileTreeDemo</code> and the toggle function is implemented.
          Fill in <code>FileTreeNode</code>: show the correct icon, call <code>onToggle</code>, and render children recursively.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <FileTreeDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Clicking a folder should toggle its children. "Expand All" should open everything.
          "Collapse All" should close everything. File nodes should not be clickable.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — Nested Comments with Reply</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Two tasks: (1) implement <code>addReply</code> — the immutable recursive update, and
          (2) uncomment the recursive <code>CommentNode</code> renders.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <CommentThreadDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Click "Reply" on any comment to open the reply box. Submit a reply — it should
          appear nested under the parent. Replies to replies should nest further. The depth indicator in the reference shows you the correct nesting level.
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Full solution for both the file tree and comment thread. Includes hover states on file tree nodes,
          reply count display, depth badge, and disabled submit when input is empty.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.75rem' }}>File Tree</h3>
            <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
              <RefFileTreeDemo />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.75rem' }}>Comment Thread</h3>
            <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
              <RefCommentThreadDemo />
            </div>
          </div>
        </div>

        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li><code>addReply</code> returns a new array at every level — the path from root to target is recreated</li>
            <li>Unchanged comments return the same object reference — React diffs efficiently</li>
            <li><code>showReplyBox</code> is local state (UI) — comments root state manages the data</li>
            <li>The depth badge demonstrates that each level gets <code>depth + 1</code> from its parent</li>
            <li><code>crypto.randomUUID()</code> for IDs — no library needed in modern environments</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
