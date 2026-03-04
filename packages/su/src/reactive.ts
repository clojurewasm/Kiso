// Reactive System — track, effect, computed for su framework.
//
// Uses atom's _onDeref hook to automatically track dependencies.
// No knowledge of DOM — pure reactive primitives.

import { Atom } from '@kiso/cljs/runtime';

// -- Tracking --

let currentTracking: Set<Atom> | null = null;

function notifyTracking(atom: Atom): void {
  currentTracking?.add(atom);
}

/** Initialize reactive tracking by setting Atom's global deref hook. */
export function initReactiveTracking(): void {
  Atom._globalOnDeref = notifyTracking;
}

/** Run fn while tracking which atoms are dereffed. Returns [result, deps]. */
export function track<T>(fn: () => T): [T, Set<Atom>] {
  const deps = new Set<Atom>();
  const prev = currentTracking;
  currentTracking = deps;
  try {
    return [fn(), deps];
  } finally {
    currentTracking = prev;
  }
}

// -- Effect --

// -- Effect batching --

let pendingEffects: Set<() => void> | null = null;
let flushing = false;

function flushEffects(): void {
  if (flushing) return;
  flushing = true;
  while (pendingEffects && pendingEffects.size > 0) {
    const batch = pendingEffects;
    pendingEffects = null;
    for (const run of batch) run();
  }
  flushing = false;
}

function scheduleEffect(run: () => void): void {
  if (!pendingEffects) pendingEffects = new Set();
  pendingEffects.add(run);
  flushEffects();
}

/** Run fn reactively. Re-runs when tracked atoms change. Returns dispose function. */
export function effect(fn: () => void): () => void {
  let unsubs: (() => void)[] = [];
  let disposed = false;

  const cleanup = () => {
    for (const unsub of unsubs) unsub();
    unsubs = [];
  };

  const run = () => {
    if (disposed) return;

    // Unsubscribe from previous deps
    cleanup();

    // Track and run
    const [, deps] = track(fn);

    // Subscribe to all deps
    for (const dep of deps) {
      unsubs.push(dep.addWatch(Symbol(), () => {
        if (!disposed) scheduleEffect(run);
      }));
    }
  };

  run();

  return () => {
    disposed = true;
    cleanup();
  };
}

// -- Computed --

/** Create a derived value that auto-tracks dependencies.
 * Computed values are lazy — they recompute on deref when dirty.
 * They forward their dependencies to outer tracking contexts. */
export function computed<T>(fn: () => T): { deref: () => T } {
  let value: T;
  let dirty = true;
  let deps = new Set<Atom>();
  let unsubs: (() => void)[] = [];

  const markDirty = () => { dirty = true; };

  const recompute = () => {
    // Unsub from old deps
    for (const unsub of unsubs) unsub();
    unsubs = [];

    const [result, newDeps] = track(fn);
    value = result;
    deps = newDeps;
    dirty = false;

    // Watch deps for changes
    for (const dep of deps) {
      unsubs.push(dep.addWatch(Symbol(), markDirty));
    }
  };

  return {
    deref(): T {
      if (dirty) recompute();
      // Forward deps to outer tracking context
      if (currentTracking) {
        for (const dep of deps) {
          currentTracking.add(dep);
        }
      }
      return value;
    },
  };
}
