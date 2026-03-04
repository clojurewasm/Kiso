// DevTools — atom state change tracing for debugging.

import { Atom, cljToJs } from '@clojurewasm/kiso/runtime';

/** Enable console tracing of all atom state changes. */
export function enableTrace(opts?: {
  filter?: (atom: Atom) => boolean;
}): void {
  Atom._globalOnChange = (a, oldVal, newVal) => {
    if (opts?.filter && !opts.filter(a)) return;
    console.log(`[atom:${a.label ?? '?'}]`, cljToJs(oldVal), '\u2192', cljToJs(newVal));
  };
}

/** Disable atom state change tracing. */
export function disableTrace(): void {
  Atom._globalOnChange = undefined;
}
