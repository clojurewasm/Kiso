// Component — Custom Element definition for su framework.
//
// Defines components as Custom Elements with reactive props.
// In Node.js (tests), provides a testable abstraction.
// In browser, registers with customElements.define().

import { Atom, atom } from '@kiso/cljs/runtime';
import { renderHiccup } from './hiccup.js';
import { collectLifecycleHooks, type LifecycleHooks } from './lifecycle.js';

export type ComponentConfig = {
  observedAttrs: string[];
  propTypes: Record<string, string>;
  formAssociated?: boolean;
  delegatesFocus?: boolean;
};

type RenderFn = (propsAtom: Atom) => unknown;

export type ComponentDef = {
  tagName: string;
  observedAttrs: string[];
  formAssociated: boolean;
  delegatesFocus: boolean;
  createInstance: (initialProps: Record<string, unknown>) => ComponentInstance;
};

export type ComponentInstance = {
  propsAtom: Atom;
  mount: (container?: Node) => void;
  unmount: () => void;
  setAttr: (name: string, value: string | null) => void;
};

function deserializeAttr(value: string | null, type: string): unknown {
  if (value === null) return null;
  switch (type) {
    case 'number': return Number(value);
    case 'boolean': return value !== 'false' && value !== '0';
    default: return value;
  }
}

/** Define a component. Returns a definition that can create instances. */
export function defineComponent(
  tagName: string,
  config: ComponentConfig,
  renderFn: RenderFn,
): ComponentDef {
  if (!tagName.includes('-')) {
    throw new Error(`Custom Element names require a hyphen: "${tagName}"`);
  }

  return {
    tagName,
    observedAttrs: config.observedAttrs,
    formAssociated: config.formAssociated ?? false,
    delegatesFocus: config.delegatesFocus ?? false,
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
              const hiccup = renderFn(propsAtom);
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
          const current = propsAtom.deref() as Record<string, unknown>;
          propsAtom.reset({ ...current, [name]: typed });
        },
      };
    },
  };
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

    connectedCallback() {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open', delegatesFocus: def.delegatesFocus });
      if (def.formAssociated) {
        this._internals = this.attachInternals();
      }
      const initialProps: Record<string, unknown> = {};
      for (const attr of def.observedAttrs) {
        initialProps[attr] = deserializeAttr(
          this.getAttribute(attr),
          config.propTypes[attr] ?? 'string',
        );
      }
      this._instance = def.createInstance(initialProps);
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

  customElements.define(def.tagName, SuComponent);
}
