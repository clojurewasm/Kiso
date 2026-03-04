// Destructuring — Expand binding patterns into flat LetBinding[].
//
// Sequential: [a b & rest :as all] → nth-based or seq-based bindings
// Associative: {:keys [a b] :or {a 0} :as m} → get-based bindings
// Based on CW's analyzer.zig destructuring algorithm.

import type { Form } from '../reader/form.js';
import type { Node, LetBinding } from './node.js';

type AnalyzeFn = (form: Form, scope: { locals: Set<string>; parent: unknown }) => Node;

let tempCounter = 0;

function tempName(prefix: string): string {
  return `_${prefix}${tempCounter++}`;
}

/**
 * Expand a single binding pattern + init into flat LetBinding[].
 * If pattern is a simple symbol, returns [{name, init}].
 * If pattern is a vector (sequential) or map (associative), recursively expands.
 */
export function expandBinding(
  pattern: Form,
  init: Node,
  analyzeForm: AnalyzeFn,
  scope: { locals: Set<string>; parent: unknown },
): LetBinding[] {
  if (pattern.data.type === 'symbol') {
    return [{ name: pattern.data.name, init }];
  }
  if (pattern.data.type === 'vector') {
    return expandSequential(pattern.data.items, init, analyzeForm, scope);
  }
  if (pattern.data.type === 'map') {
    return expandAssociative(pattern.data.items, init, analyzeForm, scope);
  }
  throw new Error(`Unsupported destructuring pattern: ${pattern.data.type}`);
}

// -- Sequential destructuring --

function expandSequential(
  items: Form[],
  init: Node,
  analyzeForm: AnalyzeFn,
  scope: { locals: Set<string>; parent: unknown },
): LetBinding[] {
  const bindings: LetBinding[] = [];

  // Temp var for the collection
  const collName = tempName('sc');
  bindings.push({ name: collName, init });

  // Scan for & and :as
  let ampIdx = -1;
  let asIdx = -1;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.data.type === 'symbol' && item.data.name === '&') { ampIdx = i; }
    if (item.data.type === 'keyword' && item.data.name === 'as') { asIdx = i; }
  }

  const collRef: Node = { type: 'var-ref', name: collName, local: true };

  if (ampIdx === -1) {
    // No rest — use nth-based access (fast path)
    const end = asIdx !== -1 ? asIdx : items.length;
    for (let i = 0; i < end; i++) {
      const pat = items[i]!;
      const nthCall = makeNthCall(collRef, i);
      const expanded = expandBinding(pat, nthCall, analyzeForm, scope);
      for (const b of expanded) {
        bindings.push(b);
        scope.locals.add(b.name);
      }
    }
  } else {
    // Has rest — use seq/first/next chain
    const seqName = tempName('ss');
    bindings.push({ name: seqName, init: makeSeqCall(collRef) });
    scope.locals.add(seqName);

    // Elements before &
    for (let i = 0; i < ampIdx; i++) {
      const pat = items[i]!;
      const seqRef: Node = { type: 'var-ref', name: seqName, local: true };
      const firstCall = makeFirstCall(seqRef);
      const expanded = expandBinding(pat, firstCall, analyzeForm, scope);
      for (const b of expanded) {
        bindings.push(b);
        scope.locals.add(b.name);
      }
      // Advance: seqName = next(seqName)
      const nextSeqName = tempName('ss');
      bindings.push({
        name: nextSeqName,
        init: makeNextCall(seqRef),
      });
      // Update seqName for next iteration — we use a new temp each time
      // but we need the last one for rest binding
      scope.locals.add(nextSeqName);
      // For the next iteration and rest, we need to reference the new name
      // We'll use the last seqName below
      Object.assign(items, { _lastSeqName: nextSeqName });
    }

    // Rest binding (element after &)
    if (ampIdx + 1 < items.length) {
      const restPat = items[ampIdx + 1]!;
      if (restPat.data.type !== 'keyword' || restPat.data.name !== 'as') {
        // Get the last seq name
        const lastSeqName = (items as unknown as { _lastSeqName: string })._lastSeqName || seqName;
        const restRef: Node = { type: 'var-ref', name: lastSeqName, local: true };
        const expanded = expandBinding(restPat, restRef, analyzeForm, scope);
        for (const b of expanded) {
          bindings.push(b);
          scope.locals.add(b.name);
        }
      }
    }
  }

  // :as binding
  if (asIdx !== -1 && asIdx + 1 < items.length) {
    const asPat = items[asIdx + 1]!;
    if (asPat.data.type === 'symbol') {
      bindings.push({ name: asPat.data.name, init: collRef });
      scope.locals.add(asPat.data.name);
    }
  }

  // Clean up internal property
  delete (items as unknown as Record<string, unknown>)._lastSeqName;

  return bindings;
}

// -- Associative destructuring --

function expandAssociative(
  items: Form[],
  init: Node,
  analyzeForm: AnalyzeFn,
  scope: { locals: Set<string>; parent: unknown },
): LetBinding[] {
  const bindings: LetBinding[] = [];

  // Check if we need :as before deciding on temp var
  let hasAs = false;
  for (let i = 0; i < items.length; i += 2) {
    const key = items[i]!;
    if (key.data.type === 'keyword' && key.data.name === 'as') { hasAs = true; break; }
  }

  // Skip intermediate temp when init is a simple var-ref and no :as
  let mapRef: Node;
  if (!hasAs && init.type === 'var-ref') {
    mapRef = init;
  } else {
    const mapName = tempName('m');
    bindings.push({ name: mapName, init });
    scope.locals.add(mapName);
    mapRef = { type: 'var-ref', name: mapName, local: true };
  }

  // First pass: find :or defaults and :as
  let defaults: Map<string, Form> | null = null;
  let asName: string | null = null;

  for (let i = 0; i < items.length; i += 2) {
    const key = items[i]!;
    const val = items[i + 1];
    if (key.data.type === 'keyword' && key.data.name === 'or' && val && val.data.type === 'map') {
      defaults = new Map();
      const orItems = val.data.items;
      for (let j = 0; j < orItems.length; j += 2) {
        const dk = orItems[j]!;
        const dv = orItems[j + 1]!;
        if (dk.data.type === 'symbol') {
          defaults.set(dk.data.name, dv);
        }
      }
    }
    if (key.data.type === 'keyword' && key.data.name === 'as' && val && val.data.type === 'symbol') {
      asName = val.data.name;
    }
  }

  // Second pass: process bindings
  for (let i = 0; i < items.length; i += 2) {
    const key = items[i]!;
    const val = items[i + 1];

    // Skip :or and :as (already processed)
    if (key.data.type === 'keyword' && (key.data.name === 'or' || key.data.name === 'as')) continue;

    if (key.data.type === 'keyword' && key.data.name === 'keys' && val && val.data.type === 'vector') {
      // :keys [a b] → (get map :a), (get map :b)
      for (const sym of val.data.items) {
        if (sym.data.type !== 'symbol') continue;
        const name = sym.data.name;
        const getCall = makeGetKeywordCall(mapRef, name, null, defaults, analyzeForm, scope);
        const expanded = expandBinding(sym, getCall, analyzeForm, scope);
        for (const b of expanded) {
          bindings.push(b);
          scope.locals.add(b.name);
        }
      }
    } else if (key.data.type === 'keyword' && key.data.name === 'strs' && val && val.data.type === 'vector') {
      // :strs [a b] → (get map "a"), (get map "b")
      for (const sym of val.data.items) {
        if (sym.data.type !== 'symbol') continue;
        const name = sym.data.name;
        const getCall = makeGetStringCall(mapRef, name, defaults, analyzeForm, scope);
        const expanded = expandBinding(sym, getCall, analyzeForm, scope);
        for (const b of expanded) {
          bindings.push(b);
          scope.locals.add(b.name);
        }
      }
    } else if (val && key.data.type === 'symbol') {
      // Explicit: {x :x} → (get map :x)
      if (val.data.type === 'keyword') {
        const getCall = makeGetKeywordCall(mapRef, val.data.name, val.data.ns, defaults, analyzeForm, scope);
        const expanded = expandBinding(key, getCall, analyzeForm, scope);
        for (const b of expanded) {
          bindings.push(b);
          scope.locals.add(b.name);
        }
      }
    }
  }

  // :as binding
  if (asName) {
    bindings.push({ name: asName, init: mapRef });
    scope.locals.add(asName);
  }

  return bindings;
}

// -- Helper: make runtime calls as Node AST --

function makeNthCall(coll: Node, index: number): Node {
  // get(coll, index, null) — works for vectors
  return {
    type: 'invoke',
    fn: { type: 'var-ref', name: 'get', local: false },
    args: [coll, { type: 'literal', value: index, jsType: 'number' }, { type: 'literal', value: null, jsType: 'null' }],
  };
}

function makeSeqCall(coll: Node): Node {
  return {
    type: 'invoke',
    fn: { type: 'var-ref', name: 'seq', local: false },
    args: [coll],
  };
}

function makeFirstCall(s: Node): Node {
  return {
    type: 'invoke',
    fn: { type: 'var-ref', name: 'first', local: false },
    args: [s],
  };
}

function makeNextCall(s: Node): Node {
  return {
    type: 'invoke',
    fn: { type: 'var-ref', name: 'next', local: false },
    args: [s],
  };
}

function makeGetKeywordCall(
  coll: Node,
  name: string,
  ns: string | null,
  defaults: Map<string, Form> | null,
  analyzeForm: AnalyzeFn,
  scope: { locals: Set<string>; parent: unknown },
): Node {
  const keyNode: Node = ns
    ? { type: 'keyword', ns, name }
    : { type: 'keyword', ns: null, name };
  const args: Node[] = [coll, keyNode];
  if (defaults && defaults.has(name)) {
    args.push(analyzeForm(defaults.get(name)!, scope as never));
  }
  return { type: 'invoke', fn: { type: 'var-ref', name: 'get', local: false }, args };
}

function makeGetStringCall(
  coll: Node,
  name: string,
  defaults: Map<string, Form> | null,
  analyzeForm: AnalyzeFn,
  scope: { locals: Set<string>; parent: unknown },
): Node {
  const keyNode: Node = { type: 'literal', value: name, jsType: 'string' };
  const args: Node[] = [coll, keyNode];
  if (defaults && defaults.has(name)) {
    args.push(analyzeForm(defaults.get(name)!, scope as never));
  }
  return { type: 'invoke', fn: { type: 'var-ref', name: 'get', local: false }, args };
}

/** Reset temp counter (for deterministic test output). */
export function resetTempCounter(): void {
  tempCounter = 0;
}
