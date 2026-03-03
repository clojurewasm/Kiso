# Protocol System & LazySeq Design — CW Knowledge Port

## Scope

This document covers:
1. Protocol system: defprotocol, extend-type, deftype, defrecord, reify
2. LazySeq: lazy-seq macro and LazySeq runtime type
3. JS-specific codegen for both

---

## Protocol System

### Design Principle: Symbol-based Dispatch

CW uses string-keyed lookup on a mutable `impls` map. Kiso uses **JS Symbol** keys
on prototypes, leveraging JavaScript's native dispatch. This is cleaner, faster,
and avoids name mangling entirely.

**Key difference from CW**: CW stores impls in a mutable map on the Protocol object
and dispatches via `valueTypeKey() → map lookup`. Kiso instead stores impls directly
on the object's prototype using Symbol-keyed methods. This eliminates the need for
inline caches and generation counters.

### Runtime: `protocols.ts`

```typescript
// A protocol is a collection of Symbol-keyed method slots.
export type Protocol = {
  name: string;
  methods: Record<string, symbol>;       // method-name → Symbol
  satisfies: symbol;                     // marker Symbol for satisfies? check
};

export function defprotocol(name: string, methodNames: string[]): Protocol {
  const methods: Record<string, symbol> = {};
  for (const m of methodNames) {
    methods[m] = Symbol(`${name}.${m}`);
  }
  return { name, methods, satisfies: Symbol(`${name}?`) };
}

// Protocol function: dispatches via Symbol key on first arg.
export function protocolFn(proto: Protocol, methodName: string): (...args: any[]) => any {
  const sym = proto.methods[methodName]!;
  return function(target: any, ...args: any[]) {
    const fn = target?.[sym];
    if (fn) return fn.call(target, ...args);
    // Fallback: check for Object extension
    const ext = (proto as any)._objectImpl?.[methodName];
    if (ext) return ext(target, ...args);
    throw new Error(`No protocol method ${name}.${methodName} for type ${typeof target}`);
  };
}
```

**Usage**:
```typescript
const ISeq = defprotocol('ISeq', ['first', 'rest']);
// ISeq.methods.first → Symbol('ISeq.first')
// ISeq.methods.rest  → Symbol('ISeq.rest')

class PersistentList {
  [ISeq.methods.first]() { return this.head; }
  [ISeq.methods.rest]()  { return this.tail; }
}
```

### Analyzer: New Special Forms & Node Types

#### `defprotocol` (macro → multiple defs)

```clojure
(defprotocol IFoo
  (foo [this])
  (bar [this x]))
```

Macro expansion:
```clojure
(do
  (def IFoo (kiso.runtime/defprotocol "IFoo" ["foo" "bar"]))
  (def foo (kiso.runtime/protocolFn IFoo "foo"))
  (def bar (kiso.runtime/protocolFn IFoo "bar")))
```

This is a **pure macro transform** — no new special form needed. The macro produces
`def` + runtime function calls that the existing analyzer/codegen handles.

**CW comparison**: CW has a dedicated `defprotocol` opcode. Kiso doesn't need one
because JS lets us build Protocol objects with plain function calls at module load time.

#### `deftype*` special form

```clojure
(deftype* Point [x y]
  IFoo
  (foo [this] (:x this)))
```

Analyzer produces:

```typescript
export type DeftypeNode = {
  type: 'deftype';
  name: string;
  fields: string[];
  protocols: ProtocolImpl[];
};

export type ProtocolImpl = {
  protocol: Node;              // reference to protocol var
  methods: ProtocolMethodImpl[];
};

export type ProtocolMethodImpl = {
  name: string;
  fn: FnNode;                  // the method body as a fn node
};
```

**JS codegen**:

```javascript
// (deftype* Point [x y] IFoo (foo [this] (:x this)))
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
  [IFoo.methods.foo]() { return keyword("x")(this); }
}
// Factory function
function __GT_Point(x, y) { return new Point(x, y); }
```

Key codegen decisions:
- `deftype` → ES6 `class` with constructor
- Fields → constructor properties
- Protocol methods → `[Symbol]()` computed property methods
- Factory `->Name` → function wrapping `new`

#### `defrecord*` special form

Same as `deftype*` but additionally:
- Implements map-like behavior (keywords access fields)
- Generates `map->Name` factory
- Adds `__kiso_type` property for type discrimination

```javascript
class Point {
  constructor(x, y) { this.x = x; this.y = y; this.__kiso_type = "Point"; }
  [ISeq.methods.first]() { /* ... */ }
}
function __GT_Point(x, y) { return new Point(x, y); }
function map__GT_Point(m) { return new Point(get(m, keyword("x")), get(m, keyword("y"))); }
```

#### `extend-type` (macro → prototype mutation)

```clojure
(extend-type PersistentVector
  IFoo
  (foo [this] (first this)))
```

Macro expansion that produces `set!` on prototype:

```javascript
PersistentVector.prototype[IFoo.methods.foo] = function() { return first(this); };
```

**CW comparison**: CW mutates `protocol.impls` map. Kiso mutates prototypes directly.
Both achieve the same goal: retroactively adding protocol implementations to existing types.

For primitive types (string, number, nil), use the Object fallback mechanism in `protocolFn`.

#### `reify` (analyzed inline)

```clojure
(reify IFoo (foo [this] 42))
```

Codegen:
```javascript
({ [IFoo.methods.foo]() { return 42; } })
```

Simply create an object literal with Symbol-keyed methods. No class needed.

**CW comparison**: CW generates a unique `__reify_N` type key and extends protocols.
Kiso can use plain object literals because JS Symbol dispatch works on any object.

### `satisfies?`

```clojure
(satisfies? IFoo x)
```

Codegen:
```javascript
(x != null && x[IFoo.satisfies] !== undefined)
```

Or simpler: check for the presence of any method Symbol:
```javascript
(x != null && typeof x[IFoo.methods.foo] === 'function')
```

### Type Discrimination for extend-type on Primitives

| Clojure type | JS type | How extend-type works |
|---|---|---|
| String | string | Object fallback in protocolFn (can't add to string prototype) |
| Number | number | Object fallback |
| nil | null/undefined | Explicit nil check in protocolFn |
| Keyword | Keyword class | Prototype Symbol method |
| PersistentVector | PersistentVector class | Prototype Symbol method |
| Any custom deftype/defrecord | ES6 class | Prototype Symbol method |

### Summary: CW → Kiso Translation

| CW concept | Kiso JS equivalent |
|---|---|
| `Protocol.impls` map | Prototype Symbol methods |
| `ProtocolFn` + inline cache | `protocolFn()` closure + direct Symbol dispatch |
| `valueTypeKey()` | Not needed (JS dispatches via prototype chain) |
| `generation` counter | Not needed (prototype mutation is instant) |
| `__reify_type` tag | `__kiso_type` property (for records/types) |
| `extend_type_method` opcode | Prototype assignment |

---

## LazySeq

### Design Principle

A thunk that memoizes its result on first access. Implements ISeq.

**CW approach**: `lazy_seq_node` → compiler emits thunk → runtime `realize()`.
**Kiso approach**: Same concept, JS closure + memoization.

### Runtime: LazySeq class

```typescript
export class LazySeq {
  private fn: (() => any) | null;
  private sv: any = null;           // cached seq value
  private s: any = null;            // realized seq

  constructor(fn: () => any) {
    this.fn = fn;
  }

  private sval(): any {
    if (this.fn !== null) {
      this.sv = this.fn();
      this.fn = null;
    }
    return this.sv;
  }

  seq(): any {
    this.sval();
    if (this.sv !== null) {
      let ls = this.sv;
      this.sv = null;
      // Walk nested LazySeqs
      while (ls instanceof LazySeq) {
        ls = ls.sval();
      }
      this.s = seq(ls);  // call seq protocol
    }
    return this.s;
  }

  // ISeq implementation
  [ISeq.methods.first](): any {
    this.seq();
    if (this.s === null) return null;
    return first(this.s);
  }

  [ISeq.methods.rest](): any {
    this.seq();
    if (this.s === null) return EMPTY_LIST;
    return rest(this.s);
  }
}
```

**CW lesson**: LazySeq chains nested LazySeqs on realization (the `while` loop).
This prevents stack overflow from deeply nested lazy chains like `(map f (map g xs))`.

### Macro: `lazy-seq`

```clojure
(lazy-seq body)
```

Macro expansion:
```clojure
(new kiso.runtime/LazySeq (fn* [] body))
```

Codegen:
```javascript
new LazySeq(function() { return body; })
```

### Dependencies

- **Requires Protocol system**: LazySeq implements `ISeq` via Symbol methods.
- **Requires `seq()` protocol function**: Used in `LazySeq.seq()` to realize.
- **Enables**: `for`, `map`, `filter`, `take`, `drop` returning lazy sequences.

---

## Implementation Order

```
1. protocols.ts (defprotocol, protocolFn)         — runtime foundation
2. defprotocol macro                               — macro transform
3. deftype* special form + codegen                 — analyzer + emitter
4. extend-type macro                               — prototype mutation
5. defrecord* special form + codegen               — deftype + map extras
6. reify                                           — object literal codegen
7. Retrofit ISeq/ICounted/etc on existing types    — extend-type on Vector, List, etc.
8. LazySeq class                                   — runtime
9. lazy-seq macro                                  — trivial macro
```

Steps 1-2 unblock all subsequent work. Step 7 is the integration point where existing
runtime types gain protocol-based dispatch.

---

## Codegen Examples

### defprotocol

```clojure
(defprotocol ISeq
  (first [coll])
  (rest [coll]))
```

```javascript
const ISeq = defprotocol("ISeq", ["first", "rest"]);
const first = protocolFn(ISeq, "first");
const rest = protocolFn(ISeq, "rest");
export { ISeq, first, rest };
```

### deftype

```clojure
(deftype Cons [head tail]
  ISeq
  (first [_] head)
  (rest [_] tail))
```

```javascript
class Cons {
  constructor(head, tail) { this.head = head; this.tail = tail; }
  [ISeq.methods.first]() { return this.head; }
  [ISeq.methods.rest]() { return this.tail; }
}
function __GT_Cons(head, tail) { return new Cons(head, tail); }
export { Cons, __GT_Cons };
```

### extend-type

```clojure
(extend-type PersistentVector
  ISeq
  (first [v] (nth v 0))
  (rest [v] (subvec v 1)))
```

```javascript
PersistentVector.prototype[ISeq.methods.first] = function() { return nth(this, 0); };
PersistentVector.prototype[ISeq.methods.rest] = function() { return subvec(this, 1); };
```

### reify

```clojure
(reify ISeq
  (first [_] 42)
  (rest [_] nil))
```

```javascript
({ [ISeq.methods.first]() { return 42; }, [ISeq.methods.rest]() { return null; } })
```
