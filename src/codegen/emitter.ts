// Emitter — Generates ES6 JavaScript from Node AST.
//
// Key design decisions (from CW knowledge):
// - Clojure truthiness: (x != null && x !== false)
// - recur → while(true) + temp vars + continue
// - Multi-arity fn → switch(args.length)
// - Name munging for special characters

import type { Node, FnArity, LetBinding, CatchClause } from '../analyzer/node.js';

type EmitCtx = {
  loopBindings: string[] | null; // current loop/fn binding names for recur
};

const DEFAULT_CTX: EmitCtx = { loopBindings: null };

function emitNode(node: Node, ctx: EmitCtx): string {
  switch (node.type) {
    case 'literal': return emitLiteral(node);
    case 'keyword': return emitKeyword(node);
    case 'var-ref': return munge(node.name);
    case 'vector': return `[${node.items.map((n) => emitNode(n, ctx)).join(', ')}]`;
    case 'map': return emitMap(node, ctx);
    case 'set': return `new Set([${node.items.map((n) => emitNode(n, ctx)).join(', ')}])`;
    case 'invoke': return emitInvoke(node, ctx);
    case 'if': return emitIf(node, ctx);
    case 'do': return emitDo(node, ctx);
    case 'let': return emitLet(node, ctx);
    case 'fn': return emitFn(node);
    case 'def': return emitDef(node, ctx);
    case 'recur': return emitRecur(node, ctx);
    case 'loop': return emitLoop(node, ctx);
    case 'throw': return `(() => { throw ${emitNode(node.expr, ctx)}; })()`;
    case 'try': return emitTry(node, ctx);
    case 'new': return `new ${emitNode(node.ctor, ctx)}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'interop-call': return `${emitNode(node.target, ctx)}.${node.method}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'interop-field': return `${emitNode(node.target, ctx)}.${node.field}`;
    case 'set!': return `(${emitNode(node.target, ctx)} = ${emitNode(node.value, ctx)})`;
    case 'js-raw': return node.code;
    case 'ns': return emitNs(node);
  }
}

// Public API — delegates to emitNode with default context
export function emit(node: Node): string {
  return emitNode(node, DEFAULT_CTX);
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

function emitMap(node: { keys: Node[]; vals: Node[] }, ctx: EmitCtx): string {
  const entries = node.keys.map((k, i) => `[${emitNode(k, ctx)}, ${emitNode(node.vals[i]!, ctx)}]`);
  return `new Map([${entries.join(', ')}])`;
}

function emitInvoke(node: { fn: Node; args: Node[] }, ctx: EmitCtx): string {
  return `${emitNode(node.fn, ctx)}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
}

function emitIf(node: { test: Node; then: Node; else: Node }, ctx: EmitCtx): string {
  // Clojure truthiness: only nil and false are falsy
  const test = emitNode(node.test, ctx);
  const then = emitNode(node.then, ctx);
  const els = emitNode(node.else, ctx);
  return `((${test} != null && ${test} !== false) ? ${then} : ${els})`;
}

function emitDo(node: { statements: Node[]; ret: Node }, ctx: EmitCtx): string {
  if (node.statements.length === 0) return emitNode(node.ret, ctx);
  const stmts = node.statements.map((n) => emitNode(n, ctx)).join(', ');
  return `(${stmts}, ${emitNode(node.ret, ctx)})`;
}

function emitLet(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  const bindings = node.bindings.map(
    (b) => `const ${munge(b.name)} = ${emitNode(b.init, ctx)};`,
  ).join(' ');
  return `(() => { ${bindings} return ${emitNode(node.body, ctx)}; })()`;
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
    const ctx: EmitCtx = { loopBindings: arity.params };
    const body = emitNode(arity.body, ctx);
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
  const ctx: EmitCtx = { loopBindings: arity.params };
  const body = emitNode(arity.body, ctx);
  return `function ${name}(${params.join(', ')}) { return ${body}; }`;
}

function emitDef(node: { name: string; init: Node | null }, ctx: EmitCtx): string {
  const init = node.init ? emitNode(node.init, ctx) : 'null';
  return `const ${munge(node.name)} = ${init}`;
}

function emitLoop(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  // (loop [x 1 y 2] body) →
  // (() => { let x = 1; let y = 2; while (true) { const _r = body; return _r; } })()
  // where recur inside body emits: x_tmp = ...; y_tmp = ...; x = x_tmp; y = y_tmp; continue;
  const names = node.bindings.map((b) => b.name);
  const decls = node.bindings.map(
    (b) => `let ${munge(b.name)} = ${emitNode(b.init, ctx)};`,
  ).join(' ');
  const loopCtx: EmitCtx = { loopBindings: names };
  const body = emitStmt(node.body, loopCtx);
  return `(() => { ${decls} while (true) { ${body} } })()`;
}

/** Emit a node as a statement that may contain recur. */
function emitStmt(node: Node, ctx: EmitCtx): string {
  // For if nodes in statement position, emit as if/else blocks
  if (node.type === 'if') {
    const test = emitNode(node.test, ctx);
    const thenStmt = emitStmt(node.then, ctx);
    const elseStmt = emitStmt(node.else, ctx);
    return `if (${test} != null && ${test} !== false) { ${thenStmt} } else { ${elseStmt} }`;
  }
  if (node.type === 'recur') {
    return emitRecurStmt(node, ctx);
  }
  if (node.type === 'do') {
    const stmts = node.statements.map((n) => `${emitNode(n, ctx)};`).join(' ');
    const ret = emitStmt(node.ret, ctx);
    return `${stmts} ${ret}`;
  }
  if (node.type === 'let') {
    const bindings = node.bindings.map(
      (b) => `const ${munge(b.name)} = ${emitNode(b.init, ctx)};`,
    ).join(' ');
    return `${bindings} ${emitStmt(node.body, ctx)}`;
  }
  // Default: return the expression
  return `return ${emitNode(node, ctx)};`;
}

function emitRecur(node: { args: Node[] }, ctx: EmitCtx): string {
  // recur as expression — shouldn't normally happen in well-formed code
  // but fall through for safety
  const assigns = node.args.map((a) => emitNode(a, ctx));
  return `/* recur */ (${assigns.join(', ')})`;
}

function emitRecurStmt(node: { args: Node[] }, ctx: EmitCtx): string {
  const names = ctx.loopBindings;
  if (!names) return `/* recur without loop */ continue;`;

  const args = node.args.map((a) => emitNode(a, ctx));

  // Use temp variables for simultaneous assignment
  const temps = names.map((n, i) => `const ${munge(n)}__tmp = ${args[i]};`);
  const assigns = names.map((n) => `${munge(n)} = ${munge(n)}__tmp;`);
  return `${temps.join(' ')} ${assigns.join(' ')} continue;`;
}

function emitTry(
  node: { body: Node; catches: CatchClause[]; finally: Node | null },
  ctx: EmitCtx,
): string {
  const body = emitNode(node.body, ctx);
  let catchBlock = '';
  if (node.catches.length > 0) {
    // Use the first catch clause (simplified — no type discrimination)
    const c = node.catches[0]!;
    const catchBody = emitNode(c.body, ctx);
    catchBlock = ` catch (${munge(c.binding)}) { return ${catchBody}; }`;
  }
  let finallyBlock = '';
  if (node.finally) {
    finallyBlock = ` finally { ${emitNode(node.finally, ctx)}; }`;
  }
  return `(() => { try { return ${body}; }${catchBlock}${finallyBlock} })()`;
}

function emitNs(node: { name: string; requires: { ns: string; alias: string | null; refers: string[] }[] }): string {
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
