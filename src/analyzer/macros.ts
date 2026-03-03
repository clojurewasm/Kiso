// Core Macros — Pure Form→Form transformations.
//
// ~40 core macros ported from CW's macro_transforms.zig.
// These do NOT use the evaluator: they are pure syntactic transforms.

import {
  type Form,
  makeNil,
  makeBool,
  makeSymbol,
  makeStr,
  makeList,
  makeVector,
  makeMap,
  makeKeyword,
} from '../reader/form.js';

type MacroFn = (items: Form[], form: Form) => Form;

const MACROS = new Map<string, MacroFn>();

function defmacro(name: string, fn: MacroFn): void {
  MACROS.set(name, fn);
}

// -- Public API --

/** Expand one level of macro. Returns the form unchanged if not a macro call. */
export function expandOnce(form: Form): Form {
  if (form.data.type !== 'list') return form;
  const items = form.data.items;
  if (items.length === 0) return form;
  const head = items[0]!;
  if (head.data.type !== 'symbol' || head.data.ns !== null) return form;
  const macroFn = MACROS.get(head.data.name);
  if (!macroFn) return form;
  return macroFn(items, form);
}

/** Expand all macros recursively (both the form itself and its children). */
export function expandAll(form: Form): Form {
  // Expand this form until it stops changing
  let current = form;
  for (let i = 0; i < 1024; i++) {
    const expanded = expandOnce(current);
    if (expanded === current) break;
    current = expanded;
  }

  // Expand children
  if (current.data.type === 'list') {
    const newItems = current.data.items.map(expandAll);
    return { ...current, data: { type: 'list', items: newItems } };
  }
  if (current.data.type === 'vector') {
    const newItems = current.data.items.map(expandAll);
    return { ...current, data: { type: 'vector', items: newItems } };
  }
  if (current.data.type === 'map') {
    const newItems = current.data.items.map(expandAll);
    return { ...current, data: { type: 'map', items: newItems } };
  }
  if (current.data.type === 'set') {
    const newItems = current.data.items.map(expandAll);
    return { ...current, data: { type: 'set', items: newItems } };
  }

  return current;
}

// == Helpers ==

/** Non-null item access. Macros always receive well-formed lists from the reader. */
function nth(items: Form[], i: number): Form {
  return items[i]!;
}

function sym(name: string): Form { return makeSymbol(null, name); }

function loc(form: Form): [number, number] { return [form.line, form.col]; }

// -- Control Flow --

defmacro('when', (items, form) => {
  // (when test body...) → (if test (do body...) nil)
  const test = nth(items, 1);
  const body = items.slice(2);
  return makeList([sym('if'), test, makeList([sym('do'), ...body]), makeNil()], ...loc(form));
});

defmacro('when-not', (items, form) => {
  // (when-not test body...) → (if (not test) (do body...) nil)
  const test = nth(items, 1);
  const body = items.slice(2);
  return makeList([sym('if'), makeList([sym('not'), test]), makeList([sym('do'), ...body]), makeNil()], ...loc(form));
});

defmacro('if-not', (items, form) => {
  // (if-not test then else?) → (if (not test) then else)
  const test = nth(items, 1);
  const then = nth(items, 2);
  const els = items.length > 3 ? nth(items, 3) : makeNil();
  return makeList([sym('if'), makeList([sym('not'), test]), then, els], ...loc(form));
});

defmacro('if-let', (items, form) => {
  // (if-let [x init] then else?) → (let* [x init] (if x then else))
  const bindings = nth(items, 1);
  const then = nth(items, 2);
  const els = items.length > 3 ? nth(items, 3) : makeNil();
  if (bindings.data.type !== 'vector') throw new Error('if-let requires a vector');
  const name = nth(bindings.data.items, 0);
  const init = nth(bindings.data.items, 1);
  return makeList([
    sym('let*'),
    makeVector([name, init]),
    makeList([sym('if'), name, then, els]),
  ], ...loc(form));
});

defmacro('when-let', (items, form) => {
  // (when-let [x init] body...) → (let* [x init] (when x body...))
  const bindings = nth(items, 1);
  const body = items.slice(2);
  if (bindings.data.type !== 'vector') throw new Error('when-let requires a vector');
  const name = nth(bindings.data.items, 0);
  const init = nth(bindings.data.items, 1);
  return makeList([
    sym('let*'),
    makeVector([name, init]),
    makeList([sym('when'), name, ...body]),
  ], ...loc(form));
});

defmacro('if-some', (items, form) => {
  // (if-some [x expr] then else?) → (let* [x expr] (if (nil? x) else then))
  const bindings = nth(items, 1);
  const then = nth(items, 2);
  const els = items.length > 3 ? nth(items, 3) : makeNil();
  if (bindings.data.type !== 'vector') throw new Error('if-some requires a vector');
  const name = nth(bindings.data.items, 0);
  const init = nth(bindings.data.items, 1);
  return makeList([
    sym('let*'),
    makeVector([name, init]),
    makeList([sym('if'), makeList([sym('nil?'), name]), els, then]),
  ], ...loc(form));
});

defmacro('when-some', (items, form) => {
  // (when-some [x expr] body...) → (let* [x expr] (if (nil? x) nil (do body...)))
  const bindings = nth(items, 1);
  const body = items.slice(2);
  if (bindings.data.type !== 'vector') throw new Error('when-some requires a vector');
  const name = nth(bindings.data.items, 0);
  const init = nth(bindings.data.items, 1);
  return makeList([
    sym('let*'),
    makeVector([name, init]),
    makeList([sym('if'), makeList([sym('nil?'), name]), makeNil(), makeList([sym('do'), ...body])]),
  ], ...loc(form));
});

defmacro('when-first', (items, form) => {
  // (when-first [x coll] body...) → (let* [wf__auto (seq coll)] (if wf__auto (let* [x (first wf__auto)] (do body...)) nil))
  const bindings = nth(items, 1);
  const body = items.slice(2);
  if (bindings.data.type !== 'vector') throw new Error('when-first requires a vector');
  const name = nth(bindings.data.items, 0);
  const coll = nth(bindings.data.items, 1);
  const autoSym = sym('wf__auto');
  return makeList([
    sym('let*'),
    makeVector([autoSym, makeList([sym('seq'), coll])]),
    makeList([sym('if'), autoSym,
      makeList([sym('let*'), makeVector([name, makeList([sym('first'), autoSym])]), makeList([sym('do'), ...body])]),
      makeNil()]),
  ], ...loc(form));
});

defmacro('cond', (items, form) => {
  // (cond a 1 b 2) → (if a 1 (if b 2 nil))
  const pairs = items.slice(1);
  if (pairs.length === 0) return makeNil(...loc(form));
  return buildCondChain(pairs, form);
});

function buildCondChain(pairs: Form[], form: Form): Form {
  if (pairs.length === 0) return makeNil(...loc(form));
  const test = nth(pairs, 0);
  const value = nth(pairs, 1);
  const rest = pairs.slice(2);
  return makeList([sym('if'), test, value, buildCondChain(rest, form)], ...loc(form));
}

defmacro('and', (items, form) => {
  // (and) → true
  // (and x) → x
  // (and x y) → (let* [and__auto x] (if and__auto y and__auto))
  const args = items.slice(1);
  if (args.length === 0) return makeBool(true, ...loc(form));
  if (args.length === 1) return nth(args, 0);
  const first = nth(args, 0);
  const rest = args.slice(1);
  const autoSym = sym('and__auto');
  const restExpr = rest.length === 1 ? nth(rest, 0) : makeList([sym('and'), ...rest]);
  return makeList([
    sym('let*'),
    makeVector([autoSym, first]),
    makeList([sym('if'), autoSym, restExpr, autoSym]),
  ], ...loc(form));
});

defmacro('or', (items, form) => {
  // (or) → nil
  // (or x) → x
  // (or x y) → (let* [or__auto x] (if or__auto or__auto y))
  const args = items.slice(1);
  if (args.length === 0) return makeNil(...loc(form));
  if (args.length === 1) return nth(args, 0);
  const first = nth(args, 0);
  const rest = args.slice(1);
  const autoSym = sym('or__auto');
  const restExpr = rest.length === 1 ? nth(rest, 0) : makeList([sym('or'), ...rest]);
  return makeList([
    sym('let*'),
    makeVector([autoSym, first]),
    makeList([sym('if'), autoSym, autoSym, restExpr]),
  ], ...loc(form));
});

// -- Threading --

defmacro('->', (items, form) => {
  // (-> x (f a) (g b)) → (g (f x a) b)
  const init = nth(items, 1);
  const steps = items.slice(2);
  if (steps.length === 0) return init;
  return steps.reduce<Form>((acc, step) => {
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      return makeList([fn, acc, ...args], ...loc(form));
    }
    return makeList([step, acc], ...loc(form));
  }, init);
});

defmacro('->>', (items, form) => {
  // (->> x (f a) (g b)) → (g b (f a x))
  const init = nth(items, 1);
  const steps = items.slice(2);
  if (steps.length === 0) return init;
  return steps.reduce<Form>((acc, step) => {
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      return makeList([fn, ...args, acc], ...loc(form));
    }
    return makeList([step, acc], ...loc(form));
  }, init);
});

defmacro('as->', (items, form) => {
  // (as-> x $ (f $ 1) (g 2 $)) → (let* [$ x $ (f $ 1) $ (g 2 $)] $)
  const init = nth(items, 1);
  const nameSym = nth(items, 2);
  const steps = items.slice(3);
  const bindings: Form[] = [nameSym, init];
  for (const step of steps) {
    bindings.push(nameSym, step);
  }
  return makeList([sym('let*'), makeVector(bindings), nameSym], ...loc(form));
});

defmacro('doto', (items, form) => {
  // (doto x (.f a) (.g b)) → (let* [doto__auto x] (.f doto__auto a) (.g doto__auto b) doto__auto)
  const init = nth(items, 1);
  const calls = items.slice(2);
  const autoSym = sym('doto__auto');
  const expanded = calls.map((call) => {
    if (call.data.type === 'list') {
      const fn = nth(call.data.items, 0);
      const args = call.data.items.slice(1);
      return makeList([fn, autoSym, ...args]);
    }
    return makeList([call, autoSym]);
  });
  return makeList([sym('let*'), makeVector([autoSym, init]), ...expanded, autoSym], ...loc(form));
});

defmacro('some->', (items, form) => {
  // (some-> x (f a)) → (let* [some__auto x some__auto (if (nil? some__auto) nil (f some__auto a))] some__auto)
  const init = nth(items, 1);
  const steps = items.slice(2);
  const autoSym = sym('some__auto');
  const bindings: Form[] = [autoSym, init];
  for (const step of steps) {
    let call: Form;
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      call = makeList([fn, autoSym, ...args]);
    } else {
      call = makeList([step, autoSym]);
    }
    bindings.push(autoSym, makeList([sym('if'), makeList([sym('nil?'), autoSym]), makeNil(), call]));
  }
  return makeList([sym('let*'), makeVector(bindings), autoSym], ...loc(form));
});

defmacro('some->>', (items, form) => {
  // (some->> x (f a)) → like some-> but thread as last arg
  const init = nth(items, 1);
  const steps = items.slice(2);
  const autoSym = sym('some__auto');
  const bindings: Form[] = [autoSym, init];
  for (const step of steps) {
    let call: Form;
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      call = makeList([fn, ...args, autoSym]);
    } else {
      call = makeList([step, autoSym]);
    }
    bindings.push(autoSym, makeList([sym('if'), makeList([sym('nil?'), autoSym]), makeNil(), call]));
  }
  return makeList([sym('let*'), makeVector(bindings), autoSym], ...loc(form));
});

// -- Definition --

defmacro('defn', (items, form) => expandDefn(items, form));
defmacro('defn-', (items, form) => expandDefn(items, form));

function expandDefn(items: Form[], form: Form): Form {
  // (defn name docstring? attr-map? [params] body...)
  // → (def name (fn* name [params] body...))
  let idx = 1;
  const name = nth(items, idx++);
  // Skip docstring
  if (idx < items.length && items[idx]!.data.type === 'string') idx++;
  // Skip attr-map
  if (idx < items.length && items[idx]!.data.type === 'map') idx++;
  const fnBody = items.slice(idx);
  const fnForm = makeList([sym('fn*'), name, ...fnBody]);
  return makeList([sym('def'), name, fnForm], ...loc(form));
}

defmacro('defonce', (items, form) => {
  // (defonce name init) → (def name init)
  const name = nth(items, 1);
  const init = nth(items, 2);
  return makeList([sym('def'), name, init], ...loc(form));
});

defmacro('fn', (items, form) => {
  // (fn name? [params] body...) → (fn* name? [params] body...)
  const args = items.slice(1);
  return makeList([sym('fn*'), ...args], ...loc(form));
});

// -- Binding --

defmacro('let', (items, form) => {
  // (let [bindings] body...) → (let* [bindings] body...)
  const bindings = nth(items, 1);
  const body = items.slice(2);
  return makeList([sym('let*'), bindings, ...body], ...loc(form));
});

defmacro('loop', (items, form) => {
  // (loop [bindings] body...) → (loop* [bindings] body...)
  const bindings = nth(items, 1);
  const body = items.slice(2);
  return makeList([sym('loop*'), bindings, ...body], ...loc(form));
});

defmacro('letfn', (items, form) => {
  // (letfn [(f [params] body) ...] body...)
  // → (letfn* [f (fn* f [params] body) ...] body...)
  const fnForms = nth(items, 1);
  if (fnForms.data.type !== 'vector') throw new Error('letfn requires a vector');
  const bindings: Form[] = [];
  for (const fnForm of fnForms.data.items) {
    if (fnForm.data.type !== 'list') throw new Error('letfn entries must be lists');
    const fnItems = fnForm.data.items;
    const name = nth(fnItems, 0);
    const fnBody = fnItems.slice(1);
    bindings.push(name, makeList([sym('fn*'), name, ...fnBody], ...loc(fnForm)));
  }
  const body = items.slice(2);
  return makeList([sym('letfn*'), makeVector(bindings), ...body], ...loc(form));
});

// -- Other --

defmacro('condp', (items, form) => {
  // (condp pred expr test1 result1 test2 result2 ... default?)
  // → nested (let* [condp__auto (pred test expr)] (if condp__auto result ...))
  const pred = nth(items, 1);
  const expr = nth(items, 2);
  const rest = items.slice(3);
  return buildCondpChain(pred, expr, rest, form);
});

function buildCondpChain(pred: Form, expr: Form, rest: Form[], form: Form): Form {
  if (rest.length === 0) {
    return makeList([sym('throw'), makeList([sym('new'), sym('Error'), makeList([sym('str'), { data: { type: 'string', value: 'No matching clause: ' }, line: 0, col: 0 } as Form, expr])])], ...loc(form));
  }
  if (rest.length === 1) return nth(rest, 0); // default
  const test = nth(rest, 0);
  const result = nth(rest, 1);
  const remaining = rest.slice(2);
  const autoSym = sym('condp__auto');
  return makeList([
    sym('let*'),
    makeVector([autoSym, makeList([pred, test, expr])]),
    makeList([sym('if'), autoSym, result, buildCondpChain(pred, expr, remaining, form)]),
  ], ...loc(form));
}

defmacro('cond->', (items, form) => {
  // (cond-> expr test1 form1 test2 form2 ...)
  // → (let* [a expr a (if test1 (-> a form1) a) a (if test2 (-> a form2) a)] a)
  const expr = nth(items, 1);
  const pairs = items.slice(2);
  const autoSym = sym('cond__auto');
  const bindings: Form[] = [autoSym, expr];
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const test = nth(pairs, i);
    const step = nth(pairs, i + 1);
    let threaded: Form;
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      threaded = makeList([fn, autoSym, ...args]);
    } else {
      threaded = makeList([step, autoSym]);
    }
    bindings.push(autoSym, makeList([sym('if'), test, threaded, autoSym]));
  }
  return makeList([sym('let*'), makeVector(bindings), autoSym], ...loc(form));
});

defmacro('cond->>', (items, form) => {
  // (cond->> expr test1 form1 test2 form2 ...)
  // → like cond-> but thread-last
  const expr = nth(items, 1);
  const pairs = items.slice(2);
  const autoSym = sym('cond__auto');
  const bindings: Form[] = [autoSym, expr];
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const test = nth(pairs, i);
    const step = nth(pairs, i + 1);
    let threaded: Form;
    if (step.data.type === 'list') {
      const fn = nth(step.data.items, 0);
      const args = step.data.items.slice(1);
      threaded = makeList([fn, ...args, autoSym]);
    } else {
      threaded = makeList([step, autoSym]);
    }
    bindings.push(autoSym, makeList([sym('if'), test, threaded, autoSym]));
  }
  return makeList([sym('let*'), makeVector(bindings), autoSym], ...loc(form));
});

defmacro('case', (items, form) => {
  // (case expr test1 result1 test2 result2 ... default?)
  // → (let* [case__auto expr] (case* case__auto t1 r1 t2 r2 ... default?))
  // Grouped tests: (case x (1 2) :r) → flattened to (case* x 1 :r 2 :r)
  const expr = nth(items, 1);
  const rest = items.slice(2);
  const autoSym = sym('case__auto');
  const flat: Form[] = [];
  let i = 0;
  while (i + 1 < rest.length) {
    const test = nth(rest, i);
    const then = nth(rest, i + 1);
    if (test.data.type === 'list') {
      for (const t of test.data.items) {
        flat.push(t, then);
      }
    } else {
      flat.push(test, then);
    }
    i += 2;
  }
  // Odd remainder is default
  if (rest.length % 2 === 1) {
    flat.push(nth(rest, rest.length - 1));
  }
  return makeList([
    sym('let*'),
    makeVector([autoSym, expr]),
    makeList([sym('case*'), autoSym, ...flat]),
  ], ...loc(form));
});

defmacro('..', (items, form) => {
  // (.. x (m1 a) (m2 b)) → (. (. x m1 a) m2 b)
  const target = nth(items, 1);
  const calls = items.slice(2);
  return calls.reduce<Form>((acc, call) => {
    if (call.data.type === 'list') {
      return makeList([sym('.'), acc, ...call.data.items], ...loc(form));
    }
    return makeList([sym('.'), acc, call], ...loc(form));
  }, target);
});

defmacro('declare', (items, form) => {
  // (declare x y) → (do (def x) (def y))
  const names = items.slice(1);
  return makeList([sym('do'), ...names.map((n) => makeList([sym('def'), n]))], ...loc(form));
});

defmacro('assert', (items, form) => {
  // (assert test msg?) → (if test nil (throw (new Error msg)))
  const test = nth(items, 1);
  const msg = items.length > 2 ? nth(items, 2) : makeStr('Assert failed');
  return makeList([
    sym('if'), test, makeNil(),
    makeList([sym('throw'), makeList([sym('new'), sym('Error'), msg])]),
  ], ...loc(form));
});

defmacro('time', (items, form) => {
  // (time expr) → (let* [time__auto (js* "performance.now()") ret__auto expr time_end__auto (js* "performance.now()")] (.log console (str "Elapsed time: " ...)) ret__auto)
  // Simplified: just wrap and return
  const expr = nth(items, 1);
  const timeSym = sym('time__auto');
  const retSym = sym('ret__auto');
  return makeList([
    sym('let*'),
    makeVector([
      timeSym, makeList([sym('js*'), makeStr('performance.now()')]),
      retSym, expr,
    ]),
    makeList([sym('do'),
      makeList([sym('.'), sym('console'), sym('log'),
        makeStr('Elapsed time:'),
        makeList([sym('-'), makeList([sym('js*'), makeStr('performance.now()')]), timeSym]),
        makeStr('ms')]),
      retSym]),
  ], ...loc(form));
});

defmacro('dotimes', (items, form) => {
  // (dotimes [i n] body...) → (let* [dt__limit n] (loop* [dt__i 0] (if (js* "dt__i < dt__limit") (let* [i dt__i] (do body... (recur (js* "dt__i + 1")))) nil)))
  const bindings = nth(items, 1);
  if (bindings.data.type !== 'vector') throw new Error('dotimes requires a vector');
  const name = nth(bindings.data.items, 0);
  const count = nth(bindings.data.items, 1);
  const body = items.slice(2);
  const limitSym = sym('dt__limit');
  const iSym = sym('dt__i');
  return makeList([
    sym('let*'),
    makeVector([limitSym, count]),
    makeList([
      sym('loop*'),
      makeVector([iSym, { data: { type: 'integer', value: 0 }, line: 0, col: 0 } as Form]),
      makeList([
        sym('if'),
        makeList([sym('js*'), makeStr('dt__i < dt__limit')]),
        makeList([
          sym('let*'),
          makeVector([name, iSym]),
          makeList([sym('do'), ...body,
            makeList([sym('recur'), makeList([sym('js*'), makeStr('dt__i + 1')])])]),
        ]),
        makeNil(),
      ]),
    ]),
  ], ...loc(form));
});

defmacro('defprotocol', (items, form) => {
  // (defprotocol IFoo (foo [this]) (bar [this x]))
  // → (do (def IFoo (defprotocol "IFoo" ["foo" "bar"]))
  //       (def foo (protocolFn IFoo "foo"))
  //       (def bar (protocolFn IFoo "bar")))
  const nameSym = nth(items, 1);
  // Guard: only expand protocol definitions (name is symbol).
  // Runtime calls like (defprotocol "IFoo" [...]) pass through as function calls.
  if (nameSym.data.type !== 'symbol') return form;
  const protoName = nameSym.data.name;
  const methodSigs = items.slice(2);
  const methodNames: string[] = [];
  for (const sig of methodSigs) {
    if (sig.data.type !== 'list' || sig.data.items.length === 0) continue;
    const mName = sig.data.items[0]!;
    if (mName.data.type !== 'symbol') throw new Error('method name must be a symbol');
    methodNames.push(mName.data.name);
  }
  const nameStrs = methodNames.map((n) => makeStr(n));
  const defs: Form[] = [
    makeList([sym('def'), nameSym,
      makeList([sym('defprotocol'), makeStr(protoName), makeVector(nameStrs)])]),
  ];
  for (const mName of methodNames) {
    defs.push(makeList([sym('def'), sym(mName),
      makeList([sym('protocolFn'), nameSym, makeStr(mName)])]));
  }
  return makeList([sym('do'), ...defs], ...loc(form));
});

defmacro('extend-type', (items, form) => {
  // (extend-type Target Proto (method [this] body) ...) → (extend-type* Target Proto (method [this] body) ...)
  return makeList([sym('extend-type*'), ...items.slice(1)], ...loc(form));
});

defmacro('deftype', (items, form) => {
  // (deftype Name [fields...] Proto (method [this args] body) ...)
  // → (deftype* Name [fields...] Proto (method [this args] body) ...)
  return makeList([sym('deftype*'), ...items.slice(1)], ...loc(form));
});

defmacro('lazy-seq', (items, form) => {
  // (lazy-seq body) → (new LazySeq (fn* [] body))
  const body = items.slice(1);
  const bodyForm = body.length === 1 ? nth(body, 0) : makeList([sym('do'), ...body]);
  return makeList([sym('new'), sym('LazySeq'), makeList([sym('fn*'), makeVector([]), bodyForm])], ...loc(form));
});

defmacro('comment', (_items, form) => {
  return makeNil(...loc(form));
});

// -- su Framework Macros --

defmacro('defc', (items, form) => {
  // (defc my-counter "doc" {:props {...}} [{:keys [a b]}] body...)
  // (defc my-counter [{:keys [a b]}] body...)
  // → (su.core/define-component "my-counter" {:observed-attrs [...] :prop-types {...}} (fn* [props-atom] ...))

  let idx = 1;
  const nameForm = nth(items, idx); idx++;
  if (nameForm.data.type !== 'symbol') {
    throw new Error('defc: name must be a symbol');
  }
  const name = nameForm.data.name;
  if (!name.includes('-')) {
    throw new Error(`defc: Custom Element names require a hyphen: "${name}"`);
  }

  // Skip optional docstring
  if (idx < items.length && items[idx]!.data.type === 'string') {
    idx++;
  }

  // Optional options map {:props {...}}
  let propsMap: Map<string, string> | null = null;
  if (idx < items.length && items[idx]!.data.type === 'map') {
    const optsForm = items[idx]!;
    propsMap = extractPropsFromOpts(optsForm);
    idx++;
  }

  // Params vector
  const paramsForm = nth(items, idx); idx++;
  if (paramsForm.data.type !== 'vector') {
    throw new Error('defc: params must be a vector');
  }

  // Body
  const body = items.slice(idx);

  // If no explicit props, infer from destructuring
  let observedAttrs: string[];
  let propTypes: Map<string, string>;
  if (propsMap) {
    observedAttrs = [...propsMap.keys()];
    propTypes = propsMap;
  } else {
    observedAttrs = inferAttrsFromParams(paramsForm);
    propTypes = new Map(observedAttrs.map(a => [a, 'string']));
  }

  // Build config map: {:observed-attrs ["a" "b"] :prop-types {:a "string" :b "number"}}
  const configItems: Form[] = [];
  configItems.push(makeKeyword(null, 'observed-attrs'));
  configItems.push(makeVector(observedAttrs.map(a => makeStr(a))));
  configItems.push(makeKeyword(null, 'prop-types'));
  const ptItems: Form[] = [];
  for (const [k, v] of propTypes) {
    ptItems.push(makeKeyword(null, k));
    ptItems.push(makeStr(v));
  }
  configItems.push(makeMap(ptItems));

  // Build render fn: (fn* [props-atom] (let* [{:keys [...]} @props-atom] body...))
  const propsAtomSym = sym('props-atom__auto');
  const derefForm = makeList([sym('deref'), propsAtomSym]);
  const letBody = body.length === 1 ? body[0]! : makeList([sym('do'), ...body]);
  const renderBody = makeList([
    sym('let*'),
    makeVector([paramsForm.data.items[0]!, derefForm]),
    letBody,
  ]);
  const renderFn = makeList([sym('fn*'), makeVector([propsAtomSym]), renderBody]);

  return makeList([
    makeSymbol('su.core', 'define-component', ...loc(form)),
    makeStr(name),
    makeMap(configItems),
    renderFn,
  ], ...loc(form));
});

function extractPropsFromOpts(optsForm: Form): Map<string, string> {
  if (optsForm.data.type !== 'map') return new Map();
  const items = optsForm.data.items;
  // Find :props key
  for (let i = 0; i < items.length - 1; i += 2) {
    const key = items[i]!;
    if (key.data.type === 'keyword' && key.data.name === 'props' && key.data.ns === null) {
      const val = items[i + 1]!;
      return extractPropTypes(val);
    }
  }
  return new Map();
}

function extractPropTypes(propsVal: Form): Map<string, string> {
  if (propsVal.data.type !== 'map') return new Map();
  const result = new Map<string, string>();
  const items = propsVal.data.items;
  for (let i = 0; i < items.length - 1; i += 2) {
    const key = items[i]!;
    const val = items[i + 1]!;
    if (key.data.type === 'keyword') {
      let type = 'string';
      if (val.data.type === 'map') {
        const valItems = val.data.items;
        for (let j = 0; j < valItems.length - 1; j += 2) {
          const vk = valItems[j]!;
          const vv = valItems[j + 1]!;
          if (vk.data.type === 'keyword' && vk.data.name === 'type' && vv.data.type === 'keyword') {
            type = vv.data.name;
          }
        }
      }
      result.set(key.data.name, type);
    }
  }
  return result;
}

function inferAttrsFromParams(paramsForm: Form): string[] {
  if (paramsForm.data.type !== 'vector') return [];
  const items = paramsForm.data.items;
  // Look for {:keys [a b c]} destructuring map
  if (items.length >= 1 && items[0]!.data.type === 'map') {
    return extractKeysFromDestructure(items[0]!);
  }
  return [];
}

function extractKeysFromDestructure(mapForm: Form): string[] {
  if (mapForm.data.type !== 'map') return [];
  const items = mapForm.data.items;
  for (let i = 0; i < items.length - 1; i += 2) {
    const key = items[i]!;
    const val = items[i + 1]!;
    if (key.data.type === 'keyword' && key.data.name === 'keys' && val.data.type === 'vector') {
      return val.data.items
        .filter(f => f.data.type === 'symbol')
        .map(f => (f.data as { type: 'symbol'; name: string }).name);
    }
  }
  return [];
}

// -- defstyle macro --

defmacro('defstyle', (items, form) => {
  // (defstyle name [...css-data...])
  // → (su.core/create-stylesheet "name" "css-text")
  const nameForm = nth(items, 1);
  if (nameForm.data.type !== 'symbol') {
    throw new Error('defstyle: name must be a symbol');
  }

  const cssData = nth(items, 2);
  if (cssData.data.type !== 'vector') {
    throw new Error('defstyle: CSS data must be a vector');
  }

  const cssText = compileCssData(cssData);

  return makeList([
    makeSymbol('su.core', 'create-stylesheet', ...loc(form)),
    makeStr(nameForm.data.name),
    makeStr(cssText),
  ], ...loc(form));
});

function compileCssData(vec: Form): string {
  if (vec.data.type !== 'vector') return '';
  const items = vec.data.items;
  const rules: string[] = [];
  compileCssRules(items, '', rules);
  return rules.join(' ');
}

function compileCssRules(items: Form[], parentSelector: string, rules: string[]): void {
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;

    if (item.data.type === 'keyword') {
      // This is a selector — grab its properties and children
      const selector = resolveSelector(item.data.name, parentSelector);

      // Check what follows: a map (properties) and/or nested vectors (children)
      const props: Form[] = [];
      const children: Form[] = [];
      i++;

      if (i < items.length && items[i]!.data.type === 'map') {
        props.push(items[i]!);
        i++;
      }

      while (i < items.length && items[i]!.data.type === 'vector') {
        children.push(items[i]!);
        i++;
      }

      // Emit property rule
      if (props.length > 0) {
        const cssProps = compileCssProps(props[0]!);
        if (cssProps) {
          rules.push(`${selector} { ${cssProps} }`);
        }
      }

      // Recurse into nested children
      for (const child of children) {
        if (child.data.type === 'vector') {
          compileCssRules(child.data.items, selector, rules);
        }
      }
    } else if (item.data.type === 'vector') {
      // Nested vector — recurse
      compileCssRules(item.data.items, parentSelector, rules);
      i++;
    } else if (item.data.type === 'map') {
      // Properties for parent selector
      if (parentSelector) {
        const cssProps = compileCssProps(item);
        if (cssProps) {
          rules.push(`${parentSelector} { ${cssProps} }`);
        }
      }
      i++;
    } else {
      i++;
    }
  }
}

function resolveSelector(name: string, parent: string): string {
  // Keywords like :.foo → .foo, :&:hover → &:hover, :host → :host
  let sel = name;

  // Handle & (ampersand) — append to parent without space
  if (sel.startsWith('&') && parent) {
    return parent + sel.slice(1);
  }

  // Handle :host and other colon-prefixed CSS selectors
  if (sel === 'host' || sel.startsWith('host(')) {
    sel = ':' + sel;
  }

  if (parent) {
    return parent + ' ' + sel;
  }
  return sel;
}

function compileCssProps(mapForm: Form): string {
  if (mapForm.data.type !== 'map') return '';
  const items = mapForm.data.items;
  const props: string[] = [];
  for (let i = 0; i < items.length - 1; i += 2) {
    const key = items[i]!;
    const val = items[i + 1]!;
    if (key.data.type === 'keyword') {
      const prop = key.data.name; // Already kebab-case from keyword
      let value = '';
      if (val.data.type === 'string') {
        value = (val.data as { value: string }).value;
      } else if (val.data.type === 'integer' || val.data.type === 'float') {
        value = String((val.data as { value: number }).value);
      }
      props.push(`${prop}: ${value};`);
    }
  }
  return props.join(' ');
}
