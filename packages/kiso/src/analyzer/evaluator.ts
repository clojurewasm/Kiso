// Mini Evaluator — Interprets Form directly for defmacro support.
//
// Design: Form-based tree-walk interpreter with immutable environments.
// Only implements special forms needed for macro expansion.

import type { Form } from '../reader/form.js';
import { makeNil, makeBool, makeList, makeVector, makeMap, makeSet, makeSymbol, makeKeyword, makeInt, makeStr, prStr as formPrStr } from '../reader/form.js';

// -- Environment --

export type Env = {
  bindings: Map<string, Form>;
  parent: Env | null;
};

export function makeEnv(parent: Env | null = null): Env {
  return { bindings: new Map(), parent };
}

function envGet(env: Env, name: string): Form | undefined {
  const val = env.bindings.get(name);
  if (val !== undefined) return val;
  if (env.parent) return envGet(env.parent, name);
  return undefined;
}

function envSet(env: Env, name: string, val: Form): void {
  env.bindings.set(name, val);
}

// -- Recur sentinel --

class RecurSignal {
  constructor(readonly args: Form[]) {}
}

// -- Closure --

type Closure = {
  type: 'closure';
  params: string[];
  restParam: string | null;
  body: Form[];
  env: Env;
  name: string | null;
};

const CLOSURE_TAG = Symbol.for('kiso.eval.closure');

function makeClosure(params: string[], restParam: string | null, body: Form[], env: Env, name: string | null): Form {
  const closure: Closure = { type: 'closure', params, restParam, body, env, name };
  return { data: { type: 'tagged', tag: '__closure', form: makeNil() } as any, line: 0, col: 0, [CLOSURE_TAG]: closure } as any;
}

function getClosure(form: Form): Closure | null {
  return (form as any)[CLOSURE_TAG] ?? null;
}

// -- Built-in function --

type BuiltinFn = (...args: Form[]) => Form;
const BUILTIN_TAG = Symbol.for('kiso.eval.builtin');

function makeBuiltin(fn: BuiltinFn): Form {
  return { data: { type: 'tagged', tag: '__builtin', form: makeNil() } as any, line: 0, col: 0, [BUILTIN_TAG]: fn } as any;
}

function getBuiltin(form: Form): BuiltinFn | null {
  return (form as any)[BUILTIN_TAG] ?? null;
}

// -- Evaluator --

export class MacroEvaluator {
  private globals: Env;

  constructor() {
    this.globals = makeEnv();
    this.initBuiltins();
  }

  evaluate(form: Form, env: Env): Form {
    const d = form.data;
    switch (d.type) {
      case 'nil': case 'boolean': case 'integer': case 'float':
      case 'bigint': case 'string': case 'char': case 'keyword':
      case 'regex': case 'ratio':
        return form;

      case 'symbol':
        return this.resolveSymbol(d.name, d.ns, env);

      case 'list':
        return this.evaluateList(d.items, env);

      case 'vector':
        return makeVector(d.items.map((f) => this.evaluate(f, env)));

      case 'map': {
        const evaluated = d.items.map((f) => this.evaluate(f, env));
        return makeMap(evaluated);
      }

      case 'set': {
        const evaluated = d.items.map((f) => this.evaluate(f, env));
        return makeSet(evaluated);
      }

      default:
        throw new Error(`Cannot evaluate: ${d.type}`);
    }
  }

  private resolveSymbol(name: string, ns: string | null, env: Env): Form {
    const fullName = ns ? `${ns}/${name}` : name;
    const local = envGet(env, fullName);
    if (local !== undefined) return local;
    const global = envGet(this.globals, fullName);
    if (global !== undefined) return global;
    throw new Error(`Unable to resolve symbol: ${fullName}`);
  }

  private evaluateList(items: Form[], env: Env): Form {
    if (items.length === 0) return makeList([]);

    const head = items[0]!;
    if (head.data.type === 'symbol' && !head.data.ns) {
      const special = this.getSpecialForm(head.data.name);
      if (special) return special(items, env);
    }

    // Function application
    const fn = this.evaluate(head, env);
    const args = items.slice(1).map((f) => this.evaluate(f, env));
    return this.applyFn(fn, args);
  }

  applyFn(fn: Form, args: Form[]): Form {
    const builtin = getBuiltin(fn);
    if (builtin) return builtin(...args);

    const closure = getClosure(fn);
    if (closure) return this.applyClosure(closure, args);

    throw new Error(`Cannot invoke: ${fn.data.type}`);
  }

  private applyClosure(closure: Closure, args: Form[]): Form {
    const fnEnv = makeEnv(closure.env);

    // Bind params
    for (let i = 0; i < closure.params.length; i++) {
      envSet(fnEnv, closure.params[i]!, args[i] ?? makeNil());
    }

    // Bind rest param
    if (closure.restParam) {
      const restArgs = args.slice(closure.params.length);
      envSet(fnEnv, closure.restParam, makeList(restArgs));
    }

    return this.evaluateBody(closure.body, fnEnv);
  }

  private evaluateBody(body: Form[], env: Env): Form {
    let result: Form = makeNil();
    for (const form of body) {
      result = this.evaluate(form, env);
    }
    return result;
  }

  private getSpecialForm(name: string): ((items: Form[], env: Env) => Form) | null {
    switch (name) {
      case 'quote': return (items) => items[1] ?? makeNil();
      case 'do': return (items, env) => this.evalDo(items, env);
      case 'if': return (items, env) => this.evalIf(items, env);
      case 'def': return (items, env) => this.evalDef(items, env);
      case 'let*': return (items, env) => this.evalLet(items, env);
      case 'fn*': return (items, env) => this.evalFn(items, env);
      case 'loop*': return (items, env) => this.evalLoop(items, env);
      case 'recur': return (items, env) => this.evalRecur(items, env);
      default: return null;
    }
  }

  private evalDo(items: Form[], env: Env): Form {
    let result: Form = makeNil();
    for (let i = 1; i < items.length; i++) {
      result = this.evaluate(items[i]!, env);
    }
    return result;
  }

  private evalIf(items: Form[], env: Env): Form {
    const test = this.evaluate(items[1]!, env);
    if (isTruthy(test)) {
      return this.evaluate(items[2]!, env);
    }
    return items[3] ? this.evaluate(items[3], env) : makeNil();
  }

  private evalDef(items: Form[], env: Env): Form {
    const sym = items[1]!;
    if (sym.data.type !== 'symbol') throw new Error('def requires a symbol');
    const val = items[2] ? this.evaluate(items[2], env) : makeNil();
    envSet(this.globals, sym.data.name, val);
    return val;
  }

  private evalLet(items: Form[], env: Env): Form {
    const bindings = items[1]!;
    if (bindings.data.type !== 'vector') throw new Error('let* requires a vector');
    const pairs = bindings.data.items;
    const letEnv = makeEnv(env);
    for (let i = 0; i < pairs.length; i += 2) {
      const sym = pairs[i]!;
      if (sym.data.type !== 'symbol') throw new Error('let* binding must be a symbol');
      const val = this.evaluate(pairs[i + 1]!, letEnv);
      envSet(letEnv, sym.data.name, val);
    }
    return this.evaluateBody(items.slice(2), letEnv);
  }

  private evalFn(items: Form[], env: Env): Form {
    let nameStr: string | null = null;
    let paramIdx = 1;

    // Optional name
    if (items[1]?.data.type === 'symbol') {
      nameStr = items[1].data.name;
      paramIdx = 2;
    }

    const paramsForm = items[paramIdx]!;
    if (paramsForm.data.type !== 'vector') throw new Error('fn* requires a parameter vector');

    const { params, restParam } = parseParams(paramsForm.data.items);
    const body = items.slice(paramIdx + 1);

    const closure = makeClosure(params, restParam, body, env, nameStr);

    // If named, bind in the closure's env for recursion
    if (nameStr) {
      const closureObj = getClosure(closure)!;
      const selfEnv = makeEnv(env);
      envSet(selfEnv, nameStr, closure);
      closureObj.env = selfEnv;
    }

    return closure;
  }

  private evalLoop(items: Form[], env: Env): Form {
    const bindings = items[1]!;
    if (bindings.data.type !== 'vector') throw new Error('loop* requires a vector');
    const pairs = bindings.data.items;
    const paramNames: string[] = [];
    let loopEnv = makeEnv(env);

    for (let i = 0; i < pairs.length; i += 2) {
      const sym = pairs[i]!;
      if (sym.data.type !== 'symbol') throw new Error('loop* binding must be a symbol');
      paramNames.push(sym.data.name);
      const val = this.evaluate(pairs[i + 1]!, loopEnv);
      envSet(loopEnv, sym.data.name, val);
    }

    const body = items.slice(2);

    // Loop
    for (;;) {
      try {
        return this.evaluateBody(body, loopEnv);
      } catch (e) {
        if (e instanceof RecurSignal) {
          loopEnv = makeEnv(env);
          for (let i = 0; i < paramNames.length; i++) {
            envSet(loopEnv, paramNames[i]!, e.args[i] ?? makeNil());
          }
          continue;
        }
        throw e;
      }
    }
  }

  private evalRecur(items: Form[], env: Env): Form {
    const args = items.slice(1).map((f) => this.evaluate(f, env));
    throw new RecurSignal(args);
  }

  // -- Built-in functions --

  private initBuiltins(): void {
    const g = this.globals;
    const set = (name: string, fn: BuiltinFn) => envSet(g, name, makeBuiltin(fn));

    // Arithmetic
    set('+', (...args) => makeInt(args.reduce((a, f) => a + toNum(f), 0)));
    set('-', (...args) => {
      if (args.length === 1) return makeInt(-toNum(args[0]!));
      return makeInt(args.slice(1).reduce((a, f) => a - toNum(f), toNum(args[0]!)));
    });
    set('*', (...args) => makeInt(args.reduce((a, f) => a * toNum(f), 1)));
    set('/', (...args) => makeInt(args.slice(1).reduce((a, f) => a / toNum(f), toNum(args[0]!))));

    // Comparison
    set('=', (a, b) => makeBool(formEqual(a!, b!)));
    set('not=', (a, b) => makeBool(!formEqual(a!, b!)));
    set('<', (a, b) => makeBool(toNum(a!) < toNum(b!)));
    set('>', (a, b) => makeBool(toNum(a!) > toNum(b!)));
    set('<=', (a, b) => makeBool(toNum(a!) <= toNum(b!)));
    set('>=', (a, b) => makeBool(toNum(a!) >= toNum(b!)));

    // Logic
    set('not', (a) => makeBool(!isTruthy(a!)));
    set('identity', (a) => a!);

    // Type predicates
    set('nil?', (a) => makeBool(a!.data.type === 'nil'));
    set('true?', (a) => makeBool(a!.data.type === 'boolean' && a!.data.value === true));
    set('false?', (a) => makeBool(a!.data.type === 'boolean' && a!.data.value === false));
    set('symbol?', (a) => makeBool(a!.data.type === 'symbol'));
    set('keyword?', (a) => makeBool(a!.data.type === 'keyword'));
    set('string?', (a) => makeBool(a!.data.type === 'string'));
    set('number?', (a) => makeBool(a!.data.type === 'integer' || a!.data.type === 'float'));
    set('list?', (a) => makeBool(a!.data.type === 'list'));
    set('vector?', (a) => makeBool(a!.data.type === 'vector'));
    set('map?', (a) => makeBool(a!.data.type === 'map'));
    set('set?', (a) => makeBool(a!.data.type === 'set'));
    set('seq?', (a) => makeBool(a!.data.type === 'list'));

    // Collection operations
    set('list', (...args) => makeList(args));
    set('vector', (...args) => makeVector(args));
    set('count', (a) => {
      const d = a!.data;
      if (d.type === 'nil') return makeInt(0);
      if (d.type === 'list' || d.type === 'vector' || d.type === 'set') return makeInt(d.items.length);
      if (d.type === 'map') return makeInt(d.items.length / 2);
      if (d.type === 'string') return makeInt(d.value.length);
      return makeInt(0);
    });
    set('empty?', (a) => {
      const d = a!.data;
      if (d.type === 'nil') return makeBool(true);
      if (d.type === 'list' || d.type === 'vector' || d.type === 'set') return makeBool(d.items.length === 0);
      if (d.type === 'map') return makeBool(d.items.length === 0);
      return makeBool(false);
    });

    set('first', (a) => {
      const items = toSeq(a!);
      return items.length > 0 ? items[0]! : makeNil();
    });
    set('rest', (a) => {
      const items = toSeq(a!);
      return makeList(items.slice(1));
    });
    set('next', (a) => {
      const items = toSeq(a!);
      return items.length > 1 ? makeList(items.slice(1)) : makeNil();
    });
    set('seq', (a) => {
      const items = toSeq(a!);
      return items.length > 0 ? makeList(items) : makeNil();
    });
    set('cons', (a, b) => makeList([a!, ...toSeq(b!)]));
    set('conj', (coll, ...items) => {
      const d = coll!.data;
      if (d.type === 'vector') return makeVector([...d.items, ...items]);
      if (d.type === 'list') return makeList([...items.reverse(), ...d.items]);
      if (d.type === 'set') return makeSet([...d.items, ...items]);
      return makeList([...items.reverse(), ...toSeq(coll!)]);
    });
    set('concat', (...colls) => makeList(colls.flatMap((c) => toSeq(c))));
    set('list*', (...args) => {
      if (args.length === 0) return makeNil();
      const last = args[args.length - 1]!;
      const init = args.slice(0, -1);
      return makeList([...init, ...toSeq(last)]);
    });
    set('vec', (a) => makeVector(toSeq(a!)));
    set('nth', (coll, idx) => {
      const items = toSeq(coll!);
      const i = toNum(idx!);
      if (i < 0 || i >= items.length) throw new Error(`Index out of bounds: ${i}`);
      return items[i]!;
    });
    set('get', (coll, key, notFound) => {
      const d = coll!.data;
      if (d.type === 'map') {
        for (let i = 0; i < d.items.length; i += 2) {
          if (formEqual(d.items[i]!, key!)) return d.items[i + 1]!;
        }
      }
      if (d.type === 'set') {
        for (const item of d.items) {
          if (formEqual(item, key!)) return key!;
        }
      }
      return notFound ?? makeNil();
    });
    set('assoc', (m, ...kvs) => {
      if (m!.data.type !== 'map') throw new Error('assoc requires a map');
      const items = [...m!.data.items];
      for (let i = 0; i < kvs.length; i += 2) {
        let found = false;
        for (let j = 0; j < items.length; j += 2) {
          if (formEqual(items[j]!, kvs[i]!)) {
            items[j + 1] = kvs[i + 1]!;
            found = true;
            break;
          }
        }
        if (!found) {
          items.push(kvs[i]!, kvs[i + 1]!);
        }
      }
      return makeMap(items);
    });
    set('dissoc', (m, ...keys) => {
      if (m!.data.type !== 'map') throw new Error('dissoc requires a map');
      const items: Form[] = [];
      for (let i = 0; i < m!.data.items.length; i += 2) {
        const k = m!.data.items[i]!;
        if (!keys.some((dk) => formEqual(k, dk))) {
          items.push(k, m!.data.items[i + 1]!);
        }
      }
      return makeMap(items);
    });
    set('contains?', (coll, key) => {
      const d = coll!.data;
      if (d.type === 'map') {
        for (let i = 0; i < d.items.length; i += 2) {
          if (formEqual(d.items[i]!, key!)) return makeBool(true);
        }
        return makeBool(false);
      }
      if (d.type === 'set') {
        return makeBool(d.items.some((item) => formEqual(item, key!)));
      }
      return makeBool(false);
    });
    set('hash-map', (...args) => makeMap(args));
    set('hash-set', (...args) => makeSet(args));

    // Symbol/keyword operations
    set('symbol', (...args) => {
      if (args.length === 1) {
        const a = args[0]!;
        if (a.data.type === 'string') return makeSymbol(null, a.data.value);
        if (a.data.type === 'symbol') return a;
        throw new Error('symbol requires a string');
      }
      return makeSymbol(args[0]!.data.type === 'string' ? args[0]!.data.value : null, (args[1]!.data as any).value);
    });
    set('keyword', (...args) => {
      if (args.length === 1) {
        const a = args[0]!;
        if (a.data.type === 'string') return makeKeyword(null, a.data.value);
        if (a.data.type === 'keyword') return a;
        throw new Error('keyword requires a string');
      }
      return makeKeyword(args[0]!.data.type === 'string' ? args[0]!.data.value : null, (args[1]!.data as any).value);
    });
    set('name', (a) => {
      const d = a!.data;
      if (d.type === 'keyword') return makeStr(d.name);
      if (d.type === 'symbol') return makeStr(d.name);
      if (d.type === 'string') return a!;
      throw new Error('name requires a keyword or symbol');
    });
    set('namespace', (a) => {
      const d = a!.data;
      if (d.type === 'keyword') return d.ns ? makeStr(d.ns) : makeNil();
      if (d.type === 'symbol') return d.ns ? makeStr(d.ns) : makeNil();
      throw new Error('namespace requires a keyword or symbol');
    });

    // Gensym
    let gensymCounter = 0;
    set('gensym', (...args) => {
      const prefix = args.length > 0 && args[0]!.data.type === 'string' ? args[0]!.data.value : 'G__';
      return makeSymbol(null, `${prefix}${gensymCounter++}`);
    });

    // String
    set('str', (...args) => makeStr(args.map(formToStr).join('')));
    set('subs', (s, start, end) => {
      if (s!.data.type !== 'string') throw new Error('subs requires a string');
      const startIdx = toNum(start!);
      const endIdx = end ? toNum(end) : undefined;
      return makeStr(s!.data.value.substring(startIdx, endIdx));
    });
    set('pr-str', (...args) => {
      return makeStr(args.map((a) => formPrStr(a)).join(' '));
    });

    // Apply
    set('apply', (fn, ...args) => {
      const lastArg = args[args.length - 1]!;
      const initArgs = args.slice(0, -1);
      const spreadArgs = toSeq(lastArg);
      return this.applyFn(fn!, [...initArgs, ...spreadArgs]);
    });

    // Meta (stubs — Forms don't support meta yet)
    set('meta', () => makeNil());
    set('with-meta', (obj) => obj!);
    set('vary-meta', (obj) => obj!);
  }
}

// -- Param parsing --

function parseParams(items: Form[]): { params: string[]; restParam: string | null } {
  const params: string[] = [];
  let restParam: string | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.data.type !== 'symbol') throw new Error('fn* param must be a symbol');
    if (item.data.name === '&') {
      const nextItem = items[i + 1];
      if (!nextItem || nextItem.data.type !== 'symbol') throw new Error('& must be followed by a symbol');
      restParam = nextItem.data.name;
      break;
    }
    params.push(item.data.name);
  }
  return { params, restParam };
}

// -- Helpers --

function isTruthy(form: Form): boolean {
  if (form.data.type === 'nil') return false;
  if (form.data.type === 'boolean') return form.data.value;
  return true;
}

function toNum(form: Form): number {
  if (form.data.type === 'integer') return form.data.value;
  if (form.data.type === 'float') return form.data.value;
  throw new Error(`Expected number, got ${form.data.type}`);
}

function toSeq(form: Form): Form[] {
  const d = form.data;
  if (d.type === 'nil') return [];
  if (d.type === 'list' || d.type === 'vector' || d.type === 'set') return d.items;
  throw new Error(`Cannot seq: ${d.type}`);
}

function formToStr(form: Form): string {
  const d = form.data;
  switch (d.type) {
    case 'nil': return '';
    case 'string': return d.value;
    case 'keyword': return d.ns ? `:${d.ns}/${d.name}` : `:${d.name}`;
    case 'symbol': return d.ns ? `${d.ns}/${d.name}` : d.name;
    case 'integer': case 'float': return String(d.value);
    case 'boolean': return String(d.value);
    default:
      return formPrStr(form);
  }
}

function formEqual(a: Form, b: Form): boolean {
  const ad = a.data;
  const bd = b.data;
  if (ad.type !== bd.type) return false;
  switch (ad.type) {
    case 'nil': return true;
    case 'boolean': return ad.value === (bd as any).value;
    case 'integer': case 'float': return ad.value === (bd as any).value;
    case 'string': return ad.value === (bd as any).value;
    case 'keyword': return ad.name === (bd as any).name && ad.ns === (bd as any).ns;
    case 'symbol': return ad.name === (bd as any).name && ad.ns === (bd as any).ns;
    case 'list': case 'vector': {
      const bi = (bd as any).items;
      if (ad.items.length !== bi.length) return false;
      return ad.items.every((item, i) => formEqual(item, bi[i]));
    }
    default: return false;
  }
}
