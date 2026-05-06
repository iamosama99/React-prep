# Web Vitals in React

## What Is This?

Core Web Vitals are Google's standardized metrics for measuring real-user page experience. They quantify what users actually feel — loading speed, visual stability, and interactivity responsiveness — rather than synthetic benchmarks. Google uses them as ranking signals in search.

The three core metrics:
- **LCP (Largest Contentful Paint)** — how fast the main content loads
- **CLS (Cumulative Layout Shift)** — how stable the layout is during load
- **INP (Interaction to Next Paint)** — how responsive the page is to user input

Plus supporting metrics: FCP (First Contentful Paint), TTFB (Time to First Byte), FID (First Input Delay — replaced by INP in March 2024).

---

## Why Does It Exist?

Before Core Web Vitals, performance benchmarks were lab-based and developer-centric: Lighthouse scores, synthetic load times, DOMContentLoaded. These didn't correlate well with what users experienced in the field. Two pages with the same Lighthouse score could feel very different depending on how content loaded, whether things jumped around, and how long clicks took to register.

Core Web Vitals are measured from real users' browsers via the Chrome User Experience Report (CrUX). They represent the 75th percentile of field data — if 25% of your real users have a poor experience, you fail the metric. This shifts the focus from "how fast is it in my lab" to "how fast is it for my users."

---

## The Three Core Metrics

### LCP — Largest Contentful Paint

**What it measures:** The render time of the largest image or text block visible in the viewport.

**Thresholds:** Good ≤ 2.5s / Needs Improvement ≤ 4.0s / Poor > 4.0s

**What counts as "largest":** `<img>`, `<image>` inside SVG, `<video>` poster images, background images loaded via CSS, and large block-level text.

**Common LCP elements in React apps:** hero images, above-the-fold headings, product images in e-commerce.

**React-specific causes of poor LCP:**
- Hydration delays — SSR HTML arrives fast, but the LCP element is behind a JS-rendered component that waits for hydration
- Large JS bundles blocking render
- Components that fetch data before showing content (waterfall: render → fetch → render)
- Images not given priority loading (`loading="eager"`, `fetchpriority="high"`)

**Fixes:**
```js
// Preload the LCP image in the <head>:
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

// In Next.js — mark the LCP image with priority:
import Image from 'next/image';
<Image src="/hero.webp" priority alt="Hero" />

// Avoid render-blocking JS — use code splitting for non-critical routes
// Avoid data-fetching waterfalls on the critical path — fetch in parallel
```

---

### CLS — Cumulative Layout Shift

**What it measures:** The total amount of unexpected layout shift throughout the page's lifetime. A layout shift is when visible content moves from one position to another without user interaction.

**Thresholds:** Good ≤ 0.1 / Needs Improvement ≤ 0.25 / Poor > 0.25

**The formula:** `impact fraction × distance fraction` summed across all shifts. A large element moving a large distance is catastrophic; a tiny element moving slightly is negligible.

**Common CLS causes in React apps:**

**1. Images without dimensions:**
```js
// Bad — browser doesn't know height before image loads → layout shift:
<img src="/photo.jpg" alt="photo" />

// Good — reserves space before image loads:
<img src="/photo.jpg" width={600} height={400} alt="photo" />
// Or CSS aspect-ratio:
<img src="/photo.jpg" style={{ aspectRatio: '3/2', width: '100%' }} alt="photo" />
```

**2. Dynamic content inserted above existing content:**
```js
// Bad — notification banner inserted at top pushes everything down:
{hasNotification && <NotificationBanner />}

// Better — reserve space for the banner even when empty:
<div style={{ minHeight: '48px' }}>
  {hasNotification && <NotificationBanner />}
</div>
```

**3. Web fonts causing text swap (FOUT):**
Use `font-display: optional` or `font-display: swap` with explicit font metric overrides to prevent text from jumping when the web font loads.

**4. Skeleton screens that are wrong sizes:**
If your loading skeleton is a different height than the real content, content shifts when data arrives. Match skeleton dimensions to the expected content size.

---

### INP — Interaction to Next Paint

**What it measures:** The latency from when a user interacts (click, keypress, tap) to when the next frame is painted — measuring all interactions throughout the page's lifetime and reporting the worst one at the 98th percentile.

**Thresholds:** Good ≤ 200ms / Needs Improvement ≤ 500ms / Poor > 500ms

INP replaced FID (First Input Delay) in March 2024. FID only measured the first interaction and only the input delay (not the processing or paint time). INP measures all interactions, including the full cycle from input to paint.

**React-specific causes of poor INP:**

**1. Long event handlers — heavy synchronous work on click:**
```js
// Bad — synchronous filtering of 10,000 items on keystroke:
function handleChange(e) {
  setQuery(e.target.value);
  const filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(e.target.value)
  );
  setFiltered(filtered); // triggers a potentially expensive render
}

// Better — defer expensive filtering:
function handleChange(e) {
  setQuery(e.target.value); // updates input immediately
  startTransition(() => {
    setFiltered(allItems.filter(...)); // can be interrupted if user types again
  });
}
```

**2. Large component trees that render on every keystroke:**
Use `useDeferredValue` to show stale results during a transition, or `useTransition` to mark the filtering render as low-priority.

**3. Long tasks blocking the main thread:**
Any JavaScript that runs for > 50ms is a "long task" and delays the browser's ability to respond to input. Profile with Chrome DevTools → Performance tab, look for red triangles on tasks.

**4. Third-party scripts:**
Analytics, chat widgets, and ad scripts often run on the main thread and compete with user interactions. Move them to web workers or load them with `defer`/`async`.

---

## Measuring Web Vitals in React

### `web-vitals` library

```js
import { onLCP, onCLS, onINP } from 'web-vitals';

onLCP(metric => {
  console.log('LCP:', metric.value);
  sendToAnalytics({ name: metric.name, value: metric.value });
});

onCLS(metric => {
  console.log('CLS:', metric.value);
  sendToAnalytics({ name: metric.name, value: metric.value });
});

onINP(metric => {
  console.log('INP:', metric.value);
  sendToAnalytics({ name: metric.name, value: metric.value });
});
```

These callbacks fire at the right time for each metric — LCP when it's finalized (page hidden or user interacts), CLS continuously, INP on each interaction.

### In create-react-app / Vite projects

CRA scaffolded a `reportWebVitals.js` file. For Vite, add it manually in `main.js`:

```js
import { onLCP, onCLS, onINP } from 'web-vitals';

function sendToAnalytics({ name, value }) {
  navigator.sendBeacon('/analytics', JSON.stringify({ name, value }));
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

### In Next.js

Next.js has built-in Web Vitals support via the `reportWebVitals` export in `_app.js` (Pages Router) or `NextWebVitalsMetric` in App Router:

```js
// pages/_app.js
export function reportWebVitals(metric) {
  console.log(metric); // { name, value, id, startTime, label }
}
```

---

## The React-INP Connection

INP is the metric most affected by React-specific decisions. React renders synchronously by default — a state update on a click blocks the thread for the full render duration. React 18's concurrent features directly target this:

- `useTransition` / `startTransition` — marks expensive renders as interruptible, so input stays responsive
- `useDeferredValue` — shows stale content while new content is being computed
- Automatic batching — reduces the number of renders per interaction

A page with poor INP is often one where an event handler triggers an expensive synchronous React render. The fix is usually one of: virtualization (fewer nodes to render), memoization (fewer components to re-render), or `useTransition` (interruptible rendering of the expensive part).

---

## Gotchas

**1. INP is the 98th percentile of all interactions, not the average.**

One slow click can hurt your INP score significantly. A button that's slow because it triggers an expensive synchronous render may be rarely clicked — but if your 98th percentile INP lands on that interaction, you fail. Profile all interaction paths, not just the common ones.

**2. CLS can occur after page load.**

CLS is cumulative across the page lifetime, including after load — late-loading ads, cookie banners, and dynamically injected content can all cause CLS minutes into a session.

**3. LCP is not the same as FCP.**

FCP (First Contentful Paint) fires when any content first appears — even a tiny spinner counts. LCP fires when the largest content element is rendered. They can be far apart: FCP when a loading skeleton appears, LCP when the actual image finally loads after a data fetch.

**4. React DevTools Profiler ≠ Web Vitals.**

React DevTools shows render duration (React-side). Web Vitals measure browser-side user experience: layout, paint, and input latency. They're complementary — a fast React render (good DevTools numbers) can still produce a poor INP if the resulting DOM changes trigger heavy browser layout.

---

## Interview Questions

**Q (High): What are Core Web Vitals and which one is most affected by React-specific code?**

Answer: Core Web Vitals are Google's three user-experience metrics: LCP (how fast the largest content loads), CLS (how stable the layout is), and INP (how quickly the page responds to interactions). INP is most directly affected by React decisions. It measures the latency from user interaction to the next paint — in React, this means the cost of the event handler plus the re-render triggered by it. An expensive synchronous React render in response to a click directly lengthens INP. The React 18 concurrent features (`useTransition`, `useDeferredValue`) were built precisely to address this: they allow expensive renders to be interruptible, so the browser can paint a response frame quickly while the heavy computation continues in the background.

---

**Q (High): A React app has poor INP. What are the likely causes and how would you fix them?**

Answer: Poor INP usually means interactions trigger expensive synchronous work on the main thread. Common React causes: (1) A large component tree re-renders on every keystroke — fix with `useTransition` to mark the render as low-priority and `useDeferredValue` to show stale results during the transition. (2) A heavy event handler doing synchronous data transformation — move expensive computation off-thread with a web worker, or use `useMemo` to cache the result. (3) A virtualized list not being used — rendering 1000 rows on a filter change is expensive; virtualize the list. (4) Third-party scripts competing for main thread time — defer or async-load non-critical scripts. Measure with Chrome DevTools → Performance tab to identify the specific long tasks, then target the worst offenders.

---

**Q (High): What causes CLS in a React app and how do you prevent it?**

Answer: Three main causes. First, images and media without explicit dimensions — the browser doesn't know how much space to reserve, so when the image loads it shifts everything below it. Fix: always set `width` and `height` on images, or use CSS `aspect-ratio`. Second, dynamically injected content — a notification banner or cookie consent that appears above the fold pushes content down. Fix: reserve space with `min-height` or animate content in a way that doesn't affect layout (transform-based animations don't cause CLS). Third, skeleton loading screens with wrong dimensions — if the skeleton is a different height than the real content, content jumps when data loads. Fix: match skeleton dimensions exactly to the expected content. CLS is also reported as a cumulative score across the page's lifetime — late-loading ads are a persistent source.

---

**Q (Medium): What is the difference between FID and INP? Why did INP replace FID?**

Answer: FID (First Input Delay) measured only the delay before the browser started processing the first user interaction on the page — not the full response time, and only the first interaction. A page that was slow on every interaction after the first had a perfect FID. INP (Interaction to Next Paint) measures the full latency — from input to paint — for all interactions throughout the page's lifetime, then reports the worst one at the 98th percentile. INP is a more complete and honest measurement of interactivity. A page that feels sluggish on every button click but loads fast registers that sluggishness in INP; FID would have reported it as fine. React apps with expensive renders are specifically affected because INP measures the render time, not just the input delay.

---

*Next: Concurrent Rendering — the final topic of Phase 5 ties together Fiber (the mechanism), automatic batching, useTransition, and the scheduler to explain how React 18's concurrent mode enables all the INP improvements and responsive UIs discussed throughout this phase.*
