# 08: Quality, Ecosystem & Production Readiness

This document covers 7 improvement areas identified for Kiso's production readiness.

## Q1: `clojure.string` Namespace Behavior

### Current State

- `str` (core function) works without require — it's in `RUNTIME_FUNCTIONS` auto-import.
- `clojure.string` namespace (e.g., `split`, `upper-case`, `trim`) does **not exist** in Kiso.
- In upstream ClojureScript, `clojure.string` is a separate namespace that must be explicitly required:
  ```clojure
  (ns my.app (:require [clojure.string :as str]))
  (str/upper-case "hello")  ; => "HELLO"
  ```
- Kiso has no mechanism for providing cljs-compatible standard library namespaces.

### Design

Implement `clojure.string` as either:

**Option A: TypeScript runtime module** (recommended for Phase 1)
- `packages/kiso/src/runtime/string.ts` — pure TS functions
- Vite plugin maps `clojure.string` → `@clojurewasm/kiso/runtime/string`
- Functions: `blank?`, `capitalize`, `ends-with?`, `escape`, `includes?`, `join`,
  `lower-case`, `replace`, `reverse`, `split`, `starts-with?`, `trim`,
  `trim-newline`, `triml`, `trimr`, `upper-case`

**Option B: .cljs source** (future, requires self-hosted compilation)
- Write `clojure/string.cljs` and compile it during build
- Requires the evaluator to handle namespace loading

### Priority: Medium (common need but workarounds exist via JS interop)

---

## Q2: Real-World Multi-File Validation

### Current State

- Only one example: `examples/task-manager/` — single `.cljs` file, single namespace
- No multi-file, multi-namespace, nested directory examples
- No validation of:
  - Cross-namespace require/refer
  - Nested directory → namespace mapping (`foo.bar.baz` → `foo/bar/baz.cljs`)
  - Multiple components across files
  - Shared utility namespaces
  - Circular dependency detection

### Design

1. **New example app**: `examples/multi-ns-app/`
   ```
   examples/multi-ns-app/
   ├── src/
   │   ├── app/
   │   │   ├── core.cljs          ; entry, requires components + utils
   │   │   ├── state.cljs         ; shared state (atoms)
   │   │   └── utils.cljs         ; utility functions
   │   └── app/
   │       └── components/
   │           ├── header.cljs    ; defc header
   │           ├── todo_list.cljs ; defc todo-list
   │           └── footer.cljs   ; defc footer
   ├── index.html
   ├── vite.config.js
   └── package.json
   ```

2. **Validation checklist**:
   - [ ] `(:require [app.utils :as u])` resolves correctly
   - [ ] `(:require [app.components.header :refer [header]])` works
   - [ ] Nested directory structure maps to namespaces
   - [ ] HMR works across files
   - [ ] Source maps point to correct files
   - [ ] Build produces correct output

3. **E2E integration test**: Compile the example project programmatically and verify output.

### Priority: High (core compiler validation)

---

## Q3: ClojureScript Var Coverage Tracking

### Current State

- No systematic tracking of which ClojureScript vars/functions are supported
- ClojureWasm uses YAML-based tracking (`vars.yaml`) generated from JVM introspection
- Kiso needs a different approach since it targets CLJS (not Clojure JVM)

### Design

Create `.dev/status/vars.yaml` tracking ClojureScript core vars.

**Generation approach**: Since we can't introspect CLJS directly, use a curated reference list.

**Structure**:
```yaml
# Kiso ClojureScript Coverage
# type: special-form | macro | function | dynamic-var
# status: done | partial | todo | skip | n/a
# layer: reader | analyzer | codegen | runtime | evaluator
# note: optional context

vars:
  cljs.core:
    # Special Forms
    "def":        {type: special-form, status: done, layer: analyzer}
    "fn*":        {type: special-form, status: done, layer: analyzer}
    "if":         {type: special-form, status: done, layer: analyzer}
    "do":         {type: special-form, status: done, layer: analyzer}
    "let*":       {type: special-form, status: done, layer: analyzer}
    "loop*":      {type: special-form, status: done, layer: analyzer}
    "recur":      {type: special-form, status: done, layer: analyzer}
    # ... etc

    # Core Functions
    "str":        {type: function, status: done, layer: runtime}
    "map":        {type: function, status: done, layer: runtime}
    "filter":     {type: function, status: done, layer: runtime}
    # ... etc

  cljs.string:
    "upper-case": {type: function, status: todo, layer: runtime}
    "lower-case": {type: function, status: todo, layer: runtime}
    # ... etc
```

**Key considerations**:
- Focus on `cljs.core` first (most impact)
- Track options/variants (e.g., `loop` with destructuring, `recur` with tail position)
- Track by both var name and feature completeness
- Include notes about partial implementations

**Scope**: Start with commonly used vars only (~150-200 from cljs.core), not all 600+.

### Priority: Medium (documentation/tracking, not blocking)

---

## Q4: Language Spec Testing (Complex Patterns)

### Current State

- 846 kiso tests, mostly unit + some e2e
- Threading macros tested but not exhaustively
- JS interop well covered
- Missing tests for edge cases and complex combinations

### Design

Create comprehensive language conformance tests:

```
packages/kiso/test/conformance/
├── threading.test.ts      ; all threading macro edge cases
├── interop.test.ts        ; JS interop advanced patterns
├── destructuring.test.ts  ; deep nested, combined patterns
├── protocols.test.ts      ; extend-type, reify, multi-protocol
├── macros.test.ts         ; complex macro expansion
├── lazy-seq.test.ts       ; lazy evaluation semantics
├── namespaces.test.ts     ; multi-ns, alias, refer
└── special-forms.test.ts  ; edge cases for all SFs
```

**Reference material**:
- `/private/codegen-samples/09-threading.cljs` — threading examples
- ClojureScript test suite (upstream) for edge cases
- `.claude/references/cljs-upstream.md` for semantic reference

**Key areas**:
- `some->` / `some->>` with nil propagation
- `as->` with complex bindings
- Nested destructuring with `:or` defaults + `:as`
- `extend-type` for JS built-in types
- `reify` with multiple protocols
- Multi-arity + variadic + destructuring combined
- `letfn` mutual recursion
- Complex `case` with grouped constants

### Priority: High (correctness assurance)

---

## Q5: Browser E2E Testing (Playwright)

### Current State

- No browser-level tests
- All tests run in Node.js via vitest
- Example app only validated manually

### Design

**Playwright is 100% free and open-source** (Apache 2.0 license).

Setup:
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium  # ~150MB, chromium only
```

**Test structure**:
```
tests/e2e-browser/
├── playwright.config.ts
├── task-manager.spec.ts    ; test the example app
└── multi-ns-app.spec.ts    ; test multi-file example
```

**Test flow**:
1. `vite build` the example app
2. `vite preview` to serve static files
3. Playwright opens browser, interacts with app
4. Assert DOM state, reactivity, component rendering

**Example test**:
```typescript
test('task manager adds and completes tasks', async ({ page }) => {
  await page.goto('http://localhost:4173');
  await page.fill('input', 'Buy groceries');
  await page.click('button:has-text("Add")');
  await expect(page.locator('.task-item')).toHaveCount(1);
});
```

### Priority: Medium (valuable but not blocking)

---

## Q6: CI (Continuous Integration)

### Design

GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test

  # Optional: browser e2e (after Q5)
  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

### Priority: High (essential for quality)

---

## Q7: JavaScript Library Interoperability

### Current State

- Kiso runtime uses custom persistent data structures (PersistentVector, PersistentHashMap, etc.)
- These are NOT plain JS arrays/objects
- `clj->js` and `js->clj` exist in `runtime/interop.ts`
- External JS libraries expect plain JS objects/arrays

### Design

**Problem**: When Kiso components interact with external JS libraries (React, D3, chart libs,
lodash, etc.), data must be converted between Kiso's immutable structures and plain JS.

**Solution layers**:

1. **Automatic boundary conversion** (API layer):
   ```clojure
   ;; Explicit conversion
   (js/fetch (clj->js {:method "POST" :body (clj->js data)}))

   ;; Or: auto-convert at interop boundary
   (.chart js/Chart canvas (clj->js config))
   ```

2. **Bean-style shallow conversion** (new):
   ```clojure
   (bean js-obj)        ; → persistent map (shallow, lazy)
   (js-obj clj-map)     ; → plain JS object (shallow)
   (js-array clj-vec)   ; → plain JS array (shallow)
   ```

3. **Library adapter pattern** (future):
   ```clojure
   ;; Codegen hook for specific libraries
   (react/createElement "div" (clj->js props) children)
   ```

**Key decisions needed**:
- Should `clj->js` be recursive by default? (upstream: yes, with `:keyword-fn` option)
- Should method call args auto-convert? (risky — would break protocol dispatch)
- Should JS interop results auto-wrap? (upstream: no — explicit `js->clj`)

**Recommendation**: Keep explicit conversion. Add `bean` for ergonomics. Do NOT auto-convert
at boundaries — it's too magical and creates performance issues.

### Priority: Low-Medium (works today with explicit conversion, ergonomics can improve later)

---

## Implementation Order

| Priority | Topic | Effort | Impact |
|----------|-------|--------|--------|
| 1        | Q6: CI                    | Small  | High   |
| 2        | Q2: Multi-file validation | Medium | High   |
| 3        | Q4: Conformance tests     | Medium | High   |
| 4        | Q1: clojure.string        | Medium | Medium |
| 5        | Q3: Var tracking          | Medium | Medium |
| 6        | Q5: Playwright e2e        | Medium | Medium |
| 7        | Q7: JS interop layer      | Large  | Low    |
