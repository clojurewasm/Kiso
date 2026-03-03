# 07: su Framework Design

**Package**: `@kiso/su` — Web Components framework with fine-grained reactivity, built on `@kiso/cljs`.
**Dependency**: `@kiso/su` depends on `@kiso/cljs`. `@kiso/cljs` must NOT depend on `@kiso/su`.

---

## Design Principles

1. **Web Components first** — defc compiles to Custom Elements with Shadow DOM.
2. **Fine-grained reactivity** — atom/signal-level DOM binding inside Shadow DOM, no VDOM.
3. **Zero dependencies** — no React, Preact, Lit, or other UI framework.
4. **~3-5 KB gzipped** — VanJS (1KB) + Custom Element machinery.
5. **Compile-time optimization** — defc macro separates hiccup into template + effects.
6. **Clojure-idiomatic** — hiccup vectors, atom/deref, standard destructuring.
7. **1st dogfooding target** — drives @kiso/cljs feature completion.

Research base: Reagent, UIx, Helix, Hoplon, Replicant, Zero, Squint, SCI,
VanJS, Solid.js, Lit, TC39 Signals, solid-element.
See `private/001_su/01_su_design.md` (Japanese, gitignored).

---

## Architecture Overview

```
@kiso/su/
├── clj/su/core.cljs              defc, defstyle macros (ClojureScript source)
├── runtime/
│   ├── reactive.ts                track(), effect(), computed()      ~50 LOC
│   ├── component.ts               defineComponent(), Custom Element  ~80 LOC
│   ├── hiccup.ts                  hiccup→DOM, bind()                ~80 LOC
│   ├── css.ts                     CSSStyleSheet, adoptedStyleSheets ~30 LOC
│   ├── lifecycle.ts               on-mount, on-unmount hooks        ~20 LOC
│   └── index.ts                   public API
├── vite-plugin.ts                 HMR support for .cljs components
└── package.json                   peerDependencies: { "@kiso/cljs": "^0.1" }
```

Total runtime: ~260 LOC TypeScript, ~3-5 KB gzipped.

---

## Core Model: Custom Element + Fine-Grained Signals

### The solid-element Pattern (Proven Architecture)

The key architectural proof comes from `solid-element`: Solid.js signals work
perfectly inside Web Components. su adopts this exact pattern with Kiso atoms:

```
defc counter [props]          →  customElements.define('su-counter', class)
  component fn runs ONCE      →  connectedCallback → createRoot(...)
  props become atom-signals   →  createProps() → atom per observed attribute
  attr changes update atoms   →  attributeChangedCallback → atom.reset!
  effects update Shadow DOM   →  effect(() => node.textContent = deref(count))
  cleanup on removal          →  disconnectedCallback → dispose all effects
```

### Why Web Components

1. **Natural encapsulation**: Shadow DOM scopes CSS without class name hashing.
2. **Interop**: Custom Elements work with any framework or plain HTML.
3. **Standards-based**: Built on web platform, not custom abstractions.
4. **Composable**: Components are HTML elements — nest them in any HTML context.
5. **SSR**: Declarative Shadow DOM (`<template shadowrootmode="open">`) is Baseline 2024.

---

## Reactive Model

### Choice: VanJS-style Signals integrated with Kiso atom

| Model | Auto-tracking | Granularity | Complexity | Size |
|-------|--------------|-------------|-----------|------|
| Reagent ratom | deref-based | component | medium | ~200 LOC |
| Hoplon cells | formula macro | cell | medium | ~300 LOC |
| **VanJS signals** | **getter-based** | **DOM node** | **low** | **~50 LOC** |
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

// Called from atom's deref path — integration point with @kiso/cljs
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
```

### @kiso/cljs Integration Point (CRITICAL)

su's reactive tracking requires a hook in atom's `deref` path. Two options:

**Option A: Runtime hook (recommended for initial impl)**
```typescript
// In @kiso/cljs atom.ts — add an optional notify callback
export function deref(atom: Atom): any {
  if (atom._onDeref) atom._onDeref(atom);
  return atom.value;
}
```
su-runtime sets `atom._onDeref = notifyTracking` at initialization.
@kiso/cljs has no knowledge of su — the hook field exists but is unused without su.

**Option B: Protocol-based (after Batch B)**
```typescript
// atom implements IDeref protocol
// su's track() temporarily replaces the protocol dispatch for deref
```

**Recommended**: Option A for initial implementation, migrate to Option B after protocols.

---

## defc Macro — Custom Element Definition

### Input Syntax

```clojure
(defc counter
  "A simple counter component."
  {:tag "su-counter"                    ;; optional, auto-generated if omitted
   :props {:initial {:type :number      ;; attribute type for serialization
                     :default 0}}}      ;; default value
  [{:keys [initial]}]
  (let [count (atom initial)]
    [:div.counter
      [:span "Count: " @count]
      [:button {:on-click #(swap! count inc)} "+"]
      [:button {:on-click #(swap! count dec)} "-"]]))
```

### Minimal Syntax (props auto-inferred)

```clojure
(defc counter [{:keys [initial] :or {initial 0}}]
  (let [count (atom initial)]
    [:div.counter
      [:span "Count: " @count]
      [:button {:on-click #(swap! count inc)} "+"]]))
```

When the options map is omitted:
- Tag name auto-generated from namespace + name: `my.app/counter` → `su-my-app-counter`
- Props inferred from destructuring keys
- Types default to `:string`

### Expansion Target

defc expands to a `customElements.define()` call:

```clojure
;; (defc counter [{:keys [initial]}] ...)
;; expands to approximately:

(su.core/define-component
  "su-counter"
  {:observed-attrs ["initial"]
   :prop-types {:initial :number}}
  (fn [props-atom]
    (let [{:keys [initial]} @props-atom
          count (atom initial)]
      [:div.counter
        [:span "Count: " @count]
        [:button {:on-click #(swap! count inc)} "+"]])))
```

### Runtime Behavior (component.ts)

```typescript
// su-runtime/component.ts (~80 LOC)

function defineComponent(
  tagName: string,
  config: { observedAttrs: string[], propTypes: Record<string, string> },
  renderFn: (propsAtom: Atom) => any
): void {

  class SuComponent extends HTMLElement {
    static observedAttributes = config.observedAttrs;

    private _dispose: (() => void) | null = null;
    private _propsAtom: Atom;

    constructor() {
      super();
      this._propsAtom = atom({}); // reactive props
    }

    connectedCallback() {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

      // Read initial attributes into props atom
      const initialProps: Record<string, any> = {};
      for (const attr of config.observedAttrs) {
        initialProps[attr] = deserializeAttr(
          this.getAttribute(attr), config.propTypes[attr]
        );
      }
      reset(this._propsAtom, initialProps);

      // Run component function ONCE (Solid.js model)
      // All reactivity is via atom/effect, not re-execution.
      this._dispose = createRoot(() => {
        const hiccup = renderFn(this._propsAtom);
        const dom = renderHiccup(hiccup);
        shadow.appendChild(dom);
        return disposeAll; // cleanup function for all effects in this root
      });
    }

    attributeChangedCallback(
      name: string, _old: string | null, val: string | null
    ) {
      // Attribute change → update props atom → effects fire → DOM updates
      const typed = deserializeAttr(val, config.propTypes[name]);
      swap(this._propsAtom, assoc, name, typed);
    }

    disconnectedCallback() {
      if (this._dispose) {
        this._dispose(); // tears down all effects in this component
        this._dispose = null;
      }
    }
  }

  customElements.define(tagName, SuComponent);
}
```

### Using Components in Hiccup

```clojure
;; defc creates a Custom Element tag.
;; Use it in hiccup like any HTML element:

[:div
  [:su-counter {:initial 5}]          ;; Custom Element tag
  [:su-counter {:initial 10}]]        ;; Another instance

;; Or with the symbol reference (macro rewrites to tag):
[counter {:initial 5}]
;; → [:su-counter {:initial "5"}]  (attribute serialization)
```

### Component Nesting and Slots

```clojure
(defc card [{:keys [title]}]
  [:div.card
    [:h2 title]
    [:slot]])                          ;; Light DOM children go here

;; Usage:
[:su-card {:title "Hello"}
  [:p "This goes into the slot"]]
```

Shadow DOM `<slot>` provides natural child projection without any framework magic.

### Component Lifecycle

**Key design**: Component function executes **once** in `connectedCallback` (Solid.js model).
Updates are driven by atom/effect inside Shadow DOM, not by re-executing the function.

```
connectedCallback:   attachShadow → read attrs → atom(props) → render fn ONCE → effects
attributeChanged:    update props atom → effects fire → specific DOM nodes updated
disconnectedCallback: dispose all effects → cleanup hooks
```

### Lifecycle Hooks

```clojure
(defc my-component [props]
  (on-mount (fn [] ...))          ;; after connectedCallback + first render
  (on-unmount (fn [] ...))        ;; before disconnectedCallback
  [:div ...])
```

`on-mount`/`on-unmount` register callbacks on the current component root context.

---

## defstyle Macro — Shadow DOM CSS

### Key Insight: Shadow DOM Eliminates Class Name Hashing

With Shadow DOM, CSS is **naturally scoped** to the component. No hash suffixes needed.
`.counter` inside `<su-counter>`'s Shadow DOM only matches elements in that shadow tree.

This is a major simplification over the non-WC approach.

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
(su.core/create-stylesheet "counter-style"
  ".counter { display: flex; gap: 8px; }
   .counter span { font-weight: bold; }
   .counter button { cursor: pointer; }
   .counter button:hover { background: #eee; }")
```

No hash suffixes — Shadow DOM provides the scoping.

### Runtime: adoptedStyleSheets

```typescript
// su-runtime/css.ts (~30 LOC)

const sheetCache = new Map<string, CSSStyleSheet>();

function createSheet(name: string, cssText: string): CSSStyleSheet {
  let sheet = sheetCache.get(name);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(name, sheet);
  }
  return sheet;
}

// In defineComponent, after attachShadow:
shadow.adoptedStyleSheets = [counterStyleSheet];
```

**Benefits of adoptedStyleSheets**:
- `CSSStyleSheet` is parsed **once**, shared across all instances of the component.
- No `<style>` tag duplication — browser handles the sharing efficiently.
- Constructable Stylesheets are Baseline 2023 (all modern browsers).

### CSS-as-Data Nesting Rules

| Pattern | CSS Output |
|---------|-----------|
| `[:.parent {:k v}]` | `.parent { k: v; }` |
| `[:.parent [:child {:k v}]]` | `.parent child { k: v; }` |
| `[:.parent [:&:hover {:k v}]]` | `.parent:hover { k: v; }` |
| `[:.parent [:&.active {:k v}]]` | `.parent.active { k: v; }` |
| `[:host {:display "block"}]` | `:host { display: block; }` |
| `[:host(.large) {:font-size "2em"}]` | `:host(.large) { font-size: 2em; }` |
| `[::slotted(p) {:color "red"}]` | `::slotted(p) { color: red; }` |

Note: `:host` and `::slotted()` are Shadow DOM-specific CSS selectors.

### Linking defstyle to defc

```clojure
(defstyle counter-style ...)

(defc counter
  {:style counter-style}            ;; attach stylesheet to this component
  [{:keys [initial]}]
  ...)
```

The `:style` option in defc's metadata tells `defineComponent` to set
`shadow.adoptedStyleSheets = [counter-style-sheet]`.

Multiple stylesheets can be composed:
```clojure
(defc counter
  {:style [base-style counter-style]}
  ...)
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
| `:slot` | Assign element to a named slot in parent Shadow DOM. |

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

### Custom Element Tags in Hiccup

```clojure
;; Custom elements (defc components) by tag name:
[:su-counter {:initial 5}]

;; Or by symbol reference (macro rewrites to Custom Element tag):
[counter {:initial 5}]
```

---

## HMR (Hot Module Replacement)

### Challenge: Custom Element Re-registration

`customElements.define()` cannot be called twice for the same tag name.
HMR must work around this.

### Strategy: Render Function Replacement

```typescript
// defineComponent stores the render function in a registry
const componentRegistry = new Map<string, RenderFn>();

// On HMR, replace the render function and re-mount active instances:
function hotReplace(tagName: string, newRenderFn: RenderFn): void {
  componentRegistry.set(tagName, newRenderFn);
  // Find all live instances of this Custom Element
  for (const el of document.querySelectorAll(tagName)) {
    const shadow = el.shadowRoot;
    if (shadow) {
      // Dispose old effects, clear shadow DOM content
      el._dispose?.();
      while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
      // Re-run with new render function, preserving atom state
      el._dispose = createRoot(() => {
        const hiccup = newRenderFn(el._propsAtom);
        const dom = renderHiccup(hiccup);
        shadow.appendChild(dom);
      });
    }
  }
}
```

### Vite Plugin Integration

```javascript
// Generated by su vite plugin
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    su_runtime.hotReplace("su-counter", newModule.counter_renderFn);
  });
}
```

### State Preservation

1. **Atom values persist** — atoms live on the element instance, not re-created.
2. **Render function replaced** — new hiccup structure, same state.
3. **defstyle changes** — `CSSStyleSheet.replaceSync(newCSS)` updates in-place.
   All instances sharing the sheet see the change immediately.

---

## SSR: Declarative Shadow DOM

### Server Rendering

```html
<!-- Server output using Declarative Shadow DOM (Baseline 2024) -->
<su-counter initial="5">
  <template shadowrootmode="open">
    <style>.counter { display: flex; gap: 8px; }</style>
    <div class="counter">
      <span>Count: 5</span>
      <button>+</button>
      <button>-</button>
    </div>
  </template>
</su-counter>
```

Browser parses the `<template shadowrootmode="open">` and attaches
the shadow root **during HTML parse**, before any JS loads. No FOUC.

### Hydration

When the Custom Element class upgrades:
1. `this.shadowRoot` already exists (from DSD) — don't call `attachShadow`.
2. Wire signals to existing DOM nodes (query by structure).
3. Attach event listeners.

Hydration is a **Phase 2 optimization** — initial implementation can
clear and re-render the shadow DOM on upgrade.

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

Additionally for Shadow DOM CSS: `:host`, `::slotted` must work as keywords.

### F7: clj->js / js->clj for DOM Interop

**Batch**: D (interop.ts)

su-runtime needs to convert between Kiso persistent maps and JS objects
for DOM attributes (`{:class "foo"}` → `{class: "foo"}`).
The `interop.ts` module (Batch D, item 17) is required for this.

If `interop.ts` is not ready when su starts, su-runtime can include
a minimal inline converter. But the proper solution is interop.ts.

### F8: Custom Element Tag Name Generation

**Batch**: Codegen consideration

defc needs to generate valid Custom Element tag names (must contain a hyphen).
The namespace + name → tag name mapping should be deterministic:

```
my.app/counter      → su-my-app-counter
su.core/button      → su-core-button
counter             → su-counter (default namespace)
```

@kiso/cljs's symbol/namespace handling should support this mapping.

---

## Implementation Order

### Phase 7 Sub-Tasks (Updated)

```
7.0  [F1,F2] Atom tracking hook + watch unsubscribe in @kiso/cljs
             (small patch to existing atom.ts, do during Batch D)
7.1  su-runtime/reactive.ts       — track(), effect(), computed()
7.2  su-runtime/component.ts      — defineComponent(), Custom Element class
7.3  su-runtime/hiccup.ts         — renderHiccup(), bind()
7.4  su-runtime/css.ts            — createSheet(), adoptedStyleSheets
7.5  su-runtime/lifecycle.ts      — on-mount, on-unmount
7.6  defc macro                   — (su/core.cljs, requires Batch E)
7.7  defstyle macro               — (su/core.cljs, requires Batch E)
7.8  su vite-plugin.ts            — HMR for components + styles
7.9  dogfooding: todo-app         — validates full pipeline
```

### Prerequisites from @kiso/cljs

| su Task | Requires | @kiso/cljs Batch |
|---------|----------|-----------------|
| 7.0 | atom.ts modifications | D (or earlier) |
| 7.1-7.5 | — | runtime only (TypeScript) |
| 7.6 | defmacro, for, case | A + E |
| 7.7 | defmacro | E |
| 7.8 | Vite plugin base | F |
| 7.9 | all of above | A + B + D + E + F |

### Early Validation Path

su-runtime (7.1-7.5) can be developed **in parallel with @kiso/cljs Batch B-E**
because it is pure TypeScript with no dependency on the compiler.
Manual testing with hand-written JS validates the runtime before macros are ready.

---

## Appendix: Research Summary

12+ frameworks analyzed. Key architectural insights:

| Framework | Key Takeaway for su |
|-----------|-------------------|
| Reagent | `*ratom-context*` dynamic var for dep tracking = su's `currentTracking` |
| UIx | Compile-time AOT hiccup optimization = su's future defc optimization |
| Replicant | `IRender` protocol for testability = su should have a test renderer |
| VanJS | 141 LOC proves fine-grained reactive UI is tiny = su's size target |
| Solid.js | Template compilation + effect wiring = su's defc compilation model |
| **solid-element** | **Proof: Solid signals inside Custom Elements works perfectly** |
| Hoplon | Direct DOM + cell watchers = su's rendering model |
| Zero | Web Components + Shadow DOM + data-driven events = su's WC architecture |
| Lit | adoptedStyleSheets + reactive properties = su's CSS and prop model |
| SCI | Analysis-time macro expansion + EvalForm interleave = Kiso evaluator design |

Full research notes: `private/001_su/01_su_design.md` (Japanese, gitignored).
