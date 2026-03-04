# HMR (Hot Module Replacement)

su supports hot module replacement through the Kiso Vite plugin. When you edit
a `.cljs` file, changes appear in the browser without a full page reload.

## How It Works

### Component HMR

When a component's source file changes:

1. Vite recompiles the `.cljs` file
2. The Kiso plugin calls `su/hot-replace` with the component tag name and the
   new render function
3. `hot-replace` updates the render function in the HMR registry
4. All live instances of that component in the DOM are found via
   `document.querySelectorAll(tagName)`
5. Each instance's old effects are disposed and the Shadow DOM is cleared
6. The next render uses the updated function

### Style HMR

When a `defstyle` changes:

1. The new CSS text is compiled
2. `createSheet` updates the cached `CSSStyleSheet` via `replaceSync()`
3. All components using that stylesheet see the updated styles immediately
4. No DOM rebuild needed — `adoptedStyleSheets` is a live reference

### State Preservation

Atoms survive HMR. Because `hot-replace` only swaps the render function (not
the component instance or its atoms), local state is preserved across edits.

This means you can:

- Edit styles and see changes without losing form input
- Modify render logic without resetting counters or lists
- Adjust event handlers while keeping application state

### Limitations

- **Custom Element re-registration:** The Web Components API does not allow
  re-registering a tag name with `customElements.define()`. If you change the
  tag name itself, a full page reload is required.

- **Setup phase changes:** Changes to the component's setup phase (atom
  creation, context providers, lifecycle hooks) are not applied by HMR. Only
  the render function is swapped. A full page reload is needed for setup
  changes.

## Vite Configuration

No special HMR configuration is needed. The Kiso Vite plugin handles
everything:

```js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
};
```

## Internal API

The HMR system uses two internal functions:

### `register-render-fn`

```clojure
(su/register-render-fn tag-name render-fn)
```

Called automatically by `defc` to register the component's render function in
the HMR registry. You do not call this manually.

### `hot-replace`

```clojure
(su/hot-replace tag-name new-render-fn) -> boolean
```

Called by the Vite plugin when a module is hot-updated. Returns `true` if the
component was found and updated, `false` if not registered.

## Debugging HMR

If HMR is not working:

1. Check that `vite.config.js` has the `cljs()` plugin
2. Verify the component tag name matches between `defc` and `defstyle`
3. Open the browser console — HMR events are logged by Vite
4. If state seems stale, try a full page reload (`Ctrl+Shift+R`)
