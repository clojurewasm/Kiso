# Macro System Design — SCI vs Self-Implemented

## Two Approaches

### Option A: Use SCI (Small Clojure Interpreter)

SCI by Michiel Borkent (borkdude). Used in babashka, nbb, joyride.

```
.cljs source → Reader → Form[]
                          │
                          ▼
                  [Core Macros]  TS functions (when, ->, defn, etc.)
                          │
                          ▼
                  [SCI evaluate]  Interpret defmacro expressions
                          │
                          ▼
                  Expanded Form[]
                          │
                          ▼
                  [Analyzer] → [Codegen] → JS
```

**Pros**: Full defmacro spec, well-tested, advanced macros (spec, core.async) work.
**Cons**: +500 KB dependency, AST conversion cost, SCI bugs propagate, not "our own world".

### Option B: Self-Implemented Mini Evaluator (Recommended)

Leverage CW's TreeWalk evaluator knowledge. Build a minimal Clojure evaluator
specialized for macro expansion.

```
.cljs source → Reader → Form[]
                          │
                          ▼
                  [Core Macros]  TS functions (~40)
                          │     when, cond, ->, ->>, defn, let,
                          │     if-let, when-let, doto, ...
                          │
                          ▼
                  [defmacro?] ─── No ──→ Expanded Form[]
                          │
                          Yes
                          ▼
                  [Mini Evaluator]  Direct Form interpretation
                          │         ~30 core functions
                          │         cons, concat, seq, list,
                          │         symbol, keyword, gensym, ...
                          ▼
                  Expanded Form[]
                          │
                          ▼
                  [Analyzer] → [Codegen] → JS
```

**Pros**: Full control, zero deps, no Form conversion, YAGNI, CW TreeWalk knowledge applies.
**Cons**: Advanced macros need incremental work, self-maintained bugs.

---

## Recommendation: Option B (Self-Implemented)

1. **99% of macros run on ~30 functions** (from CW experience)
2. SCI AST ↔ Form conversion is a permanent cost
3. Fewer dependencies = easier distribution and maintenance
4. CW TreeWalk evaluator design knowledge applies directly

---

## Core Macros (Implemented as TS Functions)

~40 macros ported from CW's `macro_transforms.zig`.
These **do not use the evaluator**: pure Form → Form transformations.

### Classification

| Category     | Macros | Complexity |
|-------------|--------|------------|
| Control flow | `when`, `when-not`, `when-let`, `when-first`, `when-some`, `if-let`, `if-some`, `if-not`, `cond`, `condp`, `cond->`, `cond->>`, `case` | Low-Medium |
| Threading   | `->`, `->>`, `some->`, `some->>`, `as->`, `doto` | Low |
| Definition  | `defn`, `defn-`, `defmacro`, `defonce`, `defmethod`, `defmulti`, `defprotocol`, `defrecord`, `deftype` | Medium-High |
| Binding     | `let`, `loop`, `for`, `doseq`, `dotimes`, `binding` | Medium |
| Exception   | `try`, `assert` | Low |
| Concurrency | `locking`, `lazy-seq`, `delay`, `future` | Low |
| Other       | `and`, `or`, `not`, `..`, `fn`, `declare`, `comment`, `time` | Low |

### Transform Examples

```typescript
// when → if
function expandWhen(form: Form): Form {
  // (when test body1 body2 ...) → (if test (do body1 body2 ...) nil)
  const [_, test, ...body] = formToList(form);
  return makeList([
    makeSymbol('if'), test,
    makeList([makeSymbol('do'), ...body]),
  ]);
}

// -> (threading macro)
function expandThreadFirst(form: Form): Form {
  // (-> x (f a) (g b)) → (g (f x a) b)
  const [_, init, ...steps] = formToList(form);
  return steps.reduce((acc, step) => {
    if (step.data.type === 'list') {
      const [fn, ...args] = formToList(step);
      return makeList([fn, acc, ...args]);
    }
    return makeList([step, acc]);
  }, init);
}

// defn → def + fn*
function expandDefn(form: Form): Form {
  // (defn name docstring? attr-map? [params] body...)
  // → (def name (fn* name ([params] body...)))
  const items = formToList(form);
  let idx = 1;
  const name = items[idx++];

  let docstring: Form | null = null;
  if (items[idx]?.data.type === 'string') docstring = items[idx++];

  let attrMap: Form | null = null;
  if (items[idx]?.data.type === 'map') attrMap = items[idx++];

  const fnBody = items.slice(idx);
  const fnForm = makeList([makeSymbol('fn*'), name, ...fnBody]);
  let defForm = makeList([makeSymbol('def'), name, fnForm]);

  if (docstring || attrMap) {
    const meta = buildMeta(name, docstring, attrMap);
    defForm = makeList([makeSymbol('with-meta'), defForm, meta]);
  }
  return defForm;
}
```

### Key Lessons from CW

1. **`defn` multi-arity**: `(defn f ([x] ...) ([x y] ...))` — vector params = single, list = multi
2. **`let` destructuring**: each binding pair expanded recursively (CW `destructure.zig`)
3. **`for` is most complex**: `:let`, `:when`, `:while` modifiers → nested `loop/recur`
4. **`case` is constant table**: hash-value jumps (TS naturally maps to `switch`)
5. **`cond` with `:else`**: `:else` is not a special keyword, just a truthy value

---

## Mini Evaluator (for defmacro)

### Design Principles (from CW TreeWalk)

1. **Interpret Form directly** — no conversion to intermediate AST
2. **Immutable environments** — let/fn create new environments
3. **Minimal built-in functions** — only what macro expansion needs
4. **Fixed special forms** — no adding to the evaluator later

### Special Forms

```typescript
const SPECIAL_FORMS = [
  'def', 'fn*', 'let*', 'do', 'if', 'quote',
  'loop*', 'recur', 'try', 'throw',
  'var', 'set!', 'new', '.',
] as const;
```

CW has ~30 special forms, but the above suffice for macro expansion.
`deftype*`, `defrecord*`, `reify*`, `case*` can be added later.

### Built-in Functions (~30)

Extracted from CW experience — functions actually used in macro expansion:

```typescript
// Collection operations (core of macro expansion)
'cons', 'concat', 'list', 'list*',
'first', 'rest', 'next', 'seq', 'empty?',
'conj', 'assoc', 'dissoc', 'get',
'vec', 'vector', 'hash-map', 'hash-set',
'count', 'nth', 'contains?',

// Symbol/keyword operations
'symbol', 'keyword', 'name', 'namespace',
'symbol?', 'keyword?', 'string?', 'number?',
'list?', 'vector?', 'map?', 'set?', 'seq?',
'nil?', 'true?', 'false?',

// Generation
'gensym',

// Equality/comparison
'=', 'not=', '<', '>', '<=', '>=',

// Arithmetic (minimal)
'+', '-', '*', '/',

// String
'str', 'subs', 'pr-str',

// Other
'apply', 'identity', 'not',
'meta', 'with-meta', 'vary-meta',
```

**CW lesson**: 99% of defmacro uses only these ~30 functions + collection ops.
The remaining 1% (spec, core.async, etc.) can be added incrementally.

### Evaluator Skeleton

```typescript
// evaluator.ts
type Env = {
  bindings: Map<string, Form>;
  parent: Env | null;
};

class MacroEvaluator {
  private gensymCounter = 0;
  private builtins: Map<string, BuiltinFn>;

  constructor() {
    this.builtins = this.initBuiltins();
  }

  evaluate(form: Form, env: Env): Form {
    switch (form.data.type) {
      case 'nil': case 'boolean': case 'integer': case 'float':
      case 'bigint': case 'string': case 'char': case 'keyword':
      case 'regex':
        return form; // self-evaluating
      case 'symbol':  return this.resolveSymbol(form, env);
      case 'vector':  return this.evaluateVector(form, env);
      case 'map':     return this.evaluateMap(form, env);
      case 'set':     return this.evaluateSet(form, env);
      case 'list':    return this.evaluateList(form, env);
      default:
        throw new EvaluatorError(`Cannot evaluate: ${form.data.type}`);
    }
  }
  // ... special form handlers, function application
}
```

**CW TreeWalk mapping**:
- `tree_walk.zig: evalExpression()` → `MacroEvaluator.evaluate()`
- `tree_walk.zig: lookUpVariable()` → `MacroEvaluator.resolveSymbol()`
- `tree_walk.zig: applyFn()` → `MacroEvaluator.applyFn()`
- `Env` chain structure is identical (parent pointer)

---

## Macro Expansion Pipeline

```typescript
class MacroExpander {
  private coreMacros: Map<string, (form: Form) => Form>;
  private userMacros: Map<string, Form>; // fn forms registered via defmacro
  private evaluator: MacroEvaluator;

  expand(form: Form): Form {
    if (form.data.type !== 'list') return form;
    const items = (form.data as { items: Form[] }).items;
    if (items.length === 0) return form;

    const head = items[0];
    if (head.data.type !== 'symbol') return this.expandChildren(form);

    const name = resolveSymbolName(head);

    // 1. Core macro? (TS function)
    const coreMacro = this.coreMacros.get(name);
    if (coreMacro) return this.expand(coreMacro(form)); // recursive expansion

    // 2. User macro? (defmacro)
    const userMacro = this.userMacros.get(name);
    if (userMacro) {
      const args = items.slice(1); // unevaluated (macros don't evaluate args)
      const expanded = this.evaluator.applyFn(userMacro, args);
      return this.expand(expanded); // recursive expansion
    }

    // 3. Special form or regular function call → expand children
    return this.expandChildren(form);
  }
}
```

**CW lessons**:
- Macro expansion is **recursive** — expanded result is expanded again
- Set expansion loop limit (CW uses 1024)
- Maintain distinction between `macroexpand-1` and `macroexpand`
- `&form` and `&env` are passed as implicit arguments

---

## Incremental Implementation Roadmap

### Phase 0: Core Macros Only (MVP)
- ~40 TS function macros, no defmacro
- Enough for su's defc/defstyle
- ~500 lines

### Phase 1: Mini Evaluator
- defmacro support, ~30 built-in functions
- Read and expand cljs.core macro definition files (.cljs)
- ~800 lines

### Phase 2: Evaluator Extensions
- Destructuring in fn params, multi-arity fn, loop/recur, try/catch, apply/partial
- ~400 additional lines

### Phase 3: (Optional) SCI Fallback
- Only if self-implemented evaluator can't handle advanced macros
- CW experience: 99% of use cases covered by Phase 1

---

## Decision Matrix

| Aspect           | SCI                 | Self-Implemented    |
|------------------|---------------------|---------------------|
| Initial cost     | **Low** (npm i)     | Medium (~800 lines) |
| Long-term maint  | Track SCI versions  | **Full control**    |
| Bundle size      | +500 KB             | **+0 KB**           |
| Form conversion  | Required every time  | **Not needed**      |
| CW knowledge use | Indirect            | **Direct**          |
| Debugging        | Trace SCI internals | **Everything visible** |
| Advanced macros  | **Immediate**       | Incremental         |
| spec/core.async  | **Supported**       | Separate impl       |
| Zero deps        | No                  | **Yes**             |

**Conclusion**: Self-implemented mini evaluator is sufficient for su + general ClojureScript.
SCI can be added as Phase 3 fallback if spec/core.async support is needed later.
