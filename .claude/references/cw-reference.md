# ClojureWasm Reference

**Always consult CW source before implementing.** CW already solved most
Clojure implementation problems in Zig. Read the corresponding CW code first to
understand the algorithm, edge cases, and design decisions — then port to TypeScript.

CW repo: `~/Documents/MyProducts/ClojureWasm/`

| Kiso module      | CW reference file                      | What to learn                  |
|------------------|----------------------------------------|--------------------------------|
| reader/tokenizer | `src/engine/reader/tokenizer.zig`      | Token kinds, number/string boundaries, `~@`/`#?@` as single tokens |
| reader/reader    | `src/engine/reader/reader.zig`         | Reader macros, syntax-quote, namespaced maps, edge cases |
| reader/form      | `src/engine/reader/form.zig`           | Form data model, NaN-boxing rationale |
| analyzer/macros  | `src/engine/analyzer/macro_transforms.zig` | ~40 core macro Form→Form transforms |
| analyzer/eval    | `src/engine/evaluator/tree_walk.zig`   | Mini evaluator design, env chain, apply |
| analyzer/analyzer| `src/engine/analyzer/analyzer.zig`     | Special form dispatch, scope, interop rewrite, destructuring |
| codegen/emitter  | `src/engine/compiler/compiler.zig`     | Truthiness, recur→loop, multi-arity |
| runtime/vector   | `src/runtime/collections.zig`          | 32-way trie, tail optimization, path copy |
| runtime/hash-map | `src/runtime/collections.zig` + `hash.zig` | HAMT bitmap+popcount, collision nodes |
| runtime/hash     | `src/runtime/hash.zig`                 | Murmur3, mixCollHash, ordered/unordered |
| runtime/equiv    | `src/runtime/value.zig`                | Structural equality, sequential cross-type |
| runtime/protocols| `src/runtime/value.zig` (Protocol, ProtocolFn structs) | Protocol runtime, dispatch, inline cache |
| analyzer/protocol| `src/engine/analyzer/analyzer.zig` L1743-2188 | defprotocol, extend-type, reify, defrecord, deftype |
| codegen/protocol | `src/engine/compiler/compiler.zig` L855-962 | Protocol codegen (adapt for JS Symbol dispatch) |
| evaluator        | `src/engine/evaluator/tree_walk.zig` L833-1079 | Protocol dispatch at runtime, valueTypeKey |

**Workflow**: Before writing any new module:
1. Read the design doc: `.dev/design/0N-*.md`
2. Read the corresponding CW source (table above)
3. Understand the algorithm and edge cases
4. Write tests based on CW's test cases
5. Implement in TypeScript
