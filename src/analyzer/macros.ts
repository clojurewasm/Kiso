// Core Macros — Pure Form→Form transformations.
//
// ~40 core macros ported from CW's macro_transforms.zig.
// These do NOT use the evaluator: they are pure syntactic transforms.

import {
  type Form,
  makeNil,
  makeBool,
  makeSymbol,
  makeList,
  makeVector,
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

defmacro('comment', (_items, form) => {
  return makeNil(...loc(form));
});
