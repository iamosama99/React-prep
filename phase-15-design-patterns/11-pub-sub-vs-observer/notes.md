# Pub-Sub vs Observer

## Quick Reference

| | Observer | Pub-Sub |
|---|---|---|
| Shape | **Subject** holds a list of **observers** and calls them directly | **Publishers** emit to a **broker/bus**; **subscribers** listen on the bus |
| Who knows whom | Observers know the subject (they `subscribe` to *it*) | Publishers and subscribers know only the bus / topic name |
| Cardinality | One subject → many observers | Many publishers ↔ many subscribers |
| Coupling | Medium (observer references subject) | Low (only the event contract) |
| Delivery | Usually synchronous, in-process | Sync *or* async; can cross tabs, windows, processes |
| In JS/React | `store.subscribe()`, `addEventListener`, Redux/Zustand stores, `useSyncExternalStore` | `EventEmitter`, custom event buses, `BroadcastChannel`, `postMessage` |

## Where You've Seen This Before

- `useSyncExternalStore(subscribe, getSnapshot)` *is* the Observer contract, adapted for React → [Phase 2: useSyncExternalStore](../../phase-02-hooks/14-use-sync-external-store/notes.md)
- Zustand's `create()` is a tiny observable store (`getState`, `setState`, `subscribe`) → [Phase 6: Zustand](../../phase-06-state-management/06-zustand/notes.md); Redux's `store.subscribe` → [Redux core](../../phase-06-state-management/03-redux-core/notes.md)
- DOM events — `addEventListener` / delegation — are Observer in the platform → [Synthetic events](../../phase-01-fundamentals/10-synthetic-events/notes.md)
- Context as the built-in way to broadcast to a subtree (and its re-render cost) → [Topic 8: Provider](../08-provider-pattern/notes.md)
- Subscribing and cleaning up in effects → [useEffect](../../phase-02-hooks/02-use-effect/notes.md)

**New here:** the *classical distinction* between the two patterns (the one interviewers ask for by name), a typed event bus you can write from memory, cross-tab messaging with `BroadcastChannel`, and a decision table for **event bus vs Context vs store**. Nothing about React's core APIs changes — this is about how to structure communication *outside* the parent→child prop flow.

## What Is This?

Both patterns answer the same question: *"how do I tell other code that something happened, without hard-wiring who they are?"* They differ in **who holds the list of listeners**.

### Observer — the subject keeps the list

```ts
class Subject<T> {
  private observers = new Set<(value: T) => void>();
  subscribe(fn: (value: T) => void) {
    this.observers.add(fn);
    return () => this.observers.delete(fn);        // unsubscribe
  }
  next(value: T) { this.observers.forEach(fn => fn(value)); }
}

const temperature = new Subject<number>();
const stop = temperature.subscribe(t => console.log('now', t));
temperature.next(21);
```

An observer must hold a reference to *the subject* to subscribe — it knows what it's watching.

### Pub-Sub — a broker sits in the middle

```ts
type Events = { 'user:login': { id: string }; 'cart:add': { sku: string; qty: number } };

function createEventBus<E extends Record<string, unknown>>() {
  const handlers = new Map<keyof E, Set<(payload: never) => void>>();
  return {
    on<K extends keyof E>(event: K, handler: (payload: E[K]) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler as (p: never) => void);
      return () => handlers.get(event)?.delete(handler as (p: never) => void);   // unsubscribe
    },
    emit<K extends keyof E>(event: K, payload: E[K]) {
      handlers.get(event)?.forEach(h => (h as (p: E[K]) => void)(payload));
    },
  };
}

const bus = createEventBus<Events>();
bus.on('cart:add', ({ sku, qty }) => analytics.track('add', sku, qty));   // subscriber knows only 'cart:add'
bus.emit('cart:add', { sku: 'A1', qty: 2 });                              // publisher knows only 'cart:add'
```

Publisher and subscriber never reference each other — only the event *name and payload contract*. The bus can also filter, queue, replay, or cross a process boundary (`BroadcastChannel`, `postMessage`, a WebSocket).

> **Check yourself:** In the two snippets, which parties import a shared module, and what does each of them need to know about the other? Which one is more decoupled and what does that buy you?

## Why Does It Exist?

**Observer** exists to decouple a source of change from things that react to it: the source doesn't know or care how many listeners there are or what they do. It's how UI toolkits, stores and streams work.

**Pub-Sub** goes a step further: decouple *producers from consumers entirely*, so components with no shared ancestor, no shared module, even no shared window can communicate. That solves problems Context can't:

| Need | Why Context struggles | Pub-Sub fits |
|---|---|---|
| A toast triggered from a non-React module (axios interceptor) | Needs a hook | `bus.emit('toast', …)` from anywhere |
| Two micro-frontends exchanging events | No shared React tree | Bus on `window` / `BroadcastChannel` |
| Analytics that should observe many features | Would need every feature to call it | Features emit; analytics subscribes |
| Sync auth state across browser tabs | Context is per-tab | `BroadcastChannel('auth')` |
| Frequent events (mouse, ticks) | Every consumer re-renders per value | Subscribers choose what to do; no tree re-render |

## How It Works in React

React's data model is declarative: **state flows down, events flow up**. Observer and Pub-Sub are *escape hatches* for communication that doesn't follow the tree. Two uses dominate.

### 1. Observable *state* (Observer): stores

A store is a subject with a value:

```ts
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState(next: T | ((s: T) => T)) {
      state = typeof next === 'function' ? (next as (s: T) => T)(state) : next;
      listeners.forEach(l => l());
    },
    subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  };
}

function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
```

`useSyncExternalStore` is React's official adapter: it subscribes, reads a snapshot, and re-renders when the snapshot changes — and prevents **tearing** (different parts of the tree showing different versions of the store during concurrent rendering). `getSnapshot` must return a **cached, referentially stable** value when nothing changed, or React loops.

### 2. Fire-and-forget *events* (Pub-Sub): a bus with a hook

```tsx
function useBusEvent<E extends Record<string, unknown>, K extends keyof E>(
  bus: Bus<E>, event: K, handler: (payload: E[K]) => void,
) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });             // always call the newest handler

  useEffect(() => bus.on(event, payload => latest.current(payload)), [bus, event]);   // subscribe once, unsubscribe on cleanup
}
```

Returning the unsubscribe function from `on` makes it drop straight into an effect cleanup. The **latest-ref** avoids re-subscribing on every render while still calling a fresh closure ([Topic 3](../03-state-vs-refs-inputs/notes.md)).

### 3. Across tabs: `BroadcastChannel`

```tsx
function useBroadcast<T>(name: string, onMessage: (msg: T) => void) {
  const latest = useRef(onMessage);
  useEffect(() => { latest.current = onMessage; });
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;       // SSR / old browsers
    const ch = new BroadcastChannel(name);
    ch.onmessage = e => latest.current(e.data as T);
    channel.current = ch;
    return () => { ch.close(); channel.current = null; };
  }, [name]);

  return useCallback((msg: T) => channel.current?.postMessage(msg), []);
}
```

A channel delivers to *other* browsing contexts on the same origin — not to the sender. It's Pub-Sub over the browser.

### Which one for what?

| Situation | Reach for |
|---|---|
| Shared UI state read by many components; want re-render on change | **Store + `useSyncExternalStore`** (Observer) |
| Low-frequency app-wide config to a subtree | **Context** ([Topic 8](../08-provider-pattern/notes.md)) |
| Notifications: "something happened" — no value to render from | **Event bus** (Pub-Sub) |
| Cross-tab / cross-window / micro-frontend | **BroadcastChannel / postMessage** (Pub-Sub) |
| Parent ↔ child, siblings via a common parent | **Props / callbacks** (don't reach for events) |

> **Check yourself:** A `ToastHost` subscribes to `'toast'` events, but a toast is emitted *before* `ToastHost` mounts (during app startup). What happens to that event, and what design change would fix it?

## Gotchas

**Forgetting to unsubscribe.** Every `subscribe`/`on` needs cleanup on unmount — a leaked handler keeps components (and their closures) alive and fires setState on unmounted trees. Return the unsubscribe from `on` and use it in effect cleanup. Strict Mode's double effect will expose missing cleanup in dev.

**No replay.** Pub-Sub has no memory: late subscribers miss earlier events. If a subscriber needs the *current* value (state), that's an Observer/store concern — expose `getState`, or use a replaying subject (like RxJS `BehaviorSubject`).

**Stale closures.** A handler subscribed once captures the first render's props/state. Use the latest-ref pattern or resubscribe with correct deps.

**Events as state.** Storing application state as "the last event I heard" scatters truth across components. Events *announce*; state *stores*. If two components must agree on a value, put it in a store or Context.

**Event spaghetti.** With a global bus anyone can emit and anyone can listen; tracing "who caused this?" becomes grep-driven. Mitigate with typed event maps, namespaced names (`'cart:add'`), and a single module owning the bus.

**Stringly-typed events.** `bus.emit('crat:add', …)` fails silently. Generic `EventMap` types make it a compile error.

**Emitting during render.** A publish inside render is a side effect that can fire multiple times (Strict Mode, concurrent). Emit from event handlers or effects.

**Sync re-entrancy.** A handler that emits another event, or unsubscribes during iteration, can mutate the listener set mid-loop. Iterate over a copy (`[...handlers]`).

**`getSnapshot` instability.** Returning a fresh object each call in `useSyncExternalStore` causes an infinite loop. Return the same reference until state actually changes.

**Cross-tab ≠ same-tab.** `BroadcastChannel` doesn't deliver to the posting context; to update your own tab, also apply the change locally.

**Memory/perf.** Thousands of subscribers on a hot event with heavy handlers stall the main thread; throttle, or batch.

## Interview Questions

**Q (High): What's the difference between the Observer and Pub-Sub patterns?**

Answer: In Observer, a subject maintains its list of observers and notifies them directly; observers subscribe to the subject itself, so they're aware of it (a store's `subscribe`, `addEventListener`). In Pub-Sub, publishers and subscribers don't know each other — they communicate through a message broker/event bus keyed by topic, giving lower coupling, many-to-many communication, and the ability to work asynchronously or across boundaries (tabs, windows, services). Observer is typically synchronous and in-process; Pub-Sub is a broader, more decoupled pattern.

The trap: Treating them as synonyms, or reversing which one has a mediator. The discriminator is the broker in the middle.

**Q (High): Implement a simple event bus in TypeScript.**

Answer: A `Map<event, Set<handler>>`. `on(event, handler)` adds the handler and returns an unsubscribe function; `emit(event, payload)` calls each handler; optionally `once` and `off`. Use a generic event map for type-safe names and payloads; iterate over a copy of the set when emitting to tolerate handlers that unsubscribe. In React, wrap `on` in a `useEffect` returning the unsubscribe, and keep the handler in a ref to avoid stale closures without resubscribing.

The trap: Forgetting the unsubscribe return, using untyped strings, or mutating the set while iterating.

**Q (High): How does `useSyncExternalStore` relate to these patterns and why does it exist?**

Answer: It's React's adapter for Observer-style external stores: you give it `subscribe`, `getSnapshot` (and `getServerSnapshot`); it subscribes, reads the snapshot during render and re-renders when the snapshot changes. It exists because `useEffect + setState` subscriptions can *tear* under concurrent rendering — different components observing different versions of the store in one render pass. It forces synchronous, consistent reads. `getSnapshot` must return a stable reference when nothing changed.

The trap: Implementing store subscription with `useEffect` + `useState` and calling it done, or returning new objects from `getSnapshot`.

**Q (Medium): When would you use an event bus instead of Context or a store?**

Answer: When you're announcing something that *happened* rather than sharing *state* to render — notifications, analytics, cross-cutting side effects, calls from non-React code (interceptors, workers), micro-frontends, and cross-tab messaging. Context/store for shared state that components should re-render from; events for fire-and-forget signals. Also useful when high-frequency events shouldn't re-render a whole subtree.

The trap: Using a bus as a global state manager. That produces the "who set this?" spaghetti.

**Q (Medium): How do you sync state between browser tabs?**

Answer: `BroadcastChannel` (or the `storage` event, or `SharedWorker`) — one tab posts a message, other same-origin tabs receive it and update their local state/store. Remember it doesn't deliver to the sender, so apply the change locally too; feature-detect for SSR/old browsers; close the channel on unmount. For persisted state, `localStorage` plus the `storage` event is an alternative.

The trap: Expecting the poster to receive its own message or forgetting to `close()`.

**Q (Medium): What memory-leak risks come with these patterns in React?**

Answer: Subscribing without unsubscribing keeps handlers (and the component closures they reference) alive after unmount and can call `setState` on dead components. Fix: return the unsubscribe from `subscribe/on` and call it in the effect cleanup; verify under Strict Mode. Also avoid global buses holding references to large objects.

The trap: Saying "React cleans up for you." It only cleans what you return from effects.

**Q (Low): React is described as favouring Pub-Sub over Observer. Is that accurate?**

Answer: Partly a simplification. React's own model is declarative state-down/events-up. But at the boundaries: external stores follow Observer (`subscribe`/`getSnapshot`), and cross-cutting or cross-boundary notifications follow Pub-Sub. Neither is core to React; both are how you integrate with things outside its tree.

The trap: Claiming React internally uses one or the other as a defining principle.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain Observer vs Pub-Sub in one sentence each (who holds the list? who knows whom?)
- [ ] Can write a typed event bus with `on` returning an unsubscribe, and a `useBusEvent` hook with a latest-ref
- [ ] Can write `createStore` and bridge it with `useSyncExternalStore`, explaining snapshot stability and tearing
- [ ] Can implement cross-tab messaging with `BroadcastChannel` and list its gotchas
- [ ] Can choose between event bus, Context and a store for four example scenarios
- [ ] Can list five failure modes: leaks, no replay, stale closures, events-as-state, spaghetti

---
*Next: [Performance Patterns I — Re-renders & Memoisation](../12-performance-rerender-patterns/notes.md) — everything so far decides how components talk; next is making sure they don't talk (re-render) more than they need to.*
