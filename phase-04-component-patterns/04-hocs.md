# Higher-Order Components (HOCs)

## What Is This?

A Higher-Order Component is a function that takes a component and returns a new, enhanced component. It's the component equivalent of a higher-order function.

```jsx
const EnhancedComponent = withSomeBehavior(OriginalComponent);
```

The HOC wraps the original, adds something — props, lifecycle behavior, state, context consumption — and passes everything through to the wrapped component. The original component knows nothing about the wrapping.

```jsx
function withCurrentUser(WrappedComponent) {
  return function WithCurrentUser(props) {
    const user = useCurrentUser(); // context consumer, subscription, etc.
    return <WrappedComponent currentUser={user} {...props} />;
  };
}

const ProfilePageWithUser = withCurrentUser(ProfilePage);
// ProfilePage receives `currentUser` as a prop automatically
```

## Why Does It Exist?

HOCs come from functional programming's concept of function composition. If you can compose functions, why not compose components?

The problem they solve: before hooks, there was no way to share stateful logic between class components without one of three bad options — mixins (removed in React 0.13 due to collisions and implicit dependencies), utility inheritance (tight coupling), or copy-pasting the logic everywhere.

HOCs solved this by treating components as first-class values you could transform. You could write `connect()` once and apply it to any component that needed Redux store access. You could write `withErrorBoundary()` and wrap anything in it. The pattern became ubiquitous: Redux's `connect`, React Router's `withRouter`, Relay's `createFragmentContainer`.

They're now largely replaced by hooks for logic sharing, but they still serve a specific role: **cross-cutting concerns that need to wrap arbitrary components at the module level**.

## How It Works

The minimal structure:

```jsx
function withExtra(WrappedComponent) {
  function WithExtra({ forwardedRef, ...props }) {
    const extra = computeSomething();
    return <WrappedComponent ref={forwardedRef} extra={extra} {...props} />;
  }
  
  WithExtra.displayName = `withExtra(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;
  
  return WithExtra;
}
```

Key points:
- The inner function gets a new name with `displayName` so DevTools shows something useful
- All props are passed through with `{...props}` — don't swallow props
- `ref` doesn't pass through `{...props}` automatically — handle it explicitly with `forwardRef`

### HOC with `forwardRef`

```jsx
function withLogging(WrappedComponent) {
  const WithLogging = React.forwardRef((props, ref) => {
    useEffect(() => {
      console.log(`${WrappedComponent.name} mounted`);
    }, []);
    return <WrappedComponent ref={ref} {...props} />;
  });
  
  WithLogging.displayName = `withLogging(${WrappedComponent.name})`;
  return WithLogging;
}
```

Without this, `ref` on `<EnhancedComponent ref={myRef}>` would refer to the HOC's wrapper element, not the inner component's DOM node.

### Composing Multiple HOCs

```jsx
const enhance = compose(
  withCurrentUser,
  withPermissions,
  withAnalytics,
);

const EnhancedPage = enhance(PageComponent);
```

`compose` applies HOCs right-to-left (mathematical function composition): `withAnalytics(withPermissions(withCurrentUser(PageComponent)))`. The props injected by `withCurrentUser` are available in `withPermissions`, which in turn are available in `withAnalytics`.

## Common Real-World HOCs

**React Redux `connect` (pre-hooks era):**
```jsx
const mapStateToProps = state => ({ count: state.counter.value });
const mapDispatchToProps = { increment };
export default connect(mapStateToProps, mapDispatchToProps)(Counter);
```

**Error boundaries as HOCs:**
```jsx
function withErrorBoundary(WrappedComponent, FallbackUI) {
  return class extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
      if (this.state.hasError) return <FallbackUI />;
      return <WrappedComponent {...this.props} />;
    }
  };
}
// Error boundaries must be class components — this is a legitimate current use
```

**Authentication guards:**
```jsx
function withAuth(WrappedComponent) {
  return function WithAuth(props) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} />;
  };
}
```

## HOCs vs Hooks — The Real Trade-Off

```jsx
// HOC
const ProfilePage = withCurrentUser(function({ currentUser, ...rest }) {
  return <div>Hello {currentUser.name}</div>;
});

// Hook
function ProfilePage() {
  const currentUser = useCurrentUser();
  return <div>Hello {currentUser.name}</div>;
}
```

| | HOC | Hook |
|---|---|---|
| Applied at | Definition time | Call time |
| Extra wrapper | Yes — adds a component to the tree | No |
| Prop injection | Yes — receiver must declare the prop | No — data is local |
| Prop name collision | Yes — two HOCs can inject same name | No |
| Conditional use | Possible | Forbidden by Rules of Hooks |
| TypeScript | Hard — inferring through wrappers | Straightforward |
| Static analysis | Hard | Easy |

The remaining legitimate uses for HOCs:
1. **Error boundaries** — class component wrappers can't be replaced by hooks
2. **Wrapping third-party components you don't own** — can't add hooks inside them
3. **Decorator-like patterns** — when you want to enhance at definition time and the enhancement is orthogonal to the component's purpose
4. **Existing codebases** — HOCs are deeply embedded in many React codebases from 2016–2020

## Gotchas

**Don't create HOCs inside render.** Every render creates a new component identity, which causes remounts:

```jsx
// Bad
function Parent() {
  const Enhanced = withExtra(Child); // new component type every render
  return <Enhanced />;
}

// Good — at module level
const Enhanced = withExtra(Child);
function Parent() {
  return <Enhanced />;
}
```

**HOCs swallow static methods.** If `WrappedComponent` has static methods, the returned HOC doesn't have them:

```jsx
// The static method is lost
const Enhanced = withAuth(Component); // Enhanced.myStatic is undefined
```

Fix with `hoist-non-react-statics`:
```jsx
import hoistNonReactStatics from 'hoist-non-react-statics';
function withAuth(WrappedComponent) {
  function WithAuth(props) { ... }
  hoistNonReactStatics(WithAuth, WrappedComponent);
  return WithAuth;
}
```

**Refs don't pass through without `forwardRef`.** This trips people up — a `ref` on a HOC-wrapped component points to the HOC, not the inner component's DOM node.

**Prop name collisions are silent.** If `withCurrentUser` injects `user` and the caller also passes `user`, one silently overwrites the other depending on spread order. HOC authors must document injected prop names, and callers must know to avoid them. Hooks avoid this entirely since the data is local.

**Multiple HOCs make DevTools painful.** `withA(withB(withC(Component)))` shows up as `withA(withB(withC(Component)))` in the React DevTools tree — four levels of components for what is conceptually one. This makes debugging tedious. Hooks contribute zero extra tree depth.

**Typing HOCs in TypeScript is genuinely hard.** Getting TypeScript to correctly infer that the HOC removes `currentUser` from the exposed prop surface (since the HOC provides it) requires mapped types and conditional types. Hooks make this trivial since you just declare a return type.

## Interview Questions

**Q (High): What is a HOC and when is it still the right choice over hooks?**

Answer: A HOC is a function that takes a component and returns an enhanced component. It was the primary pattern for sharing logic between class components before hooks. Today, hooks cover most of the same ground, but HOCs are still the right choice when: (1) you need an error boundary wrapper, since error boundaries must be class components; (2) you're wrapping a third-party component you can't add hooks to; (3) you want to enhance a component at definition time rather than use time, like a static decorator. In a greenfield hooks codebase, a custom hook is almost always simpler, but HOCs appear throughout existing codebases and library APIs.

The trap: "HOCs are deprecated / bad." They're not deprecated — they're just less often the best tool. Saying this in an interview signals unfamiliarity with real codebases.

**Q (High): What are the main failure modes of HOCs?**

Answer: Four big ones. First, prop collisions: two HOCs injecting the same prop name overwrite each other silently. Second, refs don't pass through without explicit `forwardRef` handling — the ref points to the wrapper, not the inner component. Third, static methods aren't copied to the wrapper automatically, so you lose them unless you use `hoist-non-react-statics`. Fourth, defining HOCs inside render creates a new component type on every render, causing full remounts. Each of these is avoidable with care, but they're footguns that hooks eliminate entirely by keeping logic local.

The trap: Only mentioning "wrapper hell" (DevTools noise). That's a DX complaint, not a correctness issue. The real failure modes involve props, refs, and statics.

**Q (High): Why doesn't `ref` pass through a HOC automatically?**

Answer: `ref` is not a prop — it's handled specially by React outside the props system. When you put a `ref` on `<Enhanced ref={r}>`, React attaches it to the `Enhanced` component (or its root DOM node), not to the inner `WrappedComponent`. The only way to pass the ref through is to wrap the returned component in `React.forwardRef`, which gives you the ref as a second argument to the render function and lets you pass it to the wrapped component explicitly. This is one reason HOCs are more complex to implement correctly than hooks.

The trap: Saying "just use `...props` and it will pass through." `ref` is not in `props`.

**Q (Medium): Why do HOCs make TypeScript harder than hooks?**

Answer: A HOC takes a component that expects props `A & B` (where `B` is the injected prop) and returns a component that expects only `A` (since the HOC provides `B`). Expressing this in TypeScript — that the HOC "removes" certain props from the outer interface — requires `Omit`, conditional types, and careful generic constraints. The types are correct but complex. With a hook, you just call it and get back a value with a straightforward type; the consuming component's props never include the hook's internal state. TypeScript's inference works naturally.

The trap: Only saying "HOCs are hard to type" without explaining why.

---
*Next: Custom Hooks as the Modern Pattern — why hooks subsume both render props and HOCs for most logic-sharing use cases, and how to think about the design of a good custom hook.*
