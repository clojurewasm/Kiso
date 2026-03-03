# 07: su Framework Design

**Package**: `@kiso/su` — Reactive UI framework built on `@kiso/cljs`.
**Dependency**: `@kiso/su` depends on `@kiso/cljs`. `@kiso/cljs` must NOT depend on `@kiso/su`.

---

## Design Principles

1. **Zero dependencies** — no React, Preact, Lit, or other UI framework.
2. **~3 KB gzipped** — VanJS (1KB) proves reactive UI can be tiny.
3. **Fine-grained reactivity** — Signal/atom-level DOM binding, no virtual DOM.
4. **Compile-time optimization** — defc macro statically separates hiccup into template + effects.
5. **Clojure-idiomatic** — hiccup vectors, atom/deref, standard destructuring.
6. **1st dogfooding target** — drives @kiso/cljs feature completion.

Research base: Reagent, UIx, Helix, Hoplon, Replicant, Zero, Squint, SCI,
VanJS, Solid.js, Lit, TC39 Signals proposal. See `private/001_su/01_su_design.md`.

---

## Architecture Overview

```
@kiso/su/
├── clj/su/core.cljs          defc, defstyle macros (ClojureScript source)
├── runtime/
│   ├── reactive.ts            track(), effect(), computed()     ~50 LOC
│   ├── hiccup.ts              hiccup→DOM, bind(), mount()      ~100 LOC
│   ├── css.ts                 injectStyle(), scopeClass()      ~30 LOC
│   ├── lifecycle.ts           on-mount, on-unmount hooks       ~20 LOC
│   └── index.ts               public API
├── vite-plugin.ts             HMR support for .cljs components
└── package.json               peerDependencies: { "@kiso/cljs": "^0.1" }
```

Total runtime: ~200 LOC TypeScript, ~3 KB gzipped.

---

## Reactive Model

### Choice: VanJS-style Signals integrated with Kiso atom

**Rationale** (from research):

| Model | Auto-tracking | Granularity | Complexity | Size |
|-------|--------------|-------------|-----------|------|
| Reagent ratom | deref-based | component | medium | ~200 LOC |
| Hoplon cells | formula macro | cell | medium | ~300 LOC |
| VanJS signals | getter-based | DOM node | **low** | **~50 LOC** |
| Solid.js signals | getter-based | DOM node | medium | ~300 LOC |
| React hooks | manual deps | component | high | React dep |

VanJS proves the model works in ~50 lines. su adopts the same pattern,
with Kiso's existing `atom` as the state primitive.

### Core Primitives

```
atom         — mutable state container (already in @kiso/cljs runtime)
computed     — derived state, auto-tracks atom dependencies
effect       — side-effect that re-runs when tracked atoms change
bind         — DOM-level effect: re-creates a DOM node when dependencies change
```

### Tracking Mechanism

```typescript
// su-runtime/reactive.ts (~50 LOC)

let currentTracking: Set<Atom> | null = null;

function track<T>(fn: () => T): [T, Set<Atom>] {
  const deps = new Set<Atom>();
  const prev = currentTracking;
  currentTracking = deps;
  try { return [fn(), deps]; }
  finally { currentTracking = prev; }
}

// Called from atom's deref path — this is the integration point with @kiso/cljs
function notifyTracking(atom: Atom): void {
  currentTracking?.add(atom);
}

function effect(fn: () => void): () => void {
  let cleanup: (() => void) | null = null;
  const run = () => {
    if (cleanup) cleanup();
    const [_, deps] = track(fn);
    const unsubs: (() => void)[] = [];
    for (const dep of deps) {
      unsubs.push(dep.addWatch(run));
    }
    cleanup = () => unsubs.forEach(u => u());
  };
  run();
  return () => { if (cleanup) cleanup(); };
}

function computed<T>(fn: () => T): { deref(): T } {
  let value: T;
  let dirty = true;
  const watchers = new Set<() => void>();
  const recompute = () => {
    const [newVal, deps] = track(fn);
    if (newVal !== value) {
      value = newVal;
      for (const w of watchers) w();
    }
    dirty = false;
  };
  // ... (subscribes to deps, recomputes on change)
  return { deref() { notifyTracking(this); if (dirty) recompute(); return value; } };
}
```

### @kiso/cljs Integration Point (CRITICAL)

su's reactive tracking requires a hook in atom's `deref` path. Two options:

**Option A: Runtime hook (recommended)**
```typescript
// In @kiso/cljs atom.ts — add an optional notify callback
export function deref(atom: Atom): any {
  if (atom._trackingHook) atom._trackingHook(atom);
  return atom.value;
}
```
su-runtime sets `atom._trackingHook = notifyTracking` at initialization.
@kiso/cljs has no knowledge of su — the hook field exists but is unused without su.

**Option B: Protocol-based**
```typescript
// atom implements IDeref protocol
// su's track() temporarily replaces the protocol dispatch for deref
```
This requires the Protocol system (Batch B) to be complete.

**Recommended**: Option A for initial implementation, migrate to Option B after protocols.

---

## Rendering: Direct DOM with Fine-Grained Binding

### No Virtual DOM

Research confirms: when reactivity is fine-grained (atom → DOM node), virtual DOM
diffing is unnecessary. VanJS, Solid.js, and Hoplon all prove this.

su follows the **Solid.js compilation model**:
1. defc macro analyzes hiccup at compile time
2. Static parts → DOM template (created once, cloned)
3. Dynamic parts → `effect()` / `bind()` calls (update only changed nodes)

### bind() — The DOM Binding Primitive

```typescript
// su-runtime/hiccup.ts
function bind(fn: () => any, currentNode?: Node): Node {
  const [result, deps] = track(fn);
  let node = toNode(result);
  for (const dep of deps) {
    dep.addWatch(() => {
      const [newResult] = track(fn);
      const newNode = toNode(newResult);
      node.replaceWith(newNode);
      node = newNode;
    });
  }
  return node;
}
```

### mount() — Component Mounting

```typescript
function mount(rootEl: Element, component: () => any): void {
  const dom = renderHiccup(component());
  rootEl.appendChild(dom);
}
```

---

## Hiccup Format

### Syntax

```clojure
[:tag#id.class1.class2 {:attr "val"} child1 child2]
```

Standard Clojure hiccup. Same as Reagent/Replicant.

### Tag Parsing

`parse-tag` splits `:div#app.main.dark` → `{tag: "div", id: "app", classes: ["main", "dark"]}`.

### Attribute Map

| Key | Behavior |
|-----|----------|
| `:class` | String, keyword, vector, or atom. Merged with tag classes. |
| `:style` | Map `{:color "red"}`. Dynamic via atom. |
| `:on-click` (`:on-*`) | addEventListener. Value is a function. |
| `:key` | Reconciliation key for list items. |
| `:ref` | Callback `(fn [el] ...)` called with DOM node after mount. |

When an attribute value is an atom or a function returning an atom deref,
it is wrapped in `effect()` to update the DOM attribute reactively.

### Children

| Type | Handling |
|------|----------|
| String, number | `document.createTextNode()` |
| Vector `[:tag ...]` | Recursive `renderHiccup()` |
| `nil` | Skipped |
| Sequence (from `map`/`for`) | Flattened |
| Atom deref `@x` | Wrapped in `bind()` — reactive text/subtree |
| Function | Wrapped in `bind()` — reactive subtree |

### Component References

```clojure
;; Using a defc component inside hiccup:
[counter {:initial 5}]
;; counter is a symbol resolving to the component function
```

Components are called as functions, receiving a props map.

---

## defc Macro

### Input Syntax

```clojure
(defc counter
  "Optional docstring."
  [{:keys [initial] :or {initial 0}}]
  (let [count (atom initial)]
    [:div.counter
      [:span "Count: " @count]
      [:button {:on-click #(swap! count inc)} "+"]]))
```

### Expansion

defc expands to a function definition + component metadata:

```clojure
(defn counter [props]
  (su.core/create-component
    (fn []
      (let [{:keys [initial] :or {initial 0}} props
            count (atom initial)]
        [:div.counter
          [:span "Count: " @count]
          [:button {:on-click #(swap! count inc)} "+"]]))))
```

### Compile-Time Optimization (Phase 2)

In a later optimization phase, the defc macro can perform **static analysis** on the
hiccup body (like UIx's AOT and Solid.js's template compilation):

1. Identify fully static subtrees → hoist to module-level template
2. Identify dynamic slots (atom derefs) → emit targeted `effect()` calls
3. Clone static template at mount time, wire up effects for dynamic parts

This optimization is **not required for initial implementation** — the simple
"render hiccup, bind atoms" approach works first. Optimization adds performance.

### Component Lifecycle

**Key design**: Component function executes **once** at mount time (Solid.js model).
Updates are driven by atom/effect, not by re-executing the function.

```
Mount:   component fn executes → DOM created → effects registered → on-mount hooks
Update:  atom changes → effect fires → specific DOM node updated
Unmount: DOM removed → effects cleaned up → on-unmount hooks
```

### Lifecycle Hooks

```clojure
(defc my-component [props]
  (on-mount (fn [el] ...))       ;; called after DOM insertion
  (on-unmount (fn [el] ...))     ;; called before DOM removal
  [:div ...])
```

`on-mount` and `on-unmount` are su-runtime functions that register callbacks
on the current component context (a dynamic var during component creation).

---

## defstyle Macro

### Input Syntax

```clojure
(defstyle counter-style
  [:.counter {:display "flex" :gap "8px"}
   [:span {:font-weight "bold"}]
   [:button {:cursor "pointer"}
    [:&:hover {:background "#eee"}]]])
```

### Expansion

```clojure
(su.core/inject-style "counter-style" "hash123"
  ".counter_hash123 { display: flex; gap: 8px; }
   .counter_hash123 span { font-weight: bold; }
   .counter_hash123 button { cursor: pointer; }
   .counter_hash123 button:hover { background: #eee; }")
```

### CSS Scoping

Each `defstyle` generates a unique hash suffix (from the style name + content hash).
Class names in the CSS get the suffix appended: `.counter` → `.counter_x7f2a`.

The corresponding `defc` references the scoped class via the `defstyle` binding.

### CSS-as-Data Nesting Rules

| Pattern | CSS Output |
|---------|-----------|
| `[:.parent {:k v}]` | `.parent { k: v; }` |
| `[:.parent [:child {:k v}]]` | `.parent child { k: v; }` |
| `[:.parent [:&:hover {:k v}]]` | `.parent:hover { k: v; }` |
| `[:.parent [:&.active {:k v}]]` | `.parent.active { k: v; }` |

### Injection Strategy

1. **Development**: `<style>` tag injected into `<head>`, replaced on HMR.
2. **Production**: CSS extracted by Vite plugin into static `.css` files.
3. **SSR**: CSS collected during render, emitted in `<head>`.

---

## HMR (Hot Module Replacement)

### Strategy

su's Vite plugin extends @kiso/cljs's Vite plugin with component-aware HMR:

```javascript
// Generated by su vite plugin
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Replace component render function, preserve atom state
    su_runtime.hotReplace("counter", newModule.counter);
  });
}
```

### State Preservation

1. Atom values persist across HMR (atoms are module-level, not recreated).
2. Component function is replaced → DOM is re-mounted with new render logic.
3. defstyle changes → `<style>` tag content replaced (instant visual update).

---

## @kiso/cljs Feedback: Required Considerations

These items affect @kiso/cljs design/implementation to ensure su compatibility.
@kiso/cljs must NOT import or reference su, but must provide adequate hooks.

### F1: Atom Tracking Hook

**Batch**: D (runtime), can be added to existing atom.ts

su needs to intercept `deref(atom)` calls to record dependencies.
The atom implementation should support an optional tracking callback.

```typescript
// atom.ts — add to existing Atom type
export interface Atom {
  value: any;
  watches: Map<any, WatchFn>;
  _onDeref?: (atom: Atom) => void;  // su sets this
}
```

**Impact**: Minimal — one optional field, one conditional call in `deref`.
No behavioral change when `_onDeref` is not set.

### F2: Atom Watch Return (Unsubscribe Function)

**Batch**: D (runtime), enhancement to existing atom.ts

su's `effect()` needs to subscribe and unsubscribe from atoms dynamically.
Current `addWatch(atom, key, fn)` API works but returning an unsubscribe
function is more ergonomic:

```typescript
// Return a cleanup function
addWatch(atom, key, fn) → () => void  // removes the watch
```

**Impact**: Backward-compatible. Just return the cleanup from `addWatch`.

### F3: Hiccup Vector Detection in Codegen

**Batch**: Analyzer/Codegen consideration

When su's defc macro emits hiccup like `[:div {:class "foo"} child]`,
the Kiso compiler sees it as a normal vector literal. The su-runtime's
`renderHiccup()` inspects vectors at runtime to detect hiccup format.

No special compiler support needed initially — runtime detection is sufficient.
Future optimization: compiler plugin/macro that transforms hiccup at compile time.

### F4: Macro Expansion Must Support su Macros

**Batch**: E (mini evaluator)

su's `defc` and `defstyle` are regular ClojureScript macros defined in `.cljs` files.
The mini evaluator must:
1. Load macro definitions from `@kiso/su/clj/su/core.cljs`
2. Expand them during compilation of user code that `(:require [su.core ...])`
3. Handle the `ns` form's `:require-macros` or self-requiring pattern

**Impact**: No special su handling — the evaluator just needs to support loading
macro files from npm packages (generic feature).

### F5: for/doseq Compilation (Batch A)

**Batch**: A (macros)

su components heavily use `(for [x @items] [:li x])` for list rendering.
The `for` macro must compile correctly and produce iterable output that
su-runtime can consume for DOM list generation.

### F6: Keyword as CSS-Compatible Strings

**Batch**: Runtime consideration

defstyle uses keywords as CSS selectors: `:.counter`, `:&:hover`.
The keyword→string conversion must preserve the full name including
dots, ampersands, and colons. Current `keyword.name` should work,
but verify edge cases like `:&:hover` → `"&:hover"`.

### F7: clj->js / js->clj for DOM Interop

**Batch**: D (interop.ts)

su-runtime needs to convert between Kiso persistent maps and JS objects
for DOM attributes (`{:class "foo"}` → `{class: "foo"}`).
The `interop.ts` module (Batch D, item 17) is required for this.

If `interop.ts` is not ready when su starts, su-runtime can include
a minimal inline converter. But the proper solution is interop.ts.

---

## Implementation Order

### Phase 7 Sub-Tasks (Updated)

```
7.0  [F1,F2] Add atom tracking hook + watch unsubscribe to @kiso/cljs
             (small patch to existing atom.ts, done during Phase 4)
7.1  su-runtime/reactive.ts    — track(), effect(), computed()
7.2  su-runtime/hiccup.ts      — renderHiccup(), bind(), mount()
7.3  su-runtime/css.ts         — injectStyle(), scopeClass()
7.4  su-runtime/lifecycle.ts   — on-mount, on-unmount
7.5  defc macro                — (su/core.cljs, requires Batch E)
7.6  defstyle macro            — (su/core.cljs, requires Batch E)
7.7  su vite-plugin.ts         — HMR for components + styles
7.8  dogfooding: todo-app      — validates full pipeline
```

### Prerequisites from @kiso/cljs

| su Task | Requires | @kiso/cljs Batch |
|---------|----------|-----------------|
| 7.0 | atom.ts modifications | D (or earlier) |
| 7.1-7.4 | — | runtime only (TypeScript) |
| 7.5 | defmacro, for, case | A + E |
| 7.6 | defmacro | E |
| 7.7 | Vite plugin base | F |
| 7.8 | all of above | A + B + D + E + F |

### Early Validation Path

su-runtime (7.1-7.4) can be developed **in parallel with @kiso/cljs Batch B-E**
because it is pure TypeScript with no dependency on the compiler.
Manual testing with hand-written JS validates the runtime before macros are ready.

---

## Appendix: Research Summary

12 frameworks analyzed. Key architectural insights:

| Framework | Key Takeaway for su |
|-----------|-------------------|
| Reagent | `*ratom-context*` dynamic var for dep tracking = su's `currentTracking` |
| UIx | Compile-time AOT hiccup optimization = su's future defc optimization |
| Replicant | `IRender` protocol for testability = su should have a test renderer |
| VanJS | 141 LOC proves fine-grained reactive UI is tiny = su's size target |
| Solid.js | Template compilation + effect wiring = su's defc compilation model |
| Hoplon | Direct DOM + cell watchers = su's rendering model |
| Zero | Web Components + Shadow DOM = su's optional future output target |
| SCI | Analysis-time macro expansion + EvalForm interleave = Kiso evaluator design |

Full research notes: `private/001_su/01_su_design.md` (Japanese, gitignored).
