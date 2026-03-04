// Context API — share state across Shadow DOM boundaries.
//
// Uses CustomEvent with composed:true to cross shadow roots,
// following the Lit Context Protocol pattern.

import { getHost } from './lifecycle.js';

const CONTEXT_REQUEST = 'su-context-request';

/** Provide a value for a context key. Must be called inside a component. */
export function provide(key: unknown, value: unknown): void {
  const host = getHost();
  if (!host) throw new Error('provide: must be called inside a component');
  host.addEventListener(CONTEXT_REQUEST, ((e: CustomEvent) => {
    if (e.detail.key === key) {
      e.detail.callback(value);
      e.stopPropagation();
    }
  }) as EventListener);
}

/** Consume a context value. Must be called inside a component. */
export function useContext(key: unknown): unknown {
  const host = getHost();
  if (!host) throw new Error('useContext: must be called inside a component');
  let result: unknown;
  host.dispatchEvent(new CustomEvent(CONTEXT_REQUEST, {
    detail: { key, callback: (val: unknown) => { result = val; } },
    bubbles: true,
    composed: true,
  }));
  return result;
}
