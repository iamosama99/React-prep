# List Virtualization

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Windowing | Rendering only the rows visible in the viewport | Keeps DOM node count constant regardless of total list size |
| Phantom container | A tall inner div sized to represent the full list | Gives the scrollbar correct proportions without rendering all items |
| Overscan | Extra items rendered above/below the visible area | Prevents blank flicker during fast scrolling |
| `FixedSizeList` | Virtualization for uniform row heights | O(1) scroll position math — simplest to set up |
| `VariableSizeList` | Virtualization where each row has a different height | Requires an `itemSize` function and height cache invalidation |

## What Is This?

List virtualization (also called "windowing") is a technique where only the rows currently visible in the viewport are rendered as DOM nodes. As the user scrolls, rows that leave the viewport are unmounted and rows entering the viewport are mounted — the total number of live DOM nodes stays small regardless of the total list size.

The main libraries for React: `react-window` (lighter, modern) and `react-virtual` (TanStack Virtual — headless, framework-agnostic). `react-virtualized` is the predecessor to `react-window` and is now largely superseded.

```js
import { FixedSizeList } from 'react-window';

function Row({ index, style }) {
  return <div style={style}>Row {index}</div>;
}

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={600}        // viewport height
      width="100%"
      itemCount={items.length}
      itemSize={50}       // fixed row height in px
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Why Does It Exist?

The browser's DOM is expensive. A list of 10,000 rows doesn't just consume 10,000× memory — it creates 10,000× layout work. Every DOM node participates in the layout tree; every reflow (triggered by a scroll, a resize, or a style change) involves computing positions for all visible nodes *and* any nodes that might affect the layout of visible nodes.

Rendering 10,000 `<li>` elements produces:
- 10,000 DOM nodes
- A layout tree with 10,000 entries
- 10,000 React fiber nodes
- 10,000+ event listener potentials
- Scroll performance bounded by the total number of layout-affecting elements

Virtualization collapses this to ~15–30 DOM nodes (the visible viewport plus a small overscan buffer) regardless of list size. Scroll performance and memory usage stay flat.

> **Check yourself:** Why does a 10,000-row list hurt performance even if only ~15 rows are visible? Name at least two things that scale with total DOM node count.

---

## How It Works

### The core mechanism

The library:
1. Knows the total number of items and the height of the scroll container
2. Given a `scrollTop` value, calculates which items are within the visible window
3. Renders only those items, positioned absolutely within a tall "phantom" container
4. On scroll, recalculates which items are visible and updates the rendered set

```
Outer container (overflow: scroll, height: 600px)
  Inner container (height: totalItems × itemHeight, no overflow)
    Item 10 (position: absolute, top: 500px)  ← first visible
    Item 11 (position: absolute, top: 550px)
    Item 12 (position: absolute, top: 600px)
    ...
    Item 21 (position: absolute, top: 1050px) ← last visible + overscan
```

The outer container has a fixed height and `overflow: scroll`. The inner container is tall enough to represent all items (creating correct scrollbar proportions). The rendered items are positioned absolutely within the inner container, placed at their correct absolute offsets.

### Fixed vs variable item size

**FixedSizeList** — all items have the same height. The library can calculate any item's position with a multiplication: `offset = index × itemHeight`. O(1) scroll position calculation.

**VariableSizeList** — items can have different heights. The library needs an `itemSize` function `(index) => height` and caches the cumulative heights. Position calculation requires an O(log n) binary search or prefix sum lookup. More complex to set up because you must know (or estimate) each item's height before rendering it.

```js
import { VariableSizeList } from 'react-window';

// You must tell the library how tall each item is
const getItemSize = (index) => itemHeights[index]; // or a formula

<VariableSizeList
  height={600}
  width="100%"
  itemCount={items.length}
  itemSize={getItemSize}
>
  {Row}
</VariableSizeList>
```

---

## Overscan

Virtualization libraries render a few extra items above and below the visible viewport (the "overscan" region). This prevents blank flicker when the user scrolls slightly before the next batch of items is calculated and rendered. The default overscan is usually 1–3 items. Increasing it reduces blank-flash artifacts but increases the DOM node count.

---

## When to Use Virtualization

A rough guide:

| List size | Approach |
|---|---|
| < 100 items | Regular `map` — virtualization adds complexity for no gain |
| 100–500 items | Profile first; often fine without virtualization |
| 500+ items | Consider virtualization, especially if rows are complex |
| 1000+ items | Virtualize |
| Dynamic/infinite | Virtualize + load more on scroll |

---

## Infinite Scroll with Virtualization

Combine virtualization with a load-more trigger:

```js
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

function InfiniteList({ hasMore, loadMore, items }) {
  const isItemLoaded = (index) => !hasMore || index < items.length;

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={hasMore ? items.length + 1 : items.length}
      loadMoreItems={loadMore}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          ref={ref}
          height={600}
          width="100%"
          itemCount={hasMore ? items.length + 1 : items.length}
          itemSize={60}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <div style={style}>
              {isItemLoaded(index) ? items[index].name : 'Loading...'}
            </div>
          )}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
}
```

`react-window-infinite-loader` bridges `react-window` with the load-more pattern: it tracks which items have been rendered and calls `loadMoreItems` when the user scrolls near the end.

---

## TanStack Virtual (Headless)

TanStack Virtual is a headless virtualizer — it provides the scroll math but no DOM structure. You own the markup:

```js
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef();

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,
              height: `${virtualItem.size}px`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

The headless approach gives full styling control and works with tables, grids, and any custom layout that `react-window`'s opinionated DOM structure doesn't support.

> **Check yourself:** What is the difference between `react-window` and TanStack Virtual? When would you choose one over the other?

---

## Gotchas

**1. The `style` prop from `react-window` is mandatory.**

Each rendered row receives a `style` prop from the library containing the `position: absolute` and `top` offset. If you don't spread or apply this style, the item renders at the wrong position and the list breaks visually.

```js
// Wrong — style not applied:
function Row({ index, style }) {
  return <div>{items[index].name}</div>;
}

// Correct:
function Row({ index, style }) {
  return <div style={style}>{items[index].name}</div>;
}
```

**2. Variable heights must be known before render.**

If you use `VariableSizeList` and measure heights after render (via ResizeObserver), you'll need to call `listRef.current.resetAfterIndex(index)` to invalidate the height cache and force a recalculation. Otherwise the list uses stale heights and items stack incorrectly.

**3. Virtualized lists and accessibility.**

Screen readers and browser find-in-page (`Ctrl+F`) only see rendered DOM nodes — virtualized items outside the viewport are invisible to them. For truly accessible long lists, consider pagination (fixed page of results) instead of virtualization. If virtualization is required, ensure ARIA attributes (like `aria-rowcount` on a table) communicate the total count.

**4. Animate with caution.**

CSS animations on list items interact poorly with virtualization — items are mounted and unmounted as the user scrolls, resetting animations mid-flight. If items need enter/exit animations, each mount triggers the animation, which can look choppy.

**5. Row components should be memoized.**

The list re-renders the visible window on every scroll event. Without `React.memo` on the row component, every scroll re-renders all visible rows:

```js
const Row = React.memo(function Row({ index, style, data }) {
  return <div style={style}>{data[index].name}</div>;
});
```

Pass `data` via the `itemData` prop (react-window) so rows don't close over the parent's render scope.

---

## Interview Questions


**Q (High): What is list virtualization and when should you use it?**

Answer: Virtualization renders only the subset of list items currently visible in the viewport, positioning them absolutely within a tall container that represents the full list size. As the user scrolls, items leaving the viewport are unmounted and new items entering it are mounted — the DOM stays small regardless of list length. You should use it for lists with 500+ items, especially when rows are complex (images, nested components). For small lists (< 100 items), the complexity of virtualization exceeds any benefit — a regular `map` is fine. Profile first: the real signal is layout performance (long frame times during scroll) or initial render time caused by thousands of DOM nodes.

---

**Q (High): How does react-window know which items to render when the user scrolls?**

Answer: It uses the container's `scrollTop` value and the item sizes. For fixed-size lists: `firstVisibleIndex = Math.floor(scrollTop / itemHeight)`, `lastVisibleIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight)`. It renders items in that range plus a small overscan buffer above and below to prevent blank flicker during fast scrolling. For variable-size lists, it maintains a prefix sum of cumulative heights and uses a binary search to find the visible range. On every scroll event, it recalculates the visible range and updates which items are rendered.

---
**Q (Medium): What's the difference between `react-window` and TanStack Virtual?**

Answer: `react-window` is opinionated — it owns the DOM structure (outer scroll container + inner absolute-positioned container) and you provide a row renderer. It's simpler to set up and works for most standard lists and grids. TanStack Virtual is headless — it only provides the math (which indices are visible, what offset each item should be at). You own all the markup. This makes it more flexible: it works with tables, masonry layouts, horizontal scrolling, and any custom DOM structure that `react-window`'s preset layout can't accommodate. The tradeoff is that headless requires more boilerplate.

---

**Q (Medium): What happens to accessibility and find-in-page when you virtualize a list?**

Answer: Both break for content outside the viewport. Screen readers announce only what's in the DOM — virtual items that haven't been rendered don't exist from the AT's perspective. Browser `Ctrl+F` only searches rendered text. For a product list of 10,000 items, a user searching for "blue widget" may not find it if it's outside the scroll window. Mitigations: (1) Use pagination instead of virtualization for content that must be searchable. (2) Add ARIA attributes like `aria-rowcount` and `aria-rowindex` to communicate total size to screen readers. (3) Accept the limitation and ensure the search/filter UX reduces the visible set to manageable size before displaying the virtual list.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the phantom container pattern — how the scrollbar stays proportional without rendering all items
- [ ] Can describe how `react-window` calculates which items to render given a `scrollTop` value
- [ ] Can explain the difference between `FixedSizeList` and `VariableSizeList` and when to use each
- [ ] Can name the most common `react-window` mistake (forgetting to apply the `style` prop)
- [ ] Can explain the accessibility limitation of virtualization and name two mitigations

---

*Next: Profiler API & DevTools Profiler — now that you know all the things that cause performance problems, the next topic covers how to measure and locate them precisely.*
