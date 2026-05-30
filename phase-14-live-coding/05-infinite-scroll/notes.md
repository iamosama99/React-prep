# Infinite Scroll

## Quick Reference

| Concept | Detail |
|---|---|
| Core API | `IntersectionObserver` — fires callback when element enters/exits viewport |
| Sentinel pattern | Empty `<div ref={sentinelRef} />` at the bottom of the list |
| When to load more | Sentinel is intersecting AND `!isLoading` AND `hasMore` |
| Cleanup | `observer.disconnect()` in useEffect return |
| State required | `items[]`, `page`, `hasMore`, `isLoading`, `error` |
| Why not scroll events | IO is browser-native, off main thread, handles resize/tab visibility, no polling |
| Load guard | Check `isLoading` before triggering load — IO can fire multiple times |
| Page boundary | API returns `hasMore: false` when no more data — stop observing |

---

## Why This Matters

Infinite scroll is a common live coding question because it requires:

1. Understanding `IntersectionObserver` (a real browser API, not just React)
2. State management for pagination
3. Preventing duplicate loads (the guard pattern)
4. Cleanup to prevent memory leaks
5. Error handling and retry

Interviewers also ask about the trade-offs of IO vs scroll events — knowing this signals browser API depth.

---

## Core Concepts

### IntersectionObserver Basics

```tsx
const observer = new IntersectionObserver(
  (entries) => {
    // entries is an array of observed elements
    const [entry] = entries; // We only observe one element (sentinel)
    if (entry.isIntersecting) {
      loadMore(); // Sentinel is visible — load next page
    }
  },
  {
    threshold: 0,       // Fire as soon as any part of the element is visible
    rootMargin: '0px',  // No margin around the root
    // root: null = viewport
  }
);

observer.observe(sentinelRef.current);
// Later:
observer.disconnect(); // cleanup
```

### The Sentinel Pattern

Instead of watching the last item (which changes on each load), watch a static empty div at the bottom:

```tsx
return (
  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
    {items.map(item => <ItemRow key={item.id} item={item} />)}
    {isLoading && <LoadingSpinner />}
    {!hasMore && <div>You've seen everything</div>}
    {/* Sentinel — always at the bottom, invisible to users */}
    <div ref={sentinelRef} style={{ height: '1px' }} />
  </div>
);
```

### Full Implementation Pattern

```tsx
function InfiniteList() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load a page
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return; // Guard — prevent duplicate loads
    setIsLoading(true);
    try {
      const result = await fetchPage(page);
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(p => p + 1);
    } catch (err) {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page]);

  // Load page 1 on mount
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Set up IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading && hasMore) {
        loadMore();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoading, hasMore]); // Re-register when loadMore changes

  // ...
}
```

### Why Not Scroll Events?

| Scroll Events | IntersectionObserver |
|---|---|
| Fire on every scroll pixel | Fire only on visibility change |
| Block the main thread | Async, browser-managed |
| Require scroll position math | Element-centric: "is this visible?" |
| Miss resize/tab changes | Handles viewport changes automatically |
| Need debouncing/throttling | Already batched by browser |

### Error Handling with Retry

```tsx
const [error, setError] = useState<string | null>(null);

// In loadMore catch:
setError('Failed to load. Please retry.');
// Don't increment page on error — retry the same page

function retry() {
  setError(null);
  loadMore(); // retries the current `page` value
}
```

---

## Common Interview Gotchas

1. **Not guarding against duplicate loads**: IO can fire the callback multiple times in quick succession. Without the `isLoading` guard, you'd fire `loadMore` several times for the same page.

2. **Observing the last item instead of a sentinel**: When new items load, the "last item" changes. If you observed it, you'd need to re-observe on every load. A static sentinel div is simpler.

3. **Not disconnecting the observer**: If the component unmounts while a load is in progress, state setters can fire on an unmounted component. `observer.disconnect()` in the cleanup prevents the IO callback from running.

4. **Incrementing page on error**: If a fetch fails, don't increment `page`. The retry should request the same page, not skip one.

5. **Using scroll events as a fallback**: Don't mix IO and scroll events. Pick one. IO has better cross-browser support now (all modern browsers including Safari).

---

## Self-Assessment

- [ ] I can implement infinite scroll with IntersectionObserver from scratch
- [ ] I understand the sentinel pattern and why it's better than observing the last item
- [ ] I know the guard conditions before triggering load (`!isLoading && hasMore`)
- [ ] I clean up the observer in the useEffect return
- [ ] I can explain why IO is preferred over scroll events
- [ ] I handle the error/retry case correctly (don't increment page on error)

---

## Interview Q&A

**Q: Why use IntersectionObserver instead of a scroll event listener? `High`**

A: IntersectionObserver is more efficient and correct. Scroll event listeners fire synchronously on every pixel of scroll movement, running on the main thread and potentially causing jank if the handler does significant work. IO is browser-managed and async — it batches notifications and fires callbacks asynchronously, off the critical scroll path. IO also handles cases that scroll events miss: when the viewport resizes, when the user switches tabs and returns, or when CSS transforms cause visibility changes. And IO is element-centric ("is this element visible?") which matches the use case exactly, rather than requiring manual position math.

---

**Q: How do you prevent loading the same page twice? `High`**

A: Guard the load function with `if (isLoading || !hasMore) return`. The IO callback can fire multiple times in quick succession — if the first load hasn't finished, you don't want to start another. The `isLoading` flag acts as a mutex. Additionally, only call `setPage(p => p + 1)` after a successful response, never on error, so a failed page is retried rather than skipped.

---

**Q: What is the sentinel pattern? `Medium`**

A: A sentinel is a static, invisible `<div>` placed at the very bottom of the list. The IntersectionObserver watches this one element rather than the last rendered item. When the sentinel enters the viewport (the user has scrolled to the bottom), the observer fires and triggers the next page load. The advantage is that the sentinel never changes — you don't need to re-observe every time new items are added. You observe it once when the component mounts and disconnect when it unmounts.

---

**Q: How do you handle the case where the user scrolls to the bottom before the first page has loaded? `Medium`**

A: Because of the `isLoading` guard, nothing bad happens — the IO callback fires but sees `isLoading === true` and returns early. The initial load (triggered on mount by a `useEffect`) completes, renders items, potentially hides the sentinel in the viewport if the list is long enough, and if the sentinel is still visible after the initial load, the observer fires again and triggers the next page. If you want to avoid this edge case entirely, only start observing the sentinel after the first page has loaded — by putting the IO `useEffect` in a conditional that depends on `items.length > 0`.

---

**Q: How would you implement infinite scroll for a virtualized list (millions of items)? `Low`**

A: For very large datasets, virtualization (only rendering the visible DOM nodes) is required alongside infinite scroll. Use a library like `react-window` or `react-virtual` for virtualization. The IO sentinel pattern still works for triggering page loads — you place the sentinel just beyond the currently loaded range. The virtualizer handles rendering only the visible slice of the `items` array, and you append to that array as more pages load.
