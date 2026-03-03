# ClojureScript Upstream Reference

CLJS upstream: `~/Documents/OSS/ClojureScript/`

**Use as a semantic reference**, not for direct porting. Kiso's goals differ from
upstream CLJS (clean ES6 output, no Google Closure, zero goog.* dependency,
Symbol-based protocols instead of name-mangled methods). Extract **expected behavior
and edge cases** from upstream tests, then re-express them as vitest assertions.

| Kiso area   | CLJS upstream test                          | How to use                    |
|-------------|---------------------------------------------|-------------------------------|
| Runtime     | `src/test/cljs/cljs/collections_test.cljs`  | Expected values for vector/map/set operations |
| Runtime     | `src/test/cljs/cljs/hashing_test.cljs`      | Hash correctness, collision cases |
| Runtime     | `src/test/cljs/cljs/core_test.cljs`         | Core function behavior (~2000 lines of edge cases) |
| Destructuring | `src/test/cljs/cljs/destructuring_test.cljs` | Sequential & associative patterns |
| Analyzer    | `src/test/clojure/cljs/analyzer_tests.clj`  | Warning cases, special form semantics |
| Codegen     | `src/test/clojure/cljs/compiler_tests.clj`  | Input→output pairs (adapt to ES6 target) |

**Caveats**:
- CLJS compiler tests run on JVM Clojure — API shape doesn't match Kiso
- CLJS runtime tests are `.cljs` files (chicken-and-egg: need a compiler to run them)
- CLJS emits Google Closure-flavored JS; Kiso emits clean ES6 — expected JS output will differ
- Protocol dispatch mechanism differs (CLJS: mangled names, Kiso: Symbols)
- Extract the **what** (expected semantics), not the **how** (CLJS-specific implementation)
