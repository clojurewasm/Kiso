# Codegen Hooks API

Codegen hooks let libraries register custom JavaScript emitters for namespace-qualified
function calls. Instead of emitting generic runtime calls, hooks produce idiomatic JS
tailored to the library's semantics.

## Quick Start

```typescript
import { compile } from '@clojurewasm/kiso';
import type { CodegenHook } from '@clojurewasm/kiso/codegen';

const myHook: CodegenHook = (args, helpers) => {
  const name = helpers.emit(args[0]!);
  return `myLib.create(${name})`;
};

const result = compile(source, {
  codegenHooks: {
    'my.ns/create-thing': myHook,
  },
});
```

When the compiler encounters `(my.ns/create-thing "foo")`, it calls `myHook`
instead of emitting `my.ns.create_thing("foo")`.

## Types

```typescript
// Imported from '@clojurewasm/kiso/codegen'

type CodegenHook = (args: Node[], helpers: CodegenHelpers) => string;

type CodegenHelpers = {
  emit: (node: Node) => string;              // Recursively emit a node as JS
  indent: string;                             // Current indentation string
  deeper: () => CodegenHelpers;               // Return helpers with +1 indent level
  extractLiteral: (node: Node) => unknown | null;  // Extract static value or null
  nsRef: (ns: string) => string;             // Resolve namespace to JS import alias
};
```

### `CodegenHook`

Receives the invocation's argument nodes (not the function node) and helper utilities.
Returns a JavaScript expression string.

### `CodegenHelpers`

| Method           | Description                                                        |
|------------------|--------------------------------------------------------------------|
| `emit(node)`     | Emit any AST node to JS. Use for dynamic sub-expressions.          |
| `indent`         | Current indentation (e.g. `"  "` at depth 1).                      |
| `deeper()`       | Returns new helpers at indent+1. Use for multi-line output.         |
| `extractLiteral` | Returns the static JS value if node is a literal, else null.        |
| `nsRef(ns)`      | Resolve a namespace to its JS import alias (auto-imports if needed). |

### `Node`

The analyzed AST node type. Common node types you'll encounter in hook arguments:

| Type      | Fields                          | Example source      |
|-----------|---------------------------------|----------------------|
| `literal` | `value`, `jsType`               | `"hello"`, `42`      |
| `keyword` | `ns`, `name`                    | `:title`, `:my/key`  |
| `vector`  | `items: Node[]`                 | `[1 2 3]`            |
| `map`     | `keys: Node[]`, `vals: Node[]`  | `{:a 1 :b 2}`        |
| `var-ref` | `ns`, `name`, `local`           | `my-var`              |
| `invoke`  | `fn: Node`, `args: Node[]`      | `(f x y)`            |
| `fn`      | `name`, `arities`, `variadic`   | `(fn [x] x)`         |

## Hook Key Format

Keys are fully-qualified Clojure names: `"namespace/function-name"`.

```typescript
{
  'su.core/define-component': defineComponentHook,
  'su.core/create-stylesheet': createStylesheetHook,
  'my.lib/special-form': myHook,
}
```

The compiler matches these against var-ref nodes in invoke position.

## Integration Points

### `compile()` options

```typescript
compile(source, {
  filename: 'my-app.cljs',
  sourceMap: true,
  codegenHooks: { ... },
});
```

### Vite plugin

```typescript
import { kisoPlugin } from '@clojurewasm/kiso';
import { suCodegenHooks } from '@clojurewasm/su';

export default defineConfig({
  plugins: [
    kisoPlugin({ codegenHooks: suCodegenHooks }),
  ],
});
```

## Example: su Hooks

The `@clojurewasm/su` package provides hooks for its macros:

```typescript
import { suCodegenHooks } from '@clojurewasm/su';
// Keys: 'su.core/define-component', 'su.core/create-stylesheet'
```

### Before (without hooks)

```javascript
su.core.define_component(
  "my-card",
  hashMap(keyword("observedAttrs"), vector("title", "subtitle")),
  function (_p0) { ... }
);
```

### After (with hooks)

```javascript
su.defineComponent("my-card", {
  observedAttrs: ["title", "subtitle"]
}, function (_p0) { ... });
```

The hook converts `hashMap`/`keyword` config nodes to JS object literals and
`vector` hiccup to JS array literals where statically possible.

## Writing Custom Hooks

### Pattern: Static extraction

Convert Clojure data literals to JS object/array literals for readability:

```typescript
const myHook: CodegenHook = (args, helpers) => {
  const config = args[0]!;

  // If it's a static map, convert keys to JS object
  if (config.type === 'map') {
    const pairs = config.keys.map((k, i) => {
      const key = k.type === 'keyword' ? k.name : helpers.emit(k);
      const val = helpers.emit(config.vals[i]!);
      return `${key}: ${val}`;
    });
    return `myLib.init({ ${pairs.join(', ')} })`;
  }

  // Fallback: emit as-is
  return `myLib.init(${helpers.emit(config)})`;
};
```

### Pattern: Multi-line output

Use `helpers.indent` and `helpers.deeper()` for formatted output:

```typescript
const myHook: CodegenHook = (args, helpers) => {
  const inner = helpers.deeper();
  const items = args.map(a => `${inner.indent}${inner.emit(a)}`);
  return `myLib.create(\n${items.join(',\n')}\n${helpers.indent})`;
};
```
