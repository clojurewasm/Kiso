// Analyzer — Converts macro-expanded Form to Node AST.
//
// Handles special form dispatch, scope tracking, and interop rewriting.

import { type Form } from '../reader/form.js';
import { expandAll } from './macros.js';
import { expandBinding } from './destructure.js';
import type {
  Node, LetBinding, FnArity, LiteralNode, DefNode,
} from './node.js';

type Scope = {
  locals: Set<string>;
  parent: Scope | null;
};

function makeScope(parent: Scope | null, locals: string[] = []): Scope {
  return { locals: new Set(locals), parent };
}

function isLocal(scope: Scope, name: string): boolean {
  if (scope.locals.has(name)) return true;
  return scope.parent !== null && isLocal(scope.parent, name);
}

export class Analyzer {
  analyze(form: Form): Node {
    const expanded = expandAll(form);
    return this.analyzeForm(expanded, makeScope(null));
  }

  analyzeAll(forms: Form[]): Node[] {
    const scope = makeScope(null);
    return forms.map((f) => {
      const expanded = expandAll(f);
      const node = this.analyzeForm(expanded, scope);
      // def adds to top-level scope
      if (node.type === 'def' && node.name) {
        scope.locals.add(node.name);
      }
      return node;
    });
  }

  private analyzeForm(form: Form, scope: Scope): Node {
    switch (form.data.type) {
      case 'nil': return lit(null, 'null');
      case 'boolean': return lit(form.data.value, 'boolean');
      case 'integer': return lit(form.data.value, 'number');
      case 'bigint': return lit(form.data.value, 'bigint');
      case 'float': return lit(form.data.value, 'number');
      case 'string': return lit(form.data.value, 'string');
      case 'char': return lit(form.data.value, 'string');
      case 'keyword': return { type: 'keyword', ns: form.data.ns, name: form.data.name };
      case 'symbol': return this.analyzeSymbol(form, scope);
      case 'vector': return { type: 'vector', items: form.data.items.map((f) => this.analyzeForm(f, scope)) };
      case 'map': return this.analyzeMapLiteral(form, scope);
      case 'set': return { type: 'set', items: form.data.items.map((f) => this.analyzeForm(f, scope)) };
      case 'list': return this.analyzeList(form, scope);
      case 'regex': return lit(form.data.pattern, 'string'); // simplified: regex as string
      case 'ratio': return lit(parseInt(form.data.numerator) / parseInt(form.data.denominator), 'number');
      case 'tagged': return this.analyzeForm(form.data.form, scope); // simplified: unwrap tagged
    }
  }

  private analyzeSymbol(form: Form, scope: Scope): Node {
    if (form.data.type !== 'symbol') throw new Error('Expected symbol');
    const name = form.data.ns ? `${form.data.ns}/${form.data.name}` : form.data.name;
    return { type: 'var-ref', name, local: isLocal(scope, name) };
  }

  private analyzeMapLiteral(form: Form, scope: Scope): Node {
    if (form.data.type !== 'map') throw new Error('Expected map');
    const items = form.data.items;
    const keys: Node[] = [];
    const vals: Node[] = [];
    for (let i = 0; i < items.length; i += 2) {
      keys.push(this.analyzeForm(items[i]!, scope));
      vals.push(this.analyzeForm(items[i + 1]!, scope));
    }
    return { type: 'map', keys, vals };
  }

  private analyzeList(form: Form, scope: Scope): Node {
    if (form.data.type !== 'list') throw new Error('Expected list');
    const items = form.data.items;
    if (items.length === 0) return lit(null, 'null'); // empty list → null (simplified)

    const head = items[0]!;

    // Special form dispatch (check locals first per CW)
    if (head.data.type === 'symbol' && head.data.ns === null && !isLocal(scope, head.data.name)) {
      const handler = SPECIAL_FORMS.get(head.data.name);
      if (handler) return handler.call(this, items, scope);
    }

    // Interop rewrite
    if (head.data.type === 'symbol' && head.data.ns === null) {
      const name = head.data.name;
      // (.method target args...) → interop-call
      if (name.startsWith('.') && !name.startsWith('..') && name.length > 1) {
        const method = name.slice(1);
        const target = this.analyzeForm(items[1]!, scope);
        const args = items.slice(2).map((f) => this.analyzeForm(f, scope));
        return { type: 'interop-call', target, method, args };
      }
      // (Ctor. args...) → new
      if (name.endsWith('.') && name.length > 1) {
        const ctorName = name.slice(0, -1);
        const args = items.slice(1).map((f) => this.analyzeForm(f, scope));
        return { type: 'new', ctor: { type: 'var-ref', name: ctorName, local: false }, args };
      }
    }

    // Regular invocation
    const fn = this.analyzeForm(head, scope);
    const args = items.slice(1).map((f) => this.analyzeForm(f, scope));
    return { type: 'invoke', fn, args };
  }

  // -- Special Forms --

  private analyzeDef(items: Form[], scope: Scope): DefNode {
    const nameSym = items[1]!;
    if (nameSym.data.type !== 'symbol') throw new Error('def requires a symbol');
    const name = nameSym.data.name;
    const init = items.length > 2 ? this.analyzeForm(items[2]!, scope) : null;
    scope.locals.add(name);
    return { type: 'def', name, init };
  }

  private analyzeIf(items: Form[], scope: Scope): Node {
    const test = this.analyzeForm(items[1]!, scope);
    const then = this.analyzeForm(items[2]!, scope);
    const els = items.length > 3 ? this.analyzeForm(items[3]!, scope) : lit(null, 'null');
    return { type: 'if', test, then, else: els };
  }

  private analyzeDo(items: Form[], scope: Scope): Node {
    const body = items.slice(1).map((f) => this.analyzeForm(f, scope));
    if (body.length === 0) return lit(null, 'null');
    if (body.length === 1) return body[0]!;
    const ret = body.pop()!;
    return { type: 'do', statements: body, ret };
  }

  private analyzeLet(items: Form[], scope: Scope): Node {
    const bindingsForm = items[1]!;
    if (bindingsForm.data.type !== 'vector') throw new Error('let* requires a vector');
    const bindItems = bindingsForm.data.items;
    const bindings: LetBinding[] = [];
    const letScope = makeScope(scope);

    for (let i = 0; i < bindItems.length; i += 2) {
      const pattern = bindItems[i]!;
      const init = this.analyzeForm(bindItems[i + 1]!, letScope);
      const expanded = expandBinding(pattern, init, (f, s) => this.analyzeForm(f, s as Scope), letScope);
      for (const b of expanded) {
        bindings.push(b);
        letScope.locals.add(b.name);
      }
    }

    const body = items.slice(2).map((f) => this.analyzeForm(f, letScope));
    const bodyNode: Node = body.length === 1 ? body[0]! : { type: 'do', statements: body.slice(0, -1), ret: body[body.length - 1]! };
    return { type: 'let', bindings, body: bodyNode };
  }

  private analyzeFn(items: Form[], scope: Scope): Node {
    let idx = 1;
    let name: string | null = null;

    // Optional name
    const maybeNameData = items[idx]?.data;
    if (maybeNameData?.type === 'symbol') {
      name = maybeNameData.name;
      idx++;
    }

    const rest = items.slice(idx);
    const arities: FnArity[] = [];

    // Single arity: (fn* [params] body...) or multi-arity: (fn* ([p1] b1) ([p2] b2))
    if (rest.length > 0 && rest[0]!.data.type === 'vector') {
      // Single arity
      arities.push(this.parseFnArity(rest, scope, name));
    } else {
      // Multi-arity
      for (const arityForm of rest) {
        if (arityForm.data.type !== 'list') throw new Error('fn* multi-arity requires lists');
        arities.push(this.parseFnArity(arityForm.data.items, scope, name));
      }
    }

    return { type: 'fn', name, arities };
  }

  private parseFnArity(items: Form[], parentScope: Scope, fnName: string | null): FnArity {
    const paramsForm = items[0]!;
    if (paramsForm.data.type !== 'vector') throw new Error('fn* requires params vector');
    const paramItems = paramsForm.data.items;
    const params: string[] = [];
    let restParam: string | null = null;
    // Track destructured params: index → { syntheticName, pattern }
    const destructured: { idx: number; synthetic: string; pattern: Form }[] = [];

    for (let i = 0; i < paramItems.length; i++) {
      const p = paramItems[i]!;
      if (p.data.type === 'symbol' && p.data.name === '&') {
        const rest = paramItems[i + 1]!;
        if (rest.data.type === 'symbol') {
          restParam = rest.data.name;
        } else {
          const syntheticName = `__rest__`;
          restParam = syntheticName;
          destructured.push({ idx: i + 1, synthetic: syntheticName, pattern: rest });
        }
        break;
      }
      if (p.data.type === 'symbol') {
        params.push(p.data.name);
      } else {
        const syntheticName = `__p${i}__`;
        params.push(syntheticName);
        destructured.push({ idx: i, synthetic: syntheticName, pattern: p });
      }
    }

    const fnScope = makeScope(parentScope, [...params, ...(restParam ? [restParam] : []), ...(fnName ? [fnName] : [])]);

    // Expand destructured params into let bindings
    const letBindings: LetBinding[] = [];
    for (const d of destructured) {
      const synthRef: Node = { type: 'var-ref', name: d.synthetic, local: true };
      const expanded = expandBinding(d.pattern, synthRef, (f, s) => this.analyzeForm(f, s as Scope), fnScope);
      for (const b of expanded) {
        letBindings.push(b);
        fnScope.locals.add(b.name);
      }
    }

    const body = items.slice(1).map((f) => this.analyzeForm(f, fnScope));
    let bodyNode: Node = body.length === 1 ? body[0]! : { type: 'do', statements: body.slice(0, -1), ret: body[body.length - 1]! };

    // Wrap body with destructure let bindings if needed
    if (letBindings.length > 0) {
      bodyNode = { type: 'let', bindings: letBindings, body: bodyNode };
    }

    return { params, restParam, body: bodyNode };
  }

  private analyzeLoop(items: Form[], scope: Scope): Node {
    const bindingsForm = items[1]!;
    if (bindingsForm.data.type !== 'vector') throw new Error('loop* requires a vector');
    const bindItems = bindingsForm.data.items;
    const bindings: LetBinding[] = [];
    const loopScope = makeScope(scope);

    for (let i = 0; i < bindItems.length; i += 2) {
      const pattern = bindItems[i]!;
      if (pattern.data.type !== 'symbol') throw new Error('loop* binding must be a symbol');
      const init = this.analyzeForm(bindItems[i + 1]!, loopScope);
      bindings.push({ name: pattern.data.name, init });
      loopScope.locals.add(pattern.data.name);
    }

    const body = items.slice(2).map((f) => this.analyzeForm(f, loopScope));
    const bodyNode: Node = body.length === 1 ? body[0]! : { type: 'do', statements: body.slice(0, -1), ret: body[body.length - 1]! };
    return { type: 'loop', bindings, body: bodyNode };
  }

  private analyzeRecur(items: Form[], scope: Scope): Node {
    const args = items.slice(1).map((f) => this.analyzeForm(f, scope));
    return { type: 'recur', args };
  }

  private analyzeQuote(items: Form[], _scope: Scope): Node {
    return this.quoteForm(items[1]!);
  }

  private quoteForm(form: Form): Node {
    switch (form.data.type) {
      case 'nil': return lit(null, 'null');
      case 'boolean': return lit(form.data.value, 'boolean');
      case 'integer': return lit(form.data.value, 'number');
      case 'float': return lit(form.data.value, 'number');
      case 'string': return lit(form.data.value, 'string');
      case 'symbol': return {
        type: 'invoke',
        fn: { type: 'var-ref', name: 'symbol', local: false },
        args: [
          form.data.ns ? lit(form.data.ns, 'string') : lit(null, 'null'),
          lit(form.data.name, 'string'),
        ],
      };
      case 'keyword': return { type: 'keyword', ns: form.data.ns, name: form.data.name };
      case 'list': return {
        type: 'invoke',
        fn: { type: 'var-ref', name: 'list', local: false },
        args: form.data.items.map((f) => this.quoteForm(f)),
      };
      case 'vector': return { type: 'vector', items: form.data.items.map((f) => this.quoteForm(f)) };
      default: return lit(null, 'null');
    }
  }

  private analyzeThrow(items: Form[], scope: Scope): Node {
    return { type: 'throw', expr: this.analyzeForm(items[1]!, scope) };
  }

  private analyzeNs(items: Form[], _scope: Scope): Node {
    const nameForm = items[1]!;
    if (nameForm.data.type !== 'symbol') throw new Error('ns requires a symbol name');
    const nsName = nameForm.data.ns ? `${nameForm.data.ns}.${nameForm.data.name}` : nameForm.data.name;
    const requires: { ns: string; alias: string | null; refers: string[] }[] = [];

    for (let i = 2; i < items.length; i++) {
      const clause = items[i]!;
      if (clause.data.type !== 'list' || clause.data.items.length === 0) continue;
      const head = clause.data.items[0]!;
      if (head.data.type !== 'keyword' || head.data.name !== 'require') continue;

      // Parse each require spec: [ns.name :as alias :refer [names]]
      for (let j = 1; j < clause.data.items.length; j++) {
        const spec = clause.data.items[j]!;
        if (spec.data.type !== 'vector') continue;
        const specItems = spec.data.items;
        if (specItems.length === 0) continue;

        const nsSym = specItems[0]!;
        if (nsSym.data.type !== 'symbol') continue;
        const reqNs = nsSym.data.ns ? `${nsSym.data.ns}.${nsSym.data.name}` : nsSym.data.name;
        let alias: string | null = null;
        const refers: string[] = [];

        for (let k = 1; k < specItems.length; k++) {
          const kw = specItems[k]!;
          if (kw.data.type !== 'keyword') continue;
          if (kw.data.name === 'as' && k + 1 < specItems.length) {
            const aliasSym = specItems[k + 1]!;
            if (aliasSym.data.type === 'symbol') alias = aliasSym.data.name;
            k++;
          } else if (kw.data.name === 'refer' && k + 1 < specItems.length) {
            const referVec = specItems[k + 1]!;
            if (referVec.data.type === 'vector') {
              for (const r of referVec.data.items) {
                if (r.data.type === 'symbol') refers.push(r.data.name);
              }
            }
            k++;
          }
        }
        requires.push({ ns: reqNs, alias, refers });
      }
    }

    return { type: 'ns', name: nsName, requires };
  }

  private analyzeJsStar(items: Form[], _scope: Scope): Node {
    const code = items[1]!;
    if (code.data.type !== 'string') throw new Error('js* requires a string');
    return { type: 'js-raw', code: code.data.value };
  }

  private analyzeSetBang(items: Form[], scope: Scope): Node {
    return { type: 'set!', target: this.analyzeForm(items[1]!, scope), value: this.analyzeForm(items[2]!, scope) };
  }

  private analyzeNew(items: Form[], scope: Scope): Node {
    const ctor = this.analyzeForm(items[1]!, scope);
    const args = items.slice(2).map((f) => this.analyzeForm(f, scope));
    return { type: 'new', ctor, args };
  }

  private analyzeTry(items: Form[], scope: Scope): Node {
    // (try body... (catch ExType e handler)... (finally expr))
    const body: Form[] = [];
    const catches: { exType: string; binding: string; body: Node }[] = [];
    let finallyNode: Node | null = null;

    for (let i = 1; i < items.length; i++) {
      const item = items[i]!;
      if (item.data.type === 'list' && item.data.items.length > 0) {
        const head = item.data.items[0]!;
        if (head.data.type === 'symbol' && head.data.name === 'catch') {
          const exType = item.data.items[1]!;
          const binding = item.data.items[2]!;
          if (binding.data.type !== 'symbol') throw new Error('catch binding must be a symbol');
          const catchScope = makeScope(scope, [binding.data.name]);
          const catchBody = item.data.items.slice(3).map((f) => this.analyzeForm(f, catchScope));
          const catchBodyNode: Node = catchBody.length === 1 ? catchBody[0]! : { type: 'do', statements: catchBody.slice(0, -1), ret: catchBody[catchBody.length - 1]! };
          catches.push({
            exType: exType.data.type === 'symbol' ? exType.data.name : 'Error',
            binding: binding.data.name,
            body: catchBodyNode,
          });
          continue;
        }
        if (head.data.type === 'symbol' && head.data.name === 'finally') {
          const finallyForms = item.data.items.slice(1).map((f) => this.analyzeForm(f, scope));
          finallyNode = finallyForms.length === 1 ? finallyForms[0]! : { type: 'do', statements: finallyForms.slice(0, -1), ret: finallyForms[finallyForms.length - 1]! };
          continue;
        }
      }
      body.push(item);
    }

    const bodyNodes = body.map((f) => this.analyzeForm(f, scope));
    const bodyNode: Node = bodyNodes.length === 1 ? bodyNodes[0]! : { type: 'do', statements: bodyNodes.slice(0, -1), ret: bodyNodes[bodyNodes.length - 1]! };
    return { type: 'try', body: bodyNode, catches, finally: finallyNode };
  }
}

const SPECIAL_FORMS = new Map<string, (this: Analyzer, items: Form[], scope: Scope) => Node>([
  ['def', Analyzer.prototype['analyzeDef']],
  ['if', Analyzer.prototype['analyzeIf']],
  ['do', Analyzer.prototype['analyzeDo']],
  ['let*', Analyzer.prototype['analyzeLet']],
  ['fn*', Analyzer.prototype['analyzeFn']],
  ['loop*', Analyzer.prototype['analyzeLoop']],
  ['recur', Analyzer.prototype['analyzeRecur']],
  ['quote', Analyzer.prototype['analyzeQuote']],
  ['throw', Analyzer.prototype['analyzeThrow']],
  ['ns', Analyzer.prototype['analyzeNs']],
  ['js*', Analyzer.prototype['analyzeJsStar']],
  ['set!', Analyzer.prototype['analyzeSetBang']],
  ['new', Analyzer.prototype['analyzeNew']],
  ['try', Analyzer.prototype['analyzeTry']],
]);

function lit(value: LiteralNode['value'], jsType: LiteralNode['jsType']): LiteralNode {
  return { type: 'literal', value, jsType };
}
