// Lifecycle — on-mount, on-unmount hooks for su framework.
//
// Hook registration uses a context stack (like React hooks).
// collectLifecycleHooks(fn) runs fn and captures all registered hooks.

type HookFn = () => void;

export type LifecycleHooks = {
  mounts: HookFn[];
  unmounts: HookFn[];
};

let currentHooks: LifecycleHooks | null = null;

// -- Host element context (for provide/useContext) --
let currentHost: HTMLElement | null = null;

/** Set the current host element (used during component init). */
export function setHost(el: HTMLElement | null): void { currentHost = el; }

/** Get the current host element. */
export function getHost(): HTMLElement | null { return currentHost; }

/** Register a callback to run after the component mounts. */
export function onMount(fn: HookFn): void {
  if (!currentHooks) {
    throw new Error('onMount called outside collectLifecycleHooks context');
  }
  currentHooks.mounts.push(fn);
}

/** Register a callback to run before the component unmounts. */
export function onUnmount(fn: HookFn): void {
  if (!currentHooks) {
    throw new Error('onUnmount called outside collectLifecycleHooks context');
  }
  currentHooks.unmounts.push(fn);
}

/** Run fn and collect all lifecycle hooks registered during execution. */
export function collectLifecycleHooks(fn: () => void): LifecycleHooks {
  const hooks: LifecycleHooks = { mounts: [], unmounts: [] };
  const prev = currentHooks;
  currentHooks = hooks;
  try {
    fn();
  } finally {
    currentHooks = prev;
  }
  return hooks;
}
