// Atom — Mutable reference for managing state.
//
// Clojure atoms provide thread-safe state management.
// In JS (single-threaded), atoms are simple mutable containers.

const ATOM_TAG = Symbol.for('kiso.atom');

type WatchFn = (key: unknown, ref: Atom, oldVal: unknown, newVal: unknown) => void;

export class Atom {
  readonly _tag = ATOM_TAG;
  private state: unknown;
  private watches = new Map<unknown, WatchFn>();

  /** Optional label for debugging/devtools. */
  readonly label?: string;

  /** Optional per-instance deref tracking hook. */
  _onDeref: ((atom: Atom) => void) | undefined;

  /** Global deref hook. Set by @clojurewasm/su for dependency tracking. */
  static _globalOnDeref: ((atom: Atom) => void) | undefined;

  /** Global change hook. Set by devtools for tracing state changes. */
  static _globalOnChange: ((atom: Atom, oldVal: unknown, newVal: unknown) => void) | undefined;

  constructor(initial: unknown, label?: string) {
    this.state = initial;
    if (label) this.label = label;
  }

  deref(): unknown {
    if (Atom._globalOnDeref) Atom._globalOnDeref(this);
    if (this._onDeref) this._onDeref(this);
    return this.state;
  }

  reset(newVal: unknown): unknown {
    const oldVal = this.state;
    this.state = newVal;
    if (Atom._globalOnChange) Atom._globalOnChange(this, oldVal, newVal);
    this.notifyWatches(oldVal, newVal);
    return newVal;
  }

  swap(fn: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
    const oldVal = this.state;
    const newVal = fn(this.state, ...args);
    this.state = newVal;
    if (Atom._globalOnChange) Atom._globalOnChange(this, oldVal, newVal);
    this.notifyWatches(oldVal, newVal);
    return newVal;
  }

  compareAndSet(oldVal: unknown, newVal: unknown): boolean {
    if (this.state === oldVal) {
      this.state = newVal;
      this.notifyWatches(oldVal, newVal);
      return true;
    }
    return false;
  }

  /** Add a watch function. Returns an unsubscribe function. */
  addWatch(key: unknown, fn: WatchFn): () => void {
    this.watches.set(key, fn);
    return () => this.removeWatch(key);
  }

  removeWatch(key: unknown): void {
    this.watches.delete(key);
  }

  private notifyWatches(oldVal: unknown, newVal: unknown): void {
    // Snapshot watches to avoid issues with add/remove during iteration
    const snapshot = [...this.watches];
    for (const [key, fn] of snapshot) {
      fn(key, this, oldVal, newVal);
    }
  }
}

export function atom(initial: unknown, label?: string): Atom {
  return new Atom(initial, label);
}

export function isAtom(x: unknown): x is Atom {
  return x instanceof Atom;
}

export function deref(ref: Atom): unknown {
  return ref.deref();
}

export function reset_m(ref: Atom, newVal: unknown): unknown {
  return ref.reset(newVal);
}

export function swap_m(ref: Atom, fn: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  return ref.swap(fn, ...args);
}
