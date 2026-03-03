// LazySeq — Lazy sequence that memoizes on first realization.
//
// Wraps a thunk (zero-arg function) that produces a seqable value.
// The thunk is called at most once; the result is cached.
// Nested LazySeqs are automatically flattened on realization.

export class LazySeq {
  private fn: (() => unknown) | null;
  private sv: unknown = null;
  private realized = false;

  constructor(fn: () => unknown) {
    this.fn = fn;
  }

  sval(): unknown {
    if (this.fn !== null) {
      this.sv = this.fn();
      this.fn = null;
    }
    return this.sv;
  }

  realize(): unknown {
    if (!this.realized) {
      this.sval();
      let ls = this.sv;
      // Walk nested LazySeqs
      while (ls instanceof LazySeq) {
        ls = ls.sval();
      }
      this.sv = ls;
      this.realized = true;
    }
    return this.sv;
  }
}
