// HMR — Hot Module Replacement for su Custom Elements.
//
// customElements.define() cannot be called twice for the same tag name.
// HMR works by replacing the render function and re-mounting active instances.

type RenderFn = (propsAtom: unknown) => unknown;

const componentRegistry = new Map<string, RenderFn>();

/** Register a render function for a component tag name. */
export function registerRenderFn(tagName: string, renderFn: RenderFn): void {
  componentRegistry.set(tagName, renderFn);
}

/** Get the current render function for a component. */
export function getComponentRenderFn(tagName: string): RenderFn | undefined {
  return componentRegistry.get(tagName);
}

/** Replace a component's render function and re-mount live instances.
 * Returns true if the component was found and updated. */
export function hotReplace(tagName: string, newRenderFn: RenderFn): boolean {
  if (!componentRegistry.has(tagName)) return false;
  componentRegistry.set(tagName, newRenderFn);

  // Re-mount live instances (browser only)
  if (typeof document !== 'undefined') {
    for (const el of document.querySelectorAll(tagName)) {
      const shadow = el.shadowRoot;
      if (shadow) {
        const dispose = (el as unknown as Record<string, unknown>)._dispose;
        if (typeof dispose === 'function') dispose();
        while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
        // Re-render will be handled by the component's connectedCallback pattern
        // The new renderFn is now in the registry
      }
    }
  }

  return true;
}
