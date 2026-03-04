# Analyzer & Codegen Design — CW Knowledge Port

## Overview

Analyzer: Form[] → Node[] (AST optimized for JS codegen)
Codegen:  Node[] → ES6 JavaScript + Source Map

Ports knowledge from CW's analyzer.zig (special form dispatch) and compiler.zig
(bytecode generation) to TS-based JS code generation.

---

## Analyzer

### Analyzed AST Node Types

```typescript
// node.ts
export type Node =
  | { type: 'literal'; value: any; jsType: 'null' | 'boolean' | 'number' | 'string' }
  | { type: 'keyword'; ns: string | null; name: string }
  | { type: 'vector'; items: Node[] }
  | { type: 'map'; keys: Node[]; vals: Node[] }
  | { type: 'set'; items: Node[] }
  | { type: 'var-ref'; ns: string; name: string; local: boolean }
  | { type: 'invoke'; fn: Node; args: Node[] }
  | { type: 'if'; test: Node; then: Node; else: Node | null }
  | { type: 'do'; statements: Node[]; ret: Node }
  | { type: 'let'; bindings: LetBinding[]; body: Node }
  | { type: 'fn'; name: string | null; arities: FnArity[]; variadic: FnArity | null }
  | { type: 'def'; name: string; init: Node | null; meta: Node | null }
  | { type: 'recur'; args: Node[] }
  | { type: 'loop'; bindings: LetBinding[]; body: Node }
  | { type: 'throw'; expr: Node }
  | { type: 'try'; body: Node; catches: CatchClause[]; finally: Node | null }
  | { type: 'new'; class: Node; args: Node[] }
  | { type: 'interop-call'; target: Node; method: string; args: Node[] }
  | { type: 'interop-field'; target: Node; field: string }
  | { type: 'set!'; target: Node; value: Node }
  | { type: 'js-raw'; code: string }
  | { type: 'ns'; name: string; requires: NsRequire[]; imports: NsImport[] };

type LetBinding = { name: string; init: Node };
type FnArity = { params: string[]; restParam: string | null; body: Node };
type CatchClause = { exType: string; binding: string; body: Node };
type NsRequire = { ns: string; alias: string | null; refers: string[] };
type NsImport = { module: string; names: string[] };
```

### Special Form Dispatch

CW dispatches ~30 special forms via StaticMap. TS equivalent: `Map<string, handler>`.

```typescript
class Analyzer {
  private specialForms: Map<string, (form: Form, ctx: AnalyzerContext) => Node>;

  constructor() {
    this.specialForms = new Map([
      ['def', this.analyzeDef.bind(this)],
      ['fn*', this.analyzeFn.bind(this)],
      ['let*', this.analyzeLet.bind(this)],
      ['do', this.analyzeDo.bind(this)],
      ['if', this.analyzeIf.bind(this)],
      ['quote', this.analyzeQuote.bind(this)],
      ['loop*', this.analyzeLoop.bind(this)],
      ['recur', this.analyzeRecur.bind(this)],
      ['try', this.analyzeTry.bind(this)],
      ['throw', this.analyzeThrow.bind(this)],
      ['new', this.analyzeNew.bind(this)],
      ['.', this.analyzeDot.bind(this)],
      ['set!', this.analyzeSetBang.bind(this)],
      ['var', this.analyzeVar.bind(this)],
      ['js*', this.analyzeJsStar.bind(this)],
      ['ns', this.analyzeNs.bind(this)],
      ['deftype*', this.analyzeDeftype.bind(this)],
      ['defrecord*', this.analyzeDefrecord.bind(this)],
      ['letfn*', this.analyzeLetfn.bind(this)],
      ['case*', this.analyzeCase.bind(this)],
    ]);
  }
}
```

### Key Analyzer Lessons from CW

#### 1. Locals Shadow Special Forms

```clojure
(let [if 42] if) ;; → 42, not a special form
```

CW: check local scope **first**, special forms **second**.

#### 2. letfn Is 2-Pass

```clojure
(letfn [(even? [n] (if (zero? n) true (odd? (dec n))))
        (odd?  [n] (if (zero? n) false (even? (dec n))))]
  (even? 10))
```

Pass 1: register all function names in scope.
Pass 2: analyze bodies (can reference each other). Enables mutual recursion.

#### 3. Interop Rewrite

```clojure
(.method obj args...)  → (. obj method args...)
(Ctor. args...)        → (new Ctor args...)
(.-field obj)          → (. obj -field)
```

CW: symbols starting with `.` rewritten to interop calls.
`-` prefix distinguishes field access from method calls.

#### 4. Destructuring (from CW destructure.zig)

Two kinds:

**Sequential** (vector pattern): `[a b & rest :as all]`
→ nth-based (no &) or seq-based (with &)

**Associative** (map pattern): `{:keys [a b] :or {a 0} :as m}`
→ get-based

**CW optimization**: without `&`, use `nth` (O(1) for vectors).
With `&`, use `seq`/`first`/`next` (O(n)). The no-& fast path matters.

#### 5. Multiple catch → Nested try

```clojure
(try body (catch E1 e1 h1) (catch E2 e2 h2))
```
→ instanceof chain (JS `catch` doesn't support type specification)

---

## Codegen

### Key Codegen Lessons from CW

#### 1. Truthiness Conversion

Clojure: only `nil` and `false` are falsy.
JavaScript: `0`, `""`, `NaN`, `undefined` are also falsy.

```typescript
// Only the test part of `if` needs conversion
private emitIf(node: IfNode): string {
  const test = this.emit(node.test);
  const then = this.emit(node.then);
  const else_ = node.else ? this.emit(node.else) : 'null';
  return `(${test} != null && ${test} !== false) ? ${then} : ${else_}`;
}
```

**Optimization** (CW knowledge):
- If `test` statically returns boolean → no conversion needed
- If `test` is `nil?`, `some?`, `=`, etc. → no conversion needed
- Propagate `boolean-context` flag in Analyzer to skip unnecessary conversions

#### 2. recur → while Loop

```clojure
(loop [i 0 sum 0]
  (if (< i 10) (recur (inc i) (+ sum i)) sum))
```
→
```javascript
let i = 0, sum = 0;
while (true) {
  if (i < 10) {
    const _i = i + 1; const _sum = sum + i;
    i = _i; sum = _sum; continue;
  } else { return sum; }
}
```

**CW lessons**:
- recur args must be **fully evaluated before** simultaneous assignment (temp vars)
- Tail `recur` in `fn` uses same transformation (wrap entire function in `while`)

#### 3. Multi-arity → switch

```clojure
(defn f ([x] (f x 0)) ([x y] (+ x y)))
```
→
```javascript
function f(...args) {
  switch (args.length) {
    case 1: { const [x] = args; return f(x, 0); }
    case 2: { const [x, y] = args; return x + y; }
    default: throw new Error(`Wrong arity: ${args.length}`);
  }
}
```

**CW optimization**: single arity skips `switch`, uses direct parameters.

#### 4. NS → ES6 Module

```clojure
(ns my.app.core
  (:require [cljs.core :as c]
            [my.app.util :refer [helper]]))
```
→
```javascript
import * as c from '@clojurewasm/kiso/core';
import { helper } from './util.js';
```

**Mapping rules**:
- `cljs.core` → `@clojurewasm/kiso/core` (npm package)
- Same project → relative path with `.js` extension
- `:refer [x]` → named import
- `:as alias` → namespace import
- All `def`/`defn` → `export`

#### 5. Name Munging

Clojure symbols contain characters invalid in JS identifiers.

```typescript
function munge(name: string): string {
  return name
    .replace(/-/g, '_')
    .replace(/\?/g, '_QMARK_')
    .replace(/!/g, '_BANG_')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_EQ_')
    .replace(/\//g, '_SLASH_')
    .replace(/'/g, '_SINGLEQUOTE_')
    .replace(/&/g, '_AMPERSAND_');
}
```

Same munging rules as CW. Reverse munging (demunge) needed for Source Maps.

---

## Source Map Generation

Reader attaches position info (line/col) to every Form.
Codegen maps these to generated JS positions via Source Map V3 (VLQ encoding).

**CW insight**: If the Reader records accurate line/col, Source Map generation
in Codegen is mechanical — no special logic needed.

---

## Size Estimate

```
analyzer.ts:     ~500 lines (special form dispatch + scope)
destructure.ts:  ~200 lines (sequential + associative destructuring)
node.ts:         ~100 lines (type definitions)
emitter.ts:      ~600 lines (Node → JS)
sourcemap.ts:    ~100 lines (VLQ encoding)
modules.ts:      ~150 lines (ns → ES6 import/export)
─────────────────────────
Total: ~1,650 lines (excluding tests)
Tests: ~800 lines
```
