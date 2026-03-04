// Emitter — Generates ES6 JavaScript from Node AST.
//
// Key design decisions (from CW knowledge):
// - Clojure truthiness: truthy(x) runtime helper
// - recur → while(true) + temp vars + continue
// - Multi-arity fn → switch(args.length)
// - Name munging for special characters

import type { Node, FnArity, LetBinding, CatchClause, CaseNode, DeftypeNode, DefrecordNode, ExtendTypeNode, ReifyNode } from '../analyzer/node.js';
import { isMacro } from '../analyzer/macros.js';

export type CodegenHelpers = {
  emit: (node: Node) => string;
  indent: string;
  deeper: () => CodegenHelpers;
  extractLiteral: (node: Node) => unknown | null;
};

export type CodegenHook = (args: Node[], helpers: CodegenHelpers) => string;

type EmitCtx = {
  loopBindings: string[] | null; // current loop/fn binding names for recur
  nsAliases?: Map<string, string>; // ns → alias (e.g. "su.core" → "su")
  indent: number; // indentation level (0 = top-level)
  hooks?: Map<string, CodegenHook>;
  runtimeAliases?: Map<string, string>; // munged-name → alias for collided imports
};

const DEFAULT_CTX: EmitCtx = { loopBindings: null, nsAliases: new Map(), indent: 0 };

function ind(ctx: EmitCtx): string { return '  '.repeat(ctx.indent); }
function deeper(ctx: EmitCtx): EmitCtx { return { ...ctx, indent: ctx.indent + 1 }; }

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
      const munged = munge(node.name);
      // Use aliased import for runtime functions that collide with user defs
      if (!node.local && RUNTIME_FUNCTIONS.has(node.name) && ctx.runtimeAliases?.has(munged)) {
        return ctx.runtimeAliases.get(munged)!;
      }
      return munged;
    }
    case 'vector': return `vector(${node.items.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'map': return emitMap(node, ctx);
    case 'set': return `hashSet(${node.items.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'invoke': return emitInvoke(node, ctx);
    case 'if': return emitIf(node, ctx);
    case 'do': return emitDo(node, ctx);
    case 'let': return emitLet(node, ctx);
    case 'letfn': return emitLetfn(node, ctx);
    case 'fn': return emitFn(node, ctx);
    case 'def': return emitDef(node, ctx);
    case 'recur': return emitRecur(node, ctx);
    case 'loop': return emitLoop(node, ctx);
    case 'throw': return emitThrow(node, ctx);
    case 'try': return emitTry(node, ctx);
    case 'new': return `new ${emitNode(node.ctor, ctx)}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'interop-call': return `${emitInteropTarget(node.target, ctx)}.${node.method}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
    case 'interop-field': return `${emitInteropTarget(node.target, ctx)}.${node.field}`;
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

export type TopLevelMapping = { genLine: number; nodeIndex: number };

/** Emit a complete module from a list of top-level nodes. */
export function emitModule(nodes: Node[], hooks?: Map<string, CodegenHook>): string {
  return emitModuleWithMappings(nodes, hooks).code;
}

/** Emit module and return per-node generated line positions. */
export function emitModuleWithMappings(nodes: Node[], hooks?: Map<string, CodegenHook>): { code: string; mappings: TopLevelMapping[] } {
  // Extract ns aliases for resolving qualified names
  const nsAliases = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'ns') {
      for (const req of node.requires) {
        if (req.alias) nsAliases.set(req.ns, req.alias);
      }
    }
  }
  // Collect user-defined top-level names to detect collisions with runtime imports
  const userDefs = new Set<string>();
  for (const node of nodes) {
    if (node.type === 'def') userDefs.add(munge(node.name));
    if (node.type === 'deftype') { userDefs.add(node.name); userDefs.add(`_to_${node.name}`); }
    if (node.type === 'defrecord') { userDefs.add(node.name); userDefs.add(`_to_${node.name}`); userDefs.add(`map_to_${node.name}`); }
  }

  // Detect runtime import collisions and build alias map
  const runtimeImports = collectRuntimeImports(nodes);
  const runtimeAliases = new Map<string, string>();
  for (const name of runtimeImports) {
    if (userDefs.has(name)) {
      runtimeAliases.set(name, `_rt_${name}`);
    }
  }

  const ctx: EmitCtx = { loopBindings: null, nsAliases, indent: 0, hooks, runtimeAliases };

  const allSegments = nodes.map(n => emitTopLevelCtx(n, ctx));
  // Track which node indices produced non-empty output
  const segments: string[] = [];
  const nodeIndices: number[] = [];
  for (let i = 0; i < allSegments.length; i++) {
    if (allSegments[i]!.length > 0) {
      segments.push(allSegments[i]!);
      nodeIndices.push(i);
    }
  }

  // Auto-import runtime functions (with aliases for collisions)
  let importOffset = 0;
  if (runtimeImports.length > 0) {
    const importParts = runtimeImports.map(name =>
      runtimeAliases.has(name) ? `${name} as ${runtimeAliases.get(name)!}` : name,
    );
    const importLine = `import { ${importParts.join(', ')} } from '@clojurewasm/kiso/runtime';`;
    segments.unshift(importLine);
    importOffset = 2; // import line + blank line from \n\n join
  }

  // Compute line offsets for each non-empty top-level node
  // Top-level forms are separated by blank lines (\n\n), so +1 for the blank line
  const mappings: TopLevelMapping[] = [];
  let genLine = importOffset;
  for (let i = 0; i < nodeIndices.length; i++) {
    mappings.push({ genLine, nodeIndex: nodeIndices[i]! });
    const segIdx = runtimeImports.length > 0 ? i + 1 : i;
    genLine += segments[segIdx]!.split('\n').length + 1; // +1 for blank line separator
  }

  return { code: segments.join('\n\n'), mappings };
}

function emitTopLevelCtx(node: Node, ctx: EmitCtx): string {
  if (node.type === 'def') {
    const init = node.init ? emitNode(node.init, ctx) : 'null';
    return `export let ${munge(node.name)} = ${init};`;
  }
  if (node.type === 'deftype') {
    const code = emitDeftype(node, ctx);
    const factoryName = `_to_${node.name}`;
    return `${code}\nexport { ${node.name}, ${factoryName} };`;
  }
  if (node.type === 'defrecord') {
    const code = emitDefrecord(node, ctx);
    const factoryName = `_to_${node.name}`;
    const mapFactoryName = `map_to_${node.name}`;
    return `${code}\nexport { ${node.name}, ${factoryName}, ${mapFactoryName} };`;
  }
  if (node.type === 'ns') {
    return emitNs(node);
  }
  return `${emitNode(node, ctx)};`;
}

// -- Emitters --

function emitInteropTarget(target: Node, ctx: EmitCtx): string {
  const code = emitNode(target, ctx);
  // Numeric literals need parens to avoid `42.method()` ambiguity
  if (target.type === 'literal' && typeof target.value === 'number') return `(${code})`;
  return code;
}

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

function makeHelpers(ctx: EmitCtx): CodegenHelpers {
  return {
    emit: (node: Node) => emitNode(node, ctx),
    indent: ind(ctx),
    deeper: () => makeHelpers(deeper(ctx)),
    extractLiteral: (node: Node) => node.type === 'literal' ? node.value : null,
  };
}

function emitInvoke(node: { fn: Node; args: Node[] }, ctx: EmitCtx): string {
  // Check codegen hooks for namespace-qualified invocations
  if (ctx.hooks && node.fn.type === 'var-ref') {
    const hook = ctx.hooks.get(node.fn.name);
    if (hook) return hook(node.args, makeHelpers(ctx));
  }
  return `${emitNode(node.fn, ctx)}(${node.args.map((n) => emitNode(n, ctx)).join(', ')})`;
}

function ifChainDepth(node: { test: Node; then: Node; else: Node }): number {
  let depth = 1;
  let cur = node.else;
  while (cur.type === 'if') {
    depth++;
    cur = (cur as { test: Node; then: Node; else: Node }).else;
  }
  return depth;
}

function emitIfChain(node: { test: Node; then: Node; else: Node }, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const i = ind(inner);
  const lines: string[] = [];
  let cur: Node = node as unknown as Node;
  while (cur.type === 'if') {
    const ifNode = cur as unknown as { test: Node; then: Node; else: Node };
    lines.push(`${i}if (truthy(${emitNode(ifNode.test, inner)})) return ${emitNode(ifNode.then, inner)};`);
    cur = ifNode.else;
  }
  lines.push(`${i}return ${emitNode(cur, inner)};`);
  return `(() => {\n${lines.join('\n')}\n${ind(ctx)}})()`;
}

function emitIf(node: { test: Node; then: Node; else: Node }, ctx: EmitCtx): string {
  // Deep if-chains (cond) → IIFE with early returns
  if (ifChainDepth(node) > 2) {
    return emitIfChain(node, ctx);
  }
  // Clojure truthiness: only nil and false are falsy
  const test = emitNode(node.test, ctx);
  const inner = deeper(ctx);
  const then = emitNode(node.then, inner);
  const els = emitNode(node.else, inner);
  const i = ind(inner);
  return `(truthy(${test})\n${i}? ${then}\n${i}: ${els})`;
}

function emitCase(node: CaseNode, ctx: EmitCtx): string {
  // case* → multi-line chained ternaries for readability
  const inner = deeper(ctx);
  const i = ind(inner);
  const test = emitNode(node.test, ctx);
  const defaultVal = emitNode(node.default, inner);
  if (node.clauses.length === 0) return defaultVal;
  const lines: string[] = [];
  for (const c of node.clauses) {
    const testVal = emitNode(c.test, inner);
    const thenVal = emitNode(c.then, inner);
    lines.push(`${test} === ${testVal} ? ${thenVal}`);
  }
  lines.push(defaultVal);
  return `(\n${i}${lines.join(`\n${i}: `)}\n${ind(ctx)})`;
}

function emitDo(node: { statements: Node[]; ret: Node }, ctx: EmitCtx): string {
  if (node.statements.length === 0) return emitNode(node.ret, ctx);
  const stmts = node.statements.map((n) => emitNode(n, ctx)).join(', ');
  return `(${stmts}, ${emitNode(node.ret, ctx)})`;
}

function emitLet(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const i = ind(inner);
  const seen = new Set<string>();
  const bindings = node.bindings.map((b) => {
    const name = munge(b.name);
    const init = emitNode(b.init, inner);
    if (seen.has(name)) return `${i}${name} = ${init};`;
    seen.add(name);
    return `${i}let ${name} = ${init};`;
  }).join('\n');
  return `(() => {\n${bindings}\n${i}return ${emitNode(node.body, inner)};\n${ind(ctx)}})()`;
}

function emitLetfn(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const i = ind(inner);
  const decls = node.bindings.map((b) => munge(b.name)).join(', ');
  const assigns = node.bindings.map(
    (b) => `${i}${munge(b.name)} = ${emitNode(b.init, inner)};`,
  ).join('\n');
  return `(() => {\n${i}let ${decls};\n${assigns}\n${i}return ${emitNode(node.body, inner)};\n${ind(ctx)}})()`;
}

function emitFn(node: { name: string | null; arities: FnArity[] }, outerCtx: EmitCtx): string {
  const name = node.name ? munge(node.name) : '';

  if (node.arities.length === 1) {
    const arity = node.arities[0]!;
    return emitSingleArity(name, arity, outerCtx);
  }

  // Multi-arity: switch on arguments.length
  const inner = deeper(outerCtx);
  const caseCtx = deeper(inner);
  const ci = ind(caseCtx);
  const bi = ind(deeper(caseCtx));
  const cases = node.arities.map((arity) => {
    const n = arity.params.length;
    const params = arity.params.map(munge).join(', ');
    const ctx: EmitCtx = { ...deeper(caseCtx), loopBindings: arity.params };
    const body = emitNode(arity.body, ctx);
    if (arity.restParam) {
      return `${ci}default: {\n${bi}const [${params}${params ? ', ' : ''}...${munge(arity.restParam)}] = args;\n${bi}return ${body};\n${ci}}`;
    }
    return `${ci}case ${n}: {\n${bi}const [${params}] = args;\n${bi}return ${body};\n${ci}}`;
  }).join('\n');

  const si = ind(inner);
  return `function ${name}(...args) {\n${si}switch(args.length) {\n${cases}\n${si}}\n${ind(outerCtx)}}`;
}

function emitSingleArity(name: string, arity: FnArity, outerCtx: EmitCtx): string {
  const params = arity.params.map(munge);
  if (arity.restParam) {
    params.push(`...${munge(arity.restParam)}`);
  }
  const inner = deeper(outerCtx);
  const ctx: EmitCtx = { ...inner, loopBindings: arity.params };
  const body = emitNode(arity.body, ctx);
  return `function ${name}(${params.join(', ')}) {\n${ind(inner)}return ${body};\n${ind(outerCtx)}}`;
}

function emitDeftype(node: DeftypeNode, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const ii = deeper(inner);
  const i = ind(inner);
  const i2 = ind(ii);
  const name = node.name;
  const fields = node.fields.map(munge);
  const ctorParams = fields.join(', ');
  const ctorBody = fields.map((f) => `${i2}this.${f} = ${f};`).join('\n');
  const members: string[] = [];
  members.push(`${i}constructor(${ctorParams}) {\n${ctorBody}\n${i}}`);
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge);
      const body = emitNode(m.body, ii);
      members.push(`${i}[${protoVar}.methods.${m.name}](${mParams.join(', ')}) {\n${i2}return ${body};\n${i}}`);
    }
  }
  const factoryName = `_to_${name}`;
  return `class ${name} {\n${members.join('\n\n')}\n}\nfunction ${factoryName}(${ctorParams}) {\n${i}return new ${name}(${ctorParams});\n}`;
}

function emitDefrecord(node: DefrecordNode, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const ii = deeper(inner);
  const i = ind(inner);
  const i2 = ind(ii);
  const name = node.name;
  const fields = node.fields.map(munge);
  const ctorParams = fields.join(', ');
  const ctorBody = fields.map((f) => `${i2}this.${f} = ${f};`).join('\n');
  const typeAssign = `${i2}this.__kiso_type = "${name}";`;
  const members: string[] = [];
  members.push(`${i}constructor(${ctorParams}) {\n${ctorBody}\n${typeAssign}\n${i}}`);
  for (const impl of node.protocols) {
    const protoVar = emitNode(impl.protocol, ctx);
    for (const m of impl.methods) {
      const mParams = m.params.slice(1).map(munge);
      const body = emitNode(m.body, ii);
      members.push(`${i}[${protoVar}.methods.${m.name}](${mParams.join(', ')}) {\n${i2}return ${body};\n${i}}`);
    }
  }
  const factoryName = `_to_${name}`;
  const mapFactoryName = `map_to_${name}`;
  const mapFactoryParams = fields.map((f) => `keyword("${f}")`);
  const mapFactoryBody = fields.map((_f, idx) => `m.get(${mapFactoryParams[idx]})`).join(', ');

  return [
    `class ${name} {\n${members.join('\n\n')}\n}`,
    `function ${factoryName}(${ctorParams}) {\n${i}return new ${name}(${ctorParams});\n}`,
    `function ${mapFactoryName}(m) {\n${i}return new ${name}(${mapFactoryBody});\n}`,
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

function emitThrow(node: { expr: Node }, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const i = ind(inner);
  return `(() => {\n${i}throw ${emitNode(node.expr, inner)};\n${ind(ctx)}})()`;
}

function emitDef(node: { name: string; init: Node | null }, ctx: EmitCtx): string {
  const init = node.init ? emitNode(node.init, ctx) : 'null';
  return `let ${munge(node.name)} = ${init}`;
}

function emitLoop(node: { bindings: LetBinding[]; body: Node }, ctx: EmitCtx): string {
  const inner = deeper(ctx);
  const ii = deeper(inner);
  const i = ind(inner);
  const i2 = ind(ii);
  const names = node.bindings.map((b) => b.name);
  const decls = node.bindings.map(
    (b) => `${i}let ${munge(b.name)} = ${emitNode(b.init, inner)};`,
  ).join('\n');
  const loopCtx: EmitCtx = { ...ii, loopBindings: names };
  const body = emitStmt(node.body, loopCtx);
  return `(() => {\n${decls}\n${i}while (true) {\n${i2}${body}\n${i}}\n${ind(ctx)}})()`;
}

/** Emit a node as a statement that may contain recur. */
function emitStmt(node: Node, ctx: EmitCtx): string {
  const i = ind(ctx);
  const inner = deeper(ctx);
  const ii = ind(inner);
  // For if nodes in statement position, emit as if/else blocks
  if (node.type === 'if') {
    const test = emitNode(node.test, ctx);
    const thenStmt = emitStmt(node.then, inner);
    const elseStmt = emitStmt(node.else, inner);
    return `if (truthy(${test})) {\n${ii}${thenStmt}\n${i}} else {\n${ii}${elseStmt}\n${i}}`;
  }
  if (node.type === 'recur') {
    return emitRecurStmt(node, ctx);
  }
  if (node.type === 'do') {
    const stmts = node.statements.map((n) => `${emitNode(n, ctx)};`).join('\n' + i);
    const ret = emitStmt(node.ret, ctx);
    return `${stmts}\n${i}${ret}`;
  }
  if (node.type === 'let') {
    const bindings = node.bindings.map(
      (b) => `const ${munge(b.name)} = ${emitNode(b.init, ctx)};`,
    ).join('\n' + i);
    return `${bindings}\n${i}${emitStmt(node.body, ctx)}`;
  }
  if (node.type === 'letfn') {
    const decls = node.bindings.map((b) => munge(b.name)).join(', ');
    const assigns = node.bindings.map(
      (b) => `${munge(b.name)} = ${emitNode(b.init, ctx)};`,
    ).join('\n' + i);
    return `let ${decls};\n${i}${assigns}\n${i}${emitStmt(node.body, ctx)}`;
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

  const i = ind(ctx);
  const args = node.args.map((a) => emitNode(a, ctx));

  // Use temp variables for simultaneous assignment
  const temps = names.map((n, idx) => `const ${munge(n)}__tmp = ${args[idx]};`);
  const assigns = names.map((n) => `${munge(n)} = ${munge(n)}__tmp;`);
  return [...temps, ...assigns, 'continue;'].join('\n' + i);
}

function emitTry(
  node: { body: Node; catches: CatchClause[]; finally: Node | null },
  ctx: EmitCtx,
): string {
  const inner = deeper(ctx);
  const ii = deeper(inner);
  const i = ind(inner);
  const i2 = ind(ii);
  const body = emitNode(node.body, inner);
  let catchBlock = '';
  if (node.catches.length > 0) {
    if (node.catches.length === 1 && node.catches[0]!.exType === ':default') {
      const c = node.catches[0]!;
      catchBlock = ` catch (${munge(c.binding)}) {\n${i2}return ${emitNode(c.body, ii)};\n${i}}`;
    } else {
      const catchVar = 'catch__auto';
      const branches = node.catches.map((c) => {
        const bindingName = munge(c.binding);
        const bodyExpr = emitNode(c.body, ii);
        if (c.exType === ':default') {
          return `{\n${i2}let ${bindingName} = ${catchVar};\n${i2}return ${bodyExpr};\n${i}}`;
        }
        const typeName = c.exType.startsWith('js/') ? c.exType.slice(3) : munge(c.exType);
        return `if (${catchVar} instanceof ${typeName}) {\n${i2}let ${bindingName} = ${catchVar};\n${i2}return ${bodyExpr};\n${i}}`;
      });
      const chain = branches.join(' else ');
      catchBlock = ` catch (${catchVar}) {\n${i}${chain}\n${i}throw ${catchVar};\n${i}}`;
    }
  }
  let finallyBlock = '';
  if (node.finally) {
    finallyBlock = ` finally {\n${i2}${emitNode(node.finally, ii)};\n${i}}`;
  }
  return `(() => {\n${i}try {\n${i2}return ${body};\n${i}}${catchBlock}${finallyBlock}\n${ind(ctx)}})()`;
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
  // ClojureScript convention: hyphens in namespace → underscores in filesystem
  const currentParts = currentNs.split('.').map(p => p.replace(/-/g, '_'));
  const targetParts = targetNs.split('.').map(p => p.replace(/-/g, '_'));

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
  'defmultiFn',
  'clj->js', 'js->clj', 'bean', 'js-obj', 'js-array',
  // Map operations
  'get-in', 'assoc-in', 'update', 'update-in',
  'keys', 'vals', 'merge', 'select-keys', 'find',
  // Numeric
  'max', 'min', 'abs', 'even?', 'odd?', 'rem', 'rand', 'rand-int',
  // Seq operations
  'take', 'drop', 'take-while', 'drop-while',
  'some', 'every?', 'not-every?', 'not-any?',
  'sort', 'sort-by', 'reverse',
  'range', 'repeat', 'repeatedly',
  'group-by', 'frequencies',
  // Predicates
  'fn?', 'integer?', 'coll?', 'sequential?', 'associative?', 'identical?',
  // Higher-order
  'complement', 'juxt', 'every-pred', 'some-fn', 'memoize',
  // Printing
  'println', 'print',
  // Collection access
  'second', 'last', 'butlast', 'peek', 'pop', 'subvec', 'not-empty',
  // Seq batch 2
  'mapcat', 'map-indexed', 'remove', 'keep',
  'flatten', 'distinct', 'dedupe',
  'interleave', 'interpose',
  'partition', 'partition-all', 'partition-by',
  'merge-with', 'zipmap', 'reduce-kv',
  // Regex
  're-find', 're-matches', 're-seq',
  // Misc
  'fnil', 'trampoline',
  // Navigation
  'ffirst', 'fnext', 'nfirst', 'nnext',
  'take-last', 'take-nth', 'drop-last', 'keep-indexed', 'reductions',
  // Generators
  'iterate', 'cycle', 'doall', 'dorun',
  // empty / set
  'empty', 'set',
  // Predicates batch 2
  'float?', 'ifn?', 'counted?', 'realized?',
  // Numeric
  'quot', 'compare',
  // Array interop
  'aget', 'aset', 'alength', 'js-keys',
  // Batch 4
  '==', 're-pattern',
  'pr-str', 'prn-str', 'print-str', 'println-str',
  'array', 'aclone', 'js-delete',
  'hash', 'type', 'instance?',
  'prn', 'pr',
  'reversible?', 'sorted?',
  'satisfies?', 'implements?',
  // Sorted collections
  'sorted-map', 'sorted-set',
  'sorted-map-by', 'subseq', 'rsubseq',
  // Transient collections
  'transient', 'persistent!', 'conj!', 'assoc!', 'dissoc!', 'disj!',
  // Metadata
  'meta', 'with-meta', 'vary-meta',
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
      used.add('truthy');
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
  // Standalone operators → readable names
  switch (name) {
    case '-': return 'subtract';
    case '/': return 'divide';
    case '+': return 'add';
    case '*': return 'multiply';
    case '=': return 'eq';
    case '==': return 'num_eq';
    case 'not=': return 'notEq';
    case 'type': return 'type_fn';
    case '<': return 'lt';
    case '>': return 'gt';
    case '<=': return 'lte';
    case '>=': return 'gte';
  }
  // Earmuffs: *foo* → _foo_ (but lone * is handled above)
  const earmuffed = name.replace(/^\*(.+)\*$/, '_$1_');
  if (earmuffed !== name) {
    return earmuffed.replace(/-/g, '_');
  }
  return name
    .replace(/\//g, '.')
    .replace(/->/g, '_to_')
    .replace(/-/g, '_')
    .replace(/\?/g, '_p')
    .replace(/!/g, '_m')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_eq_')
    .replace(/'/g, '_SINGLEQUOTE_')
    .replace(/&/g, '_AMPERSAND_')
    .replace(/%/g, '_PCT_');
}
