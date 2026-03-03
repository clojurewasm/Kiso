// Emitter — Generates ES6 JavaScript from Node AST.
//
// Key design decisions (from CW knowledge):
// - Clojure truthiness: (x != null && x !== false)
// - recur → while(true) + continue
// - Multi-arity fn → switch(args.length)
// - Name munging for special characters

import type { Node, FnArity, LetBinding } from '../analyzer/node.js';

export function emit(node: Node): string {
  switch (node.type) {
    case 'literal': return emitLiteral(node);
    case 'keyword': return emitKeyword(node);
    case 'var-ref': return munge(node.name);
    case 'vector': return `[${node.items.map(emit).join(', ')}]`;
    case 'map': return emitMap(node);
    case 'set': return `new Set([${node.items.map(emit).join(', ')}])`;
    case 'invoke': return emitInvoke(node);
    case 'if': return emitIf(node);
    case 'do': return emitDo(node);
    case 'let': return emitLet(node);
    case 'fn': return emitFn(node);
    case 'def': return emitDef(node);
    case 'recur': return emitRecur(node);
    case 'loop': return emitLoop(node);
    case 'throw': return `(() => { throw ${emit(node.expr)}; })()`;
    case 'try': return 'null /* TODO: try */';
    case 'new': return `new ${emit(node.ctor)}(${node.args.map(emit).join(', ')})`;
    case 'interop-call': return `${emit(node.target)}.${node.method}(${node.args.map(emit).join(', ')})`;
    case 'interop-field': return `${emit(node.target)}.${node.field}`;
    case 'set!': return `(${emit(node.target)} = ${emit(node.value)})`;
    case 'js-raw': return node.code;
    case 'ns': return emitNs(node);
  }
}

/** Emit a complete module from a list of top-level nodes. */
export function emitModule(nodes: Node[]): string {
  return nodes.map(emitTopLevel).join('\n');
}

function emitTopLevel(node: Node): string {
  if (node.type === 'def') {
    const init = node.init ? emit(node.init) : 'null';
    return `export const ${munge(node.name)} = ${init};`;
  }
  if (node.type === 'ns') {
    return emitNs(node);
  }
  return `${emit(node)};`;
}

// -- Emitters --

function emitLiteral(node: { value: unknown; jsType: string }): string {
  if (node.value === null) return 'null';
  if (typeof node.value === 'string') return JSON.stringify(node.value);
  if (typeof node.value === 'bigint') return `${node.value}n`;
  return String(node.value);
}

function emitKeyword(node: { ns: string | null; name: string }): string {
  const full = node.ns ? `${node.ns}/${node.name}` : node.name;
  return JSON.stringify(`:${full}`);
}

function emitMap(node: { keys: Node[]; vals: Node[] }): string {
  const entries = node.keys.map((k, i) => `[${emit(k)}, ${emit(node.vals[i]!)}]`);
  return `new Map([${entries.join(', ')}])`;
}

function emitInvoke(node: { fn: Node; args: Node[] }): string {
  return `${emit(node.fn)}(${node.args.map(emit).join(', ')})`;
}

function emitIf(node: { test: Node; then: Node; else: Node }): string {
  // Clojure truthiness: only nil and false are falsy
  const test = emit(node.test);
  const then = emit(node.then);
  const els = emit(node.else);
  return `((${test} != null && ${test} !== false) ? ${then} : ${els})`;
}

function emitDo(node: { statements: Node[]; ret: Node }): string {
  if (node.statements.length === 0) return emit(node.ret);
  const stmts = node.statements.map(emit).join(', ');
  return `(${stmts}, ${emit(node.ret)})`;
}

function emitLet(node: { bindings: LetBinding[]; body: Node }): string {
  // (let [x 1 y 2] body) → (() => { const x = 1; const y = 2; return body; })()
  const bindings = node.bindings.map(
    (b) => `const ${munge(b.name)} = ${emit(b.init)};`,
  ).join(' ');
  return `(() => { ${bindings} return ${emit(node.body)}; })()`;
}

function emitFn(node: { name: string | null; arities: FnArity[] }): string {
  const name = node.name ? munge(node.name) : '';

  if (node.arities.length === 1) {
    const arity = node.arities[0]!;
    return emitSingleArity(name, arity);
  }

  // Multi-arity: switch on arguments.length
  const cases = node.arities.map((arity) => {
    const n = arity.params.length;
    const params = arity.params.map(munge).join(', ');
    const body = emit(arity.body);
    if (arity.restParam) {
      return `default: { const [${params}${params ? ', ' : ''}...${munge(arity.restParam)}] = args; return ${body}; }`;
    }
    return `case ${n}: { const [${params}] = args; return ${body}; }`;
  }).join(' ');

  return `function ${name}(...args) { switch(args.length) { ${cases} } }`;
}

function emitSingleArity(name: string, arity: FnArity): string {
  const params = arity.params.map(munge);
  if (arity.restParam) {
    params.push(`...${munge(arity.restParam)}`);
  }
  const body = emit(arity.body);
  return `function ${name}(${params.join(', ')}) { return ${body}; }`;
}

function emitDef(node: { name: string; init: Node | null }): string {
  const init = node.init ? emit(node.init) : 'null';
  return `const ${munge(node.name)} = ${init}`;
}

function emitLoop(node: { bindings: LetBinding[]; body: Node }): string {
  const decls = node.bindings.map(
    (b) => `let ${munge(b.name)} = ${emit(b.init)};`,
  ).join(' ');
  const body = emit(node.body);
  return `(() => { ${decls} while (true) { return ${body}; } })()`;
}

function emitRecur(node: { args: Node[] }): string {
  // recur is handled within loop/fn context via while(true) + continue
  // For now, emit a placeholder that loop's emitter wraps
  const assigns = node.args.map((a) => emit(a));
  return `/* recur */ (${assigns.join(', ')})`;
}

function emitNs(node: { name: string; requires: { ns: string; alias: string | null; refers: string[] }[] }): string {
  // Minimal: just emit a comment for now
  return `/* ns: ${node.name} */`;
}

// -- Name Munging --

export function munge(name: string): string {
  return name
    .replace(/-/g, '_')
    .replace(/\?/g, '_QMARK_')
    .replace(/!/g, '_BANG_')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_EQ_')
    .replace(/'/g, '_SINGLEQUOTE_')
    .replace(/&/g, '_AMPERSAND_');
}
