# Architecture

How su works under the hood. This document is for contributors and curious
developers who want to understand the internals.

## Module Overview

```
packages/su/src/
├── index.ts            Barrel exports (re-exports everything)
├── component.ts        defineComponent, mount, Custom Element registration
├── css.ts              createSheet, getSheet (Constructable Stylesheets)
├── hiccup.ts           renderHiccup, bind, parseTag (hiccup → DOM)
├── reactive.ts         effect, computed, track (reactivity system)
├── lifecycle.ts        onMount, onUnmount, setHost, getHost
├── context.ts          provide, useContext (DOM event-based context)
├── hmr.ts              registerRenderFn, hotReplace
├── devtools.ts         enableTrace, disableTrace
└── codegen-hooks.ts    suCodegenHooks (compiler integration)
```

## Component Lifecycle

When `defc` is compiled and executed:

```
1. defineComponent(tagName, config, renderFn)
   │
   ├── Validate tag name (must contain hyphen)
   ├── Parse config (observedAttrs, propTypes, richProps, etc.)
   ├── Register HMR render function
   ├── customElements.define(tagName, ...) [browser only]
   │
   └── Return ComponentDef with createInstance()

2. createInstance(initialProps)
   │
   ├── Create propsAtom (Kiso HashMap with keyword keys)
   ├── Return { propsAtom, mount, unmount, setAttr, setProp }
   │
   └── mount(container)
       │
       ├── setHost(shadowRoot host element)
       ├── collectLifecycleHooks(() => renderFn(propsAtom))
       │   ├── Execute component function (setup phase)
       │   ├── Collect onMount / onUnmount callbacks
       │   └── Return hiccup result
       ├── renderHiccup(result) → DOM nodes
       ├── Append to Shadow DOM
       ├── Apply adoptedStyleSheets
       ├── Execute mount callbacks
       └── clearHost()
```

## Reactive System

The reactivity system is built on three primitives:

### Dependency Tracking

```
Atom._globalOnDeref   ← hook set by track()
     │
     ├── track(fn)
     │   ├── Set currentTracking = new Set()
     │   ├── Set _globalOnDeref to capture atom refs
     │   ├── Run fn() — any atom.deref() adds to Set
     │   ├── Restore previous tracking context
     │   └── Return [result, Set<Atom>]
     │
     ├── effect(fn)
     │   ├── track(fn) to get dependencies
     │   ├── Subscribe to each dependency via atom.addWatch()
     │   ├── On dependency change: unsubscribe old, re-track, subscribe new
     │   └── Return dispose function
     │
     └── computed(fn)
         ├── dirty flag (initially true)
         ├── On deref: if dirty, re-track fn, cache result
         ├── On dependency change: mark dirty (lazy recompute)
         └── Forward dependencies to outer tracking context
```

### Effect Batching

When an atom changes, all subscribed effects are collected into a
`pendingEffects` set and flushed synchronously. This prevents redundant
re-renders when multiple atoms change in sequence.

### Bind (Reactive DOM)

`bind(fn)` creates a reactive DOM fragment:

```
bind(fn)
  │
  ├── Create anchor comment node
  ├── Return anchor immediately
  ├── queueMicrotask:
  │   └── effect(() => {
  │       ├── Run fn() → hiccup
  │       ├── renderHiccup(hiccup) → new DOM node
  │       ├── First run: insert after anchor
  │       └── Subsequent: replaceChild(new, old)
  │   })
  └── anchor._dispose = effect dispose function
```

The `queueMicrotask` ensures the anchor node is in the DOM before the first
render.

## Context Protocol

Context uses DOM event bubbling to cross Shadow DOM boundaries:

```
Provider (ancestor):
  su/provide(key, value)
  └── host.addEventListener("su-context-request", handler)
      └── handler: if event.detail.key matches, call callback(value)

Consumer (descendant):
  su/use-context(key)
  └── host.dispatchEvent(new CustomEvent("su-context-request", {
        bubbles: true,
        composed: true,  ← crosses Shadow DOM
        detail: { key, callback }
      }))
  └── Return value from callback
```

`composed: true` is critical — it allows the event to cross Shadow DOM
boundaries, enabling context to flow through deeply nested component trees.

## Hiccup → DOM

`renderHiccup` converts hiccup data to DOM nodes:

```
renderHiccup(hiccup)
  │
  ├── null/undefined → Comment node
  ├── string/number → Text node
  ├── function → bind(fn) (reactive)
  ├── array (non-hiccup) → flatten and recurse
  └── hiccup vector:
      ├── parseTag(tag) → { tag, id, classes }
      ├── createElement(tag)
      ├── Set id, classes
      ├── Process attribute map:
      │   ├── "class" → merge with tag classes
      │   ├── "style" → set style properties
      │   ├── "on-*" → addEventListener
      │   ├── "--*" → CSS custom properties
      │   ├── Custom Element + object → set as JS property
      │   └── else → setAttribute
      ├── Process children (recurse)
      └── Return Element
```

## Codegen Integration

The Kiso compiler uses codegen hooks to generate optimized JavaScript for
`defc` and `defstyle`:

```
ClojureScript                    JavaScript
─────────────                    ──────────

(defc my-comp                    su.defineComponent(
  {:props {:x "string"}}   →      "my-comp",
  [{:keys [x]}]                   {observedAttrs: ["x"],
  [:div x])                        propTypes: {x: "string"}},
                                   function(propsAtom) { ... })

(defstyle my-comp                su.createSheet(
  [:.card {:color "red"}])  →      "my-comp",
                                   ".card { color: red; }")
```

The `emitStatic` helper optimizes config maps to plain JavaScript object
literals when all values are static, avoiding runtime Kiso data structure
construction.

## Design Decisions

1. **Shadow DOM by default**: Every component gets style isolation. This
   prevents global CSS conflicts and makes components truly portable.

2. **Solid-style reactivity**: Component functions run once (not on every
   render like React). Only the reactive parts re-render. This is simpler
   and more performant.

3. **DOM events for context**: Using `CustomEvent` with `composed: true`
   leverages the platform's event system instead of building a custom
   context tree. This naturally handles Shadow DOM boundaries.

4. **Constructable Stylesheets**: Using `adoptedStyleSheets` instead of
   `<style>` elements is more efficient — stylesheets are parsed once and
   shared across instances.

5. **No virtual DOM**: su renders directly to the real DOM. Fine-grained
   reactivity means only changed parts update, making a virtual DOM
   unnecessary overhead.
