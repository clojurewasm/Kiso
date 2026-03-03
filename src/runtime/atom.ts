// Atom — Mutable reference for managing state.
//
// Clojure atoms provide thread-safe state management.
// In JS (single-threaded), atoms are simple mutable containers.

const ATOM_TAG = Symbol.for('kiso.atom');

export class Atom {
  readonly _tag = ATOM_TAG;
  private state: unknown;

  constructor(initial: unknown) {
    this.state = initial;
  }

  deref(): unknown {
    return this.state;
  }

  reset(newVal: unknown): unknown {
    this.state = newVal;
    return newVal;
  }

  swap(fn: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
    const newVal = fn(this.state, ...args);
    this.state = newVal;
    return newVal;
  }

  compareAndSet(oldVal: unknown, newVal: unknown): boolean {
    if (this.state === oldVal) {
      this.state = newVal;
      return true;
    }
    return false;
  }
}

export function atom(initial: unknown): Atom {
  return new Atom(initial);
}

export function isAtom(x: unknown): x is Atom {
  return x instanceof Atom;
}
