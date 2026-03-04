# Architecture Overview

## Why Full TypeScript

| Aspect           | CW Wasm Embedded      | Full TypeScript             |
|------------------|-----------------------|-----------------------------|
| npm install      | Binary resolution     | `npm i` just works          |
| Package size     | ~5MB (native binary)  | ~200KB (JS only)            |
| Debugging        | 2-language boundary   | Single language              |
| Contributors     | Zig knowledge needed  | TS developers can join       |
| CI/CD            | Cross-compile needed  | `npm publish` only           |
| Compile speed    | Fastest (native)      | Fast enough (< 50ms/file)   |
| CW asset reuse   | Direct code reuse     | **Knowledge & algorithm port** |

CW's real asset is not the Zig code — it's the **knowledge gained from implementing Clojure**.
That knowledge transfers directly to a TypeScript implementation.

---

## Project Structure

npm workspaces monorepo with two packages:

```
kiso/                             (monorepo root)
├── package.json                  private, workspaces: ["packages/*"]
├── tsconfig.base.json            Shared TS settings
├── vitest.config.ts              Root test runner
│
├── packages/kiso/                @clojurewasm/kiso (compiler + runtime)
│   ├── package.json              type: "module"
│   ├── tsconfig.json             extends ../../tsconfig.base.json, composite
│   ├── src/
│   │   ├── reader/               Clojure Reader (TS)
│   │   │   ├── tokenizer.ts      Lexical analysis
│   │   │   ├── reader.ts         Parsing + reader macro expansion
│   │   │   └── form.ts           Form data model
│   │   ├── analyzer/             Analysis + macro expansion
│   │   │   ├── analyzer.ts       Special form dispatch, scope analysis
│   │   │   ├── macros.ts         Core macro transforms (~24)
│   │   │   ├── evaluator.ts      Mini evaluator for defmacro
│   │   │   ├── destructure.ts    Destructuring pattern expansion
│   │   │   └── node.ts           Analyzed AST node types
│   │   ├── codegen/              JS code generation
│   │   │   ├── emitter.ts        AST → ES6 JavaScript
│   │   │   └── sourcemap.ts      Source Map V3 generation
│   │   ├── runtime/              Browser runtime (tree-shakeable)
│   │   │   ├── core.ts           re-exports
│   │   │   ├── protocols.ts      Protocol system
│   │   │   ├── keyword.ts        Keyword
│   │   │   ├── symbol.ts         Symbol
│   │   │   ├── vector.ts         PersistentVector
│   │   │   ├── hash-map.ts       PersistentHashMap (HAMT)
│   │   │   ├── hash-set.ts       PersistentHashSet
│   │   │   ├── list.ts           PersistentList
│   │   │   ├── seq.ts            Seq functions
│   │   │   ├── lazy-seq.ts       LazySeq
│   │   │   ├── atom.ts           Atom (with tracking hook)
│   │   │   ├── hash.ts           Hash functions (Murmur3)
│   │   │   ├── equiv.ts          Structural equality
│   │   │   ├── array-map.ts      ArrayMap (<=8 entries)
│   │   │   ├── interop.ts        clj->js, js->clj
│   │   │   └── protocol-ext.ts   Protocol extensions for built-in types
│   │   └── api/                  Public API
│   │       ├── compiler.ts       compile(), compileFile()
│   │       └── vite-plugin.ts    Vite plugin
│   └── test/
│
├── packages/su/                  @clojurewasm/su (component framework)
│   ├── package.json              depends on @clojurewasm/kiso
│   ├── tsconfig.json             references ../kiso
│   ├── src/
│   │   ├── reactive.ts           track(), effect(), computed()
│   │   ├── component.ts          defineComponent(), Custom Element, Shadow DOM
│   │   ├── hiccup.ts             renderHiccup(), bind()
│   │   ├── css.ts                createSheet(), adoptedStyleSheets
│   │   ├── lifecycle.ts          on-mount, on-unmount hooks
│   │   ├── hmr.ts                Hot module replacement
│   │   └── index.ts              Barrel export
│   └── test/
│
└── examples/task-manager/        Demo app
```

---

## Compilation Pipeline

```
.cljs source
  │
  ▼
[Reader]  TS — S-expression parse, line/col tracking, reader macro expansion
  │          quote, deref, syntax-quote, #(), #{}, etc.
  │          CW knowledge: all edge cases (trailing slash, gensym, etc.)
  ▼
Form[] (S-expression tree with position info)
  │
  ▼
[Analyzer]  TS — Special form recognition, macro expansion, scope analysis
  │            Core macros: TS functions (Form → Form)
  │            defmacro: mini evaluator for expansion
  │            CW knowledge: destructuring, multi-arity, interop rewrite
  ▼
Node[] (Analyzed AST — optimized for JS codegen)
  │
  ▼
[Codegen]  TS — AST → ES6 JavaScript + Source Map
  │           CW knowledge: truthiness conversion, recur → while, etc.
  ▼
{ code: string, map: SourceMapV3 }
  │
  ▼
Vite / esbuild / Rollup processes output
```

---

## CW Knowledge Transfer

### Reader

| Lesson from CW                                          | TS application         |
|---------------------------------------------------------|------------------------|
| Reader macros fully expanded at read time               | Same design            |
| Syntax-quote is most complex (gensym, ns, special forms)| Same algorithm         |
| `#()` parameter limit (%20)                             | Same limit             |
| `#_` returns the next form (after discarding)           | Same behavior          |
| Number literal radix/hex/octal decision tree            | Same logic             |
| Named characters (`\newline` etc.) are case-sensitive   | Same                   |
| Trailing slash in qualified names (`foo/`) is invalid   | Same validation        |
| Map/Set duplicate key detection (O(n^2) acceptable)     | Same                   |
| Nesting depth limit (1024), string size limit (1MB)     | Same safety measures   |

### Analyzer

| Lesson from CW                                    | TS application         |
|---------------------------------------------------|------------------------|
| ~30 special forms, dispatched via StaticMap        | Map<string, handler>   |
| Locals shadow special forms                       | Same priority          |
| Macro expansion at 2 levels (built-in + defmacro) | Same design            |
| Destructuring: seq-based (&) vs nth-based (no &)  | Same optimization      |
| fn param destructuring via synthetic name + let    | Same transformation    |
| letfn is 2-pass (register names → init bodies)    | Same                   |
| Multiple catch → nested try transformation        | Same                   |
| `.method` → interop call rewrite                  | Same                   |

### Data Structures

| Lesson from CW                                       | TS application   |
|------------------------------------------------------|------------------|
| HAMT: bitmap + popcount for sparse arrays            | Same algorithm   |
| ArrayMap (≤8) → HashMap auto-promotion               | Same threshold   |
| nil key stored outside HAMT                          | Same             |
| Single-entry node inlining on dissoc                 | Same optimization|
| Vector COW (generation counter)                      | Same or trie     |
| Structural equality: sequential crosses types `(= '(1) [1])` | Same    |
| Keyword interned as `ns/name`                        | Same             |
| Murmur3-based hash (mixCollHash)                     | Same             |

---

## su Positioning

```
@clojurewasm/kiso (packages/cljs)
  ↑ dependency (workspace link)
@clojurewasm/su (packages/su)
  ├── src/                reactive, component, hiccup, css, lifecycle, hmr (~3KB)
  └── defc/defstyle macros defined in @clojurewasm/kiso analyzer (macros.ts)
```

su is a regular library consumer of `@clojurewasm/kiso`.
defc/defstyle macros are implemented in `@clojurewasm/kiso` analyzer and expand to `su.core/*` calls.

---

## Size Estimates

### npm Package

```
@clojurewasm/kiso (compiler + runtime)
  compiler/ (TS → JS minified):     ~80-120 KB
  runtime/ (tree-shakeable):         ~50-80 KB
  ────────────────────────────────
  Total: ~150-200 KB

Comparison:
  typescript:     ~60 MB
  esbuild:        ~10 MB
  @swc/core:      ~23 MB
  squint-cljs:    ~2 MB
```

### Browser Bundle

```
runtime (used modules only, tree-shaken):  ~15-30 KB gzipped
@clojurewasm/su:                                   ~3 KB gzipped
```

### Compile Speed Targets

```
Single file (100 lines):   < 10ms
Single file (1000 lines):  < 50ms
HMR (incremental):         < 30ms (parse → codegen → Vite)
Full build (100 files):    < 2s
```
