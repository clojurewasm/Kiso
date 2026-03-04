// Emitter — Generates ES6 JavaScript from Node AST.
//
// Key design decisions (from CW knowledge):
// - Clojure truthiness: (x != null && x !== false)
// - recur → while(true) + temp vars + continue
// - Multi-arity fn → switch(args.length)
// - Name munging for special characters

import type { Node, FnArity, LetBinding, CatchClause, CaseNode, DeftypeNode, DefrecordNode, ExtendTypeNode, ReifyNode } from '../analyzer/node.js';
import { isMacro } from '../analyzer/macros.js';

type EmitCtx = {
  loopBindings: string[] | null; // current loop/fn binding names for recur
  nsAliases?: Map<string, string>; // ns → alias (e.g. "su.core" → "su")
};

const DEFAULT_CTX: EmitCtx = { loopBindings: null, nsAliases: new Map() };

function emitNode(node: Node, ctx: EmitCtx): string {
  switch (node.type) {
    case 'literal': return emitLiteral(node);
    case 'keyword': return emitKeyword(node);
    case 'var-ref': {
      // js/Foo → Foo (JS global reference)
      if (node.name.startsWith('js/')) return node.name.slice(3);
      // Resolve ns-qualified names using aliases: su.core/foo → su.foo
      const slashIdx = node.name.indexOf('/');
      if (slashIdx > 0) {
        const ns = node.name.slice(0, slashIdx);
        const local = node.name.slice(slashIdx + 1);
        const alias = ctx.nsAliases?.get(ns);
        if (alias) return `${alias}.${munge(local)}`;
      }
      return munge(node.name);
    }
    case 'vector': return `vector(${node.items.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'map': return emitMap(node, ctx);
    case 'set': return `hashSet(${node.items.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'invoke': return emitInvoke(node, ctx);
    case 'if': return emitIf(node, ctx);
    case 'do': return emitDo(node, ctx);
    case 'let': return emitLet(node, ctx);
    case 'letfn': return emitLetfn(node, ctx);
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
    case 'case*': return emitCase(node, ctx);
    case 'deftype': return emitDeftype(node, ctx);
    case 'defrecord': return emitDefrecord(node, ctx);
    case 'extend-type': return emitExtendType(node, ctx);
    case 'reify': return emitReify(node, ctx);
    case 'ns': return emitNs(node);
  }
}

// Public API — delegates to emitNode with default context
export function emit(node: Node): string {
  return emitNode(node, DEFAULT_CTX);
}

/** Emit a complete module from a list of top-level nodes. */
export function emitModule(nodes: Node[]): string {
  // Extract ns aliases for resolving qualified names
  const nsAliases = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'ns') {
      for (const req of node.requires) {
        if (req.alias) nsAliases.set(req.ns, req.alias);
      }
    }
  }
  const ctx: EmitCtx = { loopBindings: null, nsAliases };

  const lines = nodes.map(n => emitTopLevelCtx(n, ctx));
  // Auto-import runtime functions used by collection literals
  const runtimeImports = collectRuntimeImports(nodes);
  if (runtimeImports.length > 0) {
    const importLine = `import { ${runtimeImports.join(', ')} } from '@clojurewasm/kiso/runtime';`;
    lines.unshift(importLine);
  }
  return lines.join('\n');
}

function emitTopLevelCtx(node: Node, ctx: EmitCtx): string {
  if (node.type === 'def') {
    const init = node.init ? emitNode(node.init, ctx) : 'null';
    return `export const ${munge(node.name)} = ${init};`;
  }
  if (node.type === 'deftype') {
    const code = emitDeftype(node, ctx);
    const factoryName = `__GT_${node.name}`;
    return `${code}\nexport { ${node.name}, ${factoryName} };`;
  }
  if (node.type === 'defrecord') {
    const code = emitDefrecord(node, ctx);
    const factoryName = `__GT_${node.name}`;
    const mapFactoryName = `map__GT_${node.name}`;
    return `${code}\nexport { ${node.name}, ${factoryName}, ${mapFactoryName} };`;
  }
  if (node.type === 'ns') {
    return emitNs(node);
  }
  return `${emitNode(node, ctx)};`;
}

// -- Emitters --

function emitLiteral(node: { value: unknown; jsType: string }): string {
  if (node.value === null) return 'null';
  if (typeof node.value === 'string') return JSON.stringify(node.value);
  if (typeof node.value === 'bigint') return `${node.value}n`;
  return String(node.value);
}

function emitKeyword(node: { ns: string | null; name: string }): string {
  if (node.ns) {
    return `keyword(${JSON.stringify(node.name)}, ${JSON.stringify(node.ns)})`;
  }
  return `keyword(${JSON.stringify(node.name)})`;
}

function emitMap(node: { keys: Node[]; vals: Node[] }, ctx: EmitCtx): string {
  const kvs: string[] = [];
  for (let i = 0; i < node.keys.length; i++) {
    kvs.push(emitNode(node.keys[i]!, ctx));
    kvs.push(emitNode(node.vals[i]!, ctx));
  }
  return `hashMap(${kvs.join(', ')})`;
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

function emitCase(node: CaseNode, ctx: EmitCtx): string {
  // case* test is already in a let binding, so safe to emit multiple times.
  // Generate chained ternaries: (t === c1 ? v1 : t === c2 ? v2 : default)
  const test = emitNode(node.test, ctx);
  const defaultVal = emitNode(node.default, ctx);
  if (node.clauses.length === 0) return defaultVal;
  let result = defaultVal;
  for (let i = node.clauses.length - 1; i >= 0; i--) {
    const c = node.clauses[i]!;
    const testVal = emitNode(c.test, ctx);
    const thenVal = emitNode(c.then, ctx);
    result = `(${test} === ${testVal} ? ${thenVal} : ${result})`;
  }
  return result;
}

function emitDo(node: { statements: Node[]; ret: Node }, ctx: EmitCtx): string {
  if (node.statements.length === 0) return emitNode(node.ret, ctx);
  const stmts = node.statements.map((n) => emitNode(n, ctx)).join(', ');
  return `(${stmts}, ${emitNode(node.ret, ctx)})`;
}

function emitLet(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  const seen = new Set<string>();
  const bindings = node.bindings.map((b) => {
    const name = munge(b.name);
    const init = emitNode(b.init, ctx);
    if (seen.has(name)) return `${name} = ${init};`;
    seen.add(name);
    return `let ${name} = ${init};`;
  }).join(' ');
  return `(() => { ${bindings} return ${emitNode(node.body, ctx)}; })()`;
}

function emitLetfn(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  // Declare all names first with let, then assign — enables mutual recursion
  const decls = node.bindings.map((b) => munge(b.name)).join(', ');
  const assigns = node.bindings.map(
    (b) => `${munge(b.name)} = ${emitNode(b.init, ctx)};`,
  ).join(' ');
  return `(() => { let ${decls}; ${assigns} return ${emitNode(node.body, ctx)}; })()`;
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

function emitDeftype(node: DeftypeNode, ctx: EmitCtx): string {
  const name = node.name;
  const fields = node.fields.map(munge);
  const ctorParams = fields.join(', ');
  const ctorBody = fields.map((f) => `this.${f} = ${f};`).join(' ');
  // Protocol methods → [Proto.methods.name]() { ... }
  const methods: string[] = [];
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge); // skip 'this' param
      const body = emitNode(m.body, ctx);
      methods.push(`[${protoVar}.methods.${m.name}](${mParams.join(', ')}) { return ${body}; }`);
    }
  }
  const methodStr = methods.length > 0 ? ' ' + methods.join(' ') : '';
  const factoryName = `__GT_${name}`;
  // Emit as class declaration + factory (used inside emitTopLevel for export)
  return `class ${name} { constructor(${ctorParams}) { ${ctorBody} }${methodStr} }\nfunction ${factoryName}(${ctorParams}) { return new ${name}(${ctorParams}); }`;
}

function emitDefrecord(node: DefrecordNode, ctx: EmitCtx): string {
  const name = node.name;
  const fields = node.fields.map(munge);
  const ctorParams = fields.join(', ');
  const ctorBody = fields.map((f) => `this.${f} = ${f};`).join(' ');
  // Add __kiso_type for type discrimination
  const typeAssign = `this.__kiso_type = "${name}";`;
  // Protocol methods
  const methods: string[] = [];
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge);
      const body = emitNode(m.body, ctx);
      methods.push(`[${protoVar}.methods.${m.name}](${mParams.join(', ')}) { return ${body}; }`);
    }
  }
  const methodStr = methods.length > 0 ? ' ' + methods.join(' ') : '';
  const factoryName = `__GT_${name}`;
  // map->Name factory: creates from a map (keyword lookup)
  const mapFactoryName = `map__GT_${name}`;
  const mapFactoryParams = fields.map((f) => `keyword("${f}")`);
  const mapFactoryBody = fields.map((_f, i) => `m.get(${mapFactoryParams[i]})`).join(', ');

  return [
    `class ${name} { constructor(${ctorParams}) { ${ctorBody} ${typeAssign}}${methodStr} }`,
    `function ${factoryName}(${ctorParams}) { return new ${name}(${ctorParams}); }`,
    `function ${mapFactoryName}(m) { return new ${name}(${mapFactoryBody}); }`,
  ].join('\n');
}

function emitReify(node: ReifyNode, ctx: EmitCtx): string {
  // ({ [Proto.methods.m]() { return ...; }, ... })
  const methods: string[] = [];
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge); // skip 'this'
      const body = emitNode(m.body, ctx);
      methods.push(`[${protoVar}.methods.${m.name}](${mParams.join(', ')}) { return ${body}; }`);
    }
  }
  return `({ ${methods.join(', ')} })`;
}

function emitExtendType(node: ExtendTypeNode, ctx: EmitCtx): string {
  const target = emitNode(node.target, ctx);
  const stmts: string[] = [];
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge); // skip 'this'
      const body = emitNode(m.body, ctx);
      stmts.push(`${target}.prototype[${protoVar}.methods.${m.name}] = function(${mParams.join(', ')}) { return ${body}; }`);
    }
  }
  return `(${stmts.join(', ')})`;
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
  if (node.type === 'letfn') {
    const decls = node.bindings.map((b) => munge(b.name)).join(', ');
    const assigns = node.bindings.map(
      (b) => `${munge(b.name)} = ${emitNode(b.init, ctx)};`,
    ).join(' ');
    return `let ${decls}; ${assigns} ${emitStmt(node.body, ctx)}`;
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
    if (node.catches.length === 1 && node.catches[0]!.exType === ':default') {
      // Single :default catch — no type check needed
      const c = node.catches[0]!;
      catchBlock = ` catch (${munge(c.binding)}) { return ${emitNode(c.body, ctx)}; }`;
    } else {
      // Multiple catches or typed catch — instanceof chain
      const catchVar = 'catch__auto';
      const branches = node.catches.map((c) => {
        const bindingName = munge(c.binding);
        const bodyExpr = emitNode(c.body, ctx);
        if (c.exType === ':default') {
          return `{ let ${bindingName} = ${catchVar}; return ${bodyExpr}; }`;
        }
        const typeName = c.exType.startsWith('js/') ? c.exType.slice(3) : munge(c.exType);
        return `if (${catchVar} instanceof ${typeName}) { let ${bindingName} = ${catchVar}; return ${bodyExpr}; }`;
      });
      // Join with else
      const chain = branches.join(' else ');
      catchBlock = ` catch (${catchVar}) { ${chain} throw ${catchVar}; }`;
    }
  }
  let finallyBlock = '';
  if (node.finally) {
    finallyBlock = ` finally { ${emitNode(node.finally, ctx)}; }`;
  }
  return `(() => { try { return ${body}; }${catchBlock}${finallyBlock} })()`;
}

function emitNs(node: { name: string; requires: { ns: string; alias: string | null; refers: string[] }[] }): string {
  const lines: string[] = [];
  for (const req of node.requires) {
    const path = nsToPath(node.name, req.ns);
    if (req.alias) {
      lines.push(`import * as ${munge(req.alias)} from '${path}';`);
    }
    const runtimeRefers = req.refers.filter(r => !isMacro(r));
    if (runtimeRefers.length > 0) {
      const names = runtimeRefers.map(munge).join(', ');
      lines.push(`import { ${names} } from '${path}';`);
    }
    if (!req.alias && runtimeRefers.length === 0) {
      lines.push(`import '${path}';`);
    }
  }
  return lines.join('\n');
}

/** Map a Clojure ns to a JS module path relative to the current ns. */
function nsToPath(currentNs: string, targetNs: string): string {
  const currentParts = currentNs.split('.');
  const targetParts = targetNs.split('.');

  // Check if same top-level package
  if (currentParts[0] === targetParts[0]) {
    // Relative path: strip common prefix, then navigate
    let common = 0;
    while (common < currentParts.length - 1 && common < targetParts.length - 1
      && currentParts[common] === targetParts[common]) {
      common++;
    }
    const ups = currentParts.length - 1 - common;
    const prefix = ups === 0 ? './' : '../'.repeat(ups);
    const rest = targetParts.slice(common).join('/');
    return `${prefix}${rest}.js`;
  }

  // Different package: use full dotted→slashed path
  return `${targetParts.join('/')}.js`;
}

// -- Runtime Import Collection --

const RUNTIME_FUNCTIONS = new Set([
  'atom', 'deref', 'reset!', 'swap!', 'isAtom',
  'cons', 'first', 'rest', 'count', 'list', 'seq', 'next',
  'conj', 'get', 'assoc', 'dissoc',
  'str', 'map', 'filter', 'reduce', 'apply',
  'identity', 'constantly', 'comp', 'partial',
  'not', 'nil?', 'some?',
  'inc', 'dec', 'zero?', 'pos?', 'neg?',
  'number?', 'string?', 'boolean?',
  'equiv', 'symbol', 'name',
  '=', 'not=', '-', '+', '*', '/', 'mod',
  '>', '<', '>=', '<=',
  'defprotocol', 'protocolFn',
  'cljToJs', 'jsToClj',
]);

/** Scan AST for runtime function usage and return needed import names. */
function collectRuntimeImports(nodes: Node[]): string[] {
  const used = new Set<string>();
  for (const node of nodes) {
    scanNodeForRuntime(node, used);
  }
  return [...used].sort();
}

function scanNodeForRuntime(node: Node, used: Set<string>): void {
  switch (node.type) {
    case 'vector': {
      used.add('vector');
      for (const item of node.items) scanNodeForRuntime(item, used);
      break;
    }
    case 'map': {
      used.add('hashMap');
      for (const k of node.keys) scanNodeForRuntime(k, used);
      for (const v of node.vals) scanNodeForRuntime(v, used);
      break;
    }
    case 'set': {
      used.add('hashSet');
      for (const item of node.items) scanNodeForRuntime(item, used);
      break;
    }
    case 'keyword': {
      used.add('keyword');
      break;
    }
    case 'var-ref': {
      if (!node.local && RUNTIME_FUNCTIONS.has(node.name)) {
        used.add(munge(node.name));
      }
      break;
    }
    case 'invoke': {
      // Detect runtime function calls by name
      if (node.fn.type === 'var-ref' && !node.fn.local) {
        const name = node.fn.name;
        if (RUNTIME_FUNCTIONS.has(name)) used.add(munge(name));
      }
      scanNodeForRuntime(node.fn, used);
      for (const a of node.args) scanNodeForRuntime(a, used);
      break;
    }
    case 'if': {
      scanNodeForRuntime(node.test, used);
      scanNodeForRuntime(node.then, used);
      scanNodeForRuntime(node.else, used);
      break;
    }
    case 'do': {
      for (const s of node.statements) scanNodeForRuntime(s, used);
      scanNodeForRuntime(node.ret, used);
      break;
    }
    case 'let': case 'letfn': case 'loop': {
      for (const b of node.bindings) scanNodeForRuntime(b.init, used);
      scanNodeForRuntime(node.body, used);
      break;
    }
    case 'fn': {
      for (const a of node.arities) scanNodeForRuntime(a.body, used);
      break;
    }
    case 'def': {
      if (node.init) scanNodeForRuntime(node.init, used);
      break;
    }
    case 'throw': {
      scanNodeForRuntime(node.expr, used);
      break;
    }
    case 'try': {
      scanNodeForRuntime(node.body, used);
      for (const c of node.catches) scanNodeForRuntime(c.body, used);
      if (node.finally) scanNodeForRuntime(node.finally, used);
      break;
    }
    case 'new': {
      scanNodeForRuntime(node.ctor, used);
      for (const a of node.args) scanNodeForRuntime(a, used);
      break;
    }
    case 'interop-call': {
      scanNodeForRuntime(node.target, used);
      for (const a of node.args) scanNodeForRuntime(a, used);
      break;
    }
    case 'interop-field': {
      scanNodeForRuntime(node.target, used);
      break;
    }
    case 'set!': {
      scanNodeForRuntime(node.target, used);
      scanNodeForRuntime(node.value, used);
      break;
    }
    case 'recur': {
      for (const a of node.args) scanNodeForRuntime(a, used);
      break;
    }
    case 'case*': {
      scanNodeForRuntime(node.test, used);
      for (const c of node.clauses) {
        scanNodeForRuntime(c.test, used);
        scanNodeForRuntime(c.then, used);
      }
      scanNodeForRuntime(node.default, used);
      break;
    }
    case 'deftype': case 'extend-type': case 'reify': {
      if ('target' in node) scanNodeForRuntime(node.target, used);
      for (const impl of node.protocols) {
        scanNodeForRuntime(impl.protocol, used);
        for (const m of impl.methods) scanNodeForRuntime(m.body, used);
      }
      break;
    }
    // literal, var-ref, js-raw, ns: no runtime needed
  }
}

// -- Name Munging --

export function munge(name: string): string {
  // Standalone arithmetic operators → readable names
  if (name === '-') return 'subtract';
  if (name === '/') return 'divide';
  return name
    .replace(/\//g, '.')
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
