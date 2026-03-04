// Component — Custom Element definition for su framework.
//
// Defines components as Custom Elements with reactive props.
// In Node.js (tests), provides a testable abstraction.
// In browser, registers with customElements.define().

import { Atom, atom, cljToJs, jsToClj, keyword as kw, assoc, isHashMap } from '@clojurewasm/kiso/runtime';
import { renderHiccup } from './hiccup.js';
import { collectLifecycleHooks, type LifecycleHooks } from './lifecycle.js';
import { initReactiveTracking } from './reactive.js';

// Auto-init reactive tracking (idempotent)
initReactiveTracking();

export type ComponentConfig = {
  observedAttrs: string[];
  propTypes: Record<string, string>;
  richProps?: string[];
  formAssociated?: boolean;
  delegatesFocus?: boolean;
  styles?: unknown[];
};

type RenderFn = (propsAtom: Atom) => unknown;

export type ComponentDef = {
  tagName: string;
  observedAttrs: string[];
  richProps: string[];
  formAssociated: boolean;
  delegatesFocus: boolean;
  styles: unknown[];
  createInstance: (initialProps: Record<string, unknown>) => ComponentInstance;
};

export type ComponentInstance = {
  propsAtom: Atom;
  mount: (container?: Node) => void;
  unmount: () => void;
  setAttr: (name: string, value: string | null) => void;
  setProp: (name: string, value: unknown) => void;
};

function deserializeAttr(value: string | null, type: string): unknown {
  if (value === null) return null;
  switch (type) {
    case 'number': return Number(value);
    case 'boolean': return value !== 'false' && value !== '0';
    default: return value;
  }
}

/** Normalize config — handles both plain JS objects and Kiso types from compiled CLJS. */
function normalizeConfig(raw: unknown): ComponentConfig {
  const config = cljToJs(raw) as Record<string, unknown>;
  // Support both camelCase (JS) and kebab-case (compiled CLJS) keys
  const observedAttrs = (config.observedAttrs ?? config['observed-attrs'] ?? []) as string[];
  const propTypes = (config.propTypes ?? config['prop-types'] ?? {}) as Record<string, string>;
  const formAssociated = (config.formAssociated ?? config['form-associated'] ?? false) as boolean;
  const delegatesFocus = (config.delegatesFocus ?? config['delegates-focus'] ?? false) as boolean;
  const richProps = (config.richProps ?? config['rich-props'] ?? []) as string[];
  const styles = (config.styles ?? []) as unknown[];
  return { observedAttrs, propTypes, richProps, formAssociated, delegatesFocus, styles };
}

/** Define a component. Returns a definition that can create instances. */
export function defineComponent(
  tagName: string,
  rawConfig: ComponentConfig | unknown,
  renderFn: RenderFn,
): ComponentDef {
  if (!tagName.includes('-')) {
    throw new Error(`Custom Element names require a hyphen: "${tagName}"`);
  }

  const config = normalizeConfig(rawConfig);

  const def: ComponentDef = {
    tagName,
    observedAttrs: config.observedAttrs,
    richProps: config.richProps ?? [],
    formAssociated: config.formAssociated ?? false,
    delegatesFocus: config.delegatesFocus ?? false,
    styles: config.styles ?? [],
    createInstance(initialProps: Record<string, unknown>): ComponentInstance {
      const propsAtom = atom(initialProps);
      let mounted = false;
      let hooks: LifecycleHooks | null = null;

      return {
        propsAtom,
        mount(container?: Node) {
          if (mounted) return;
          mounted = true;

          if (container) {
            // Browser path: render hiccup to DOM, collect lifecycle hooks
            hooks = collectLifecycleHooks(() => {
              const hiccup = cljToJs(renderFn(propsAtom));
              const dom = renderHiccup(hiccup as Parameters<typeof renderHiccup>[0]);
              container.appendChild(dom);
            });
            for (const fn of hooks.mounts) fn();
          } else {
            // Test path: just call renderFn
            renderFn(propsAtom);
          }
        },
        unmount() {
          if (hooks) {
            for (const fn of hooks.unmounts) fn();
            hooks = null;
          }
          mounted = false;
        },
        setAttr(name: string, value: string | null) {
          const typed = deserializeAttr(value, config.propTypes[name] ?? 'string');
          const current = propsAtom.deref();
          if (isHashMap(current)) {
            propsAtom.reset(assoc(current, kw(name), typed));
          } else {
            propsAtom.reset({ ...(current as Record<string, unknown>), [name]: typed });
          }
        },
        setProp(name: string, value: unknown) {
          const current = propsAtom.deref();
          if (isHashMap(current)) {
            propsAtom.reset(assoc(current, kw(name), value));
          } else {
            propsAtom.reset({ ...(current as Record<string, unknown>), [name]: value });
          }
        },
      };
    },
  };

  // Auto-register as Custom Element in browser
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    registerComponent(def, config, renderFn);
  }

  return def;
}

// -- Browser registration --

/** Register a component as a Custom Element (browser only). */
export function registerComponent(def: ComponentDef, config: ComponentConfig, _renderFn: RenderFn): void {
  if (typeof customElements === 'undefined') return; // Skip in Node.js

  class SuComponent extends HTMLElement {
    static observedAttributes = def.observedAttrs;
    static formAssociated = def.formAssociated;
    private _instance: ComponentInstance | null = null;
    _internals: ElementInternals | null = null;
    private _pendingProps: Map<string, unknown> | null = null;

    connectedCallback() {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open', delegatesFocus: def.delegatesFocus });
      if (def.formAssociated) {
        this._internals = this.attachInternals();
      }
      const sheets = def.styles.filter(Boolean) as CSSStyleSheet[];
      if (sheets.length > 0) {
        shadow.adoptedStyleSheets = [...sheets];
      }
      const initialProps: Record<string, unknown> = {};
      for (const attr of def.observedAttrs) {
        initialProps[attr] = deserializeAttr(
          this.getAttribute(attr),
          config.propTypes[attr] ?? 'string',
        );
      }
      // Merge any pre-set JS properties (set before connection)
      if (this._pendingProps) {
        for (const [k, v] of this._pendingProps) {
          initialProps[k] = v;
        }
        this._pendingProps = null;
      }
      // Convert to Kiso HashMap with keyword keys for compiled CLJS access
      this._instance = def.createInstance(jsToClj(initialProps) as Record<string, unknown>);
      this._instance.mount(shadow);
    }

    attributeChangedCallback(name: string, _old: string | null, val: string | null) {
      this._instance?.setAttr(name, val);
    }

    disconnectedCallback() {
      this._instance?.unmount();
      this._instance = null;
    }
  }

  // Define property setters for rich props on the prototype
  for (const prop of def.richProps) {
    Object.defineProperty(SuComponent.prototype, prop, {
      set(val: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const self = this as any;
        if (self._instance) {
          self._instance.setProp(prop, val);
        } else {
          if (!self._pendingProps) self._pendingProps = new Map();
          self._pendingProps.set(prop, val);
        }
      },
      get() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const self = this as any;
        if (self._instance) {
          const current = self._instance.propsAtom.deref();
          if (isHashMap(current)) {
            return (current as { get(k: unknown): unknown }).get(kw(prop));
          }
          return (current as Record<string, unknown>)[prop];
        }
        return self._pendingProps?.get(prop);
      },
      configurable: true,
    });
  }

  customElements.define(def.tagName, SuComponent);
}

// -- Standalone mount --

/** Mount hiccup to a container element. Returns a cleanup function. */
export function mount(container: Element, hiccup: unknown): () => void {
  const converted = cljToJs(hiccup);
  let hooks: LifecycleHooks | null = null;

  hooks = collectLifecycleHooks(() => {
    const dom = renderHiccup(converted as Parameters<typeof renderHiccup>[0]);
    container.appendChild(dom);
  });
  for (const fn of hooks.mounts) fn();

  return () => {
    if (hooks) {
      for (const fn of hooks.unmounts) fn();
      hooks = null;
    }
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };
}
