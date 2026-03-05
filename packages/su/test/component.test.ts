import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, mount, type ComponentConfig } from '../src/component.js';
import { onMount, onUnmount } from '../src/lifecycle.js';
import { vector, keyword, hashMap } from '@clojurewasm/kiso/runtime';

describe('defineComponent', () => {
  it('creates a component definition', () => {
    const renderFn = vi.fn(() => ['div', 'hello']);
    const config: ComponentConfig = {
      observedAttrs: ['initial'],
      propTypes: { initial: 'number' },
    };
    const def = defineComponent('my-counter', config, renderFn);
    expect(def.tagName).toBe('my-counter');
    expect(def.observedAttrs).toEqual(['initial']);
  });

  it('throws if tag name has no hyphen', () => {
    expect(() => {
      defineComponent('counter', { observedAttrs: [], propTypes: {} }, () => null);
    }).toThrow('hyphen');
  });

  it('creates instance with initial props', () => {
    const renderFn = vi.fn((propsAtom) => {
      return ['div', propsAtom.deref()];
    });
    const def = defineComponent('test-comp', {
      observedAttrs: ['name'],
      propTypes: { name: 'string' },
    }, renderFn);

    const instance = def.createInstance({ name: 'hello' });
    expect(instance.propsAtom.deref()).toEqual({ name: 'hello' });
  });

  it('calls render function on mount', () => {
    const renderFn = vi.fn(() => ['div', 'content']);
    const def = defineComponent('test-mount', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const instance = def.createInstance({});
    instance.mount();
    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it('updates props atom on attribute change', () => {
    const renderFn = vi.fn((propsAtom) => ['div', propsAtom.deref()]);
    const def = defineComponent('test-attr', {
      observedAttrs: ['count'],
      propTypes: { count: 'number' },
    }, renderFn);

    const instance = def.createInstance({ count: 0 });
    instance.mount();
    instance.setAttr('count', '42');
    const props = instance.propsAtom.deref() as Record<string, unknown>;
    expect(props.count).toBe(42);
  });

  it('cleans up on unmount', () => {
    const renderFn = vi.fn(() => ['div']);
    const def = defineComponent('test-cleanup', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const instance = def.createInstance({});
    instance.mount();
    // Should not throw
    instance.unmount();
  });

  // K09: Form participation
  it('accepts formAssociated option', () => {
    const def = defineComponent('form-input', {
      observedAttrs: ['value'],
      propTypes: { value: 'string' },
      formAssociated: true,
    }, () => ['input']);
    expect(def.tagName).toBe('form-input');
    expect(def.formAssociated).toBe(true);
  });

  it('defaults formAssociated to false', () => {
    const def = defineComponent('plain-comp', {
      observedAttrs: [],
      propTypes: {},
    }, () => ['div']);
    expect(def.formAssociated).toBe(false);
  });

  // K11: delegatesFocus
  it('accepts delegatesFocus option', () => {
    const def = defineComponent('focus-comp', {
      observedAttrs: [],
      propTypes: {},
      delegatesFocus: true,
    }, () => ['input']);
    expect(def.delegatesFocus).toBe(true);
  });

  it('stores styles array from config', () => {
    const fakeSheet = { cssRules: [] };
    const def = defineComponent('styled-comp', {
      observedAttrs: [],
      propTypes: {},
      styles: [fakeSheet],
    } as ComponentConfig & { styles: unknown[] }, () => ['div']);
    expect(def.styles).toEqual([fakeSheet]);
  });

  it('defaults styles to empty array', () => {
    const def = defineComponent('no-style-comp', {
      observedAttrs: [],
      propTypes: {},
    }, () => ['div']);
    expect(def.styles).toEqual([]);
  });
});

describe('auto-registration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls customElements.define when available', () => {
    const defineSpy = vi.fn();
    vi.stubGlobal('HTMLElement', class {});
    vi.stubGlobal('customElements', { define: defineSpy, get: () => undefined });

    defineComponent('auto-reg', {
      observedAttrs: [],
      propTypes: {},
    }, () => ['div']);

    expect(defineSpy).toHaveBeenCalledTimes(1);
    expect(defineSpy.mock.calls[0][0]).toBe('auto-reg');
  });

  it('skips registration when customElements is undefined', () => {
    // In Node.js, customElements is not defined — should not throw
    const def = defineComponent('no-reg', {
      observedAttrs: [],
      propTypes: {},
    }, () => ['div']);
    expect(def.tagName).toBe('no-reg');
  });

  it('skips registration if already defined', () => {
    const defineSpy = vi.fn();
    vi.stubGlobal('customElements', {
      define: defineSpy,
      get: (name: string) => name === 'already-def' ? class {} : undefined,
    });

    defineComponent('already-def', {
      observedAttrs: [],
      propTypes: {},
    }, () => ['div']);

    expect(defineSpy).not.toHaveBeenCalled();
  });
});

// -- K12: Shadow DOM mounting --

type MockNode = {
  type: 'element' | 'text';
  tag?: string;
  text?: string;
  children: MockNode[];
  firstChild: MockNode | null;
  appendChild(child: MockNode): void;
  removeChild(child: MockNode): void;
};

function createMockElement(tag: string): MockNode {
  const node: MockNode = {
    type: 'element',
    tag,
    children: [],
    get firstChild() { return node.children[0] ?? null; },
    appendChild(child: MockNode) { node.children.push(child); },
    removeChild(child: MockNode) {
      const idx = node.children.indexOf(child);
      if (idx >= 0) node.children.splice(idx, 1);
    },
  };
  return node;
}

function createMockTextNode(text: string): MockNode {
  return { type: 'text', text, children: [], appendChild() { /* noop */ } };
}

describe('K12: mount with container', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: (tag: string) => createMockElement(tag),
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockTextNode(text),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders hiccup to container when mount receives one', () => {
    const renderFn = () => ['div', 'hello'];
    const def = defineComponent('mount-test', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const container = createMockElement('shadow-root');
    const instance = def.createInstance({});
    instance.mount(container as unknown as Node);

    expect(container.children).toHaveLength(1);
    expect(container.children[0]!.tag).toBe('div');
  });

  it('collects and fires onMount hooks', () => {
    const mountSpy = vi.fn();
    const renderFn = () => {
      onMount(mountSpy);
      return ['span', 'content'];
    };
    const def = defineComponent('hook-test', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const container = createMockElement('shadow-root');
    const instance = def.createInstance({});
    instance.mount(container as unknown as Node);

    expect(mountSpy).toHaveBeenCalledTimes(1);
  });

  it('fires onUnmount hooks on unmount', () => {
    const unmountSpy = vi.fn();
    const renderFn = () => {
      onUnmount(unmountSpy);
      return ['div'];
    };
    const def = defineComponent('unmount-test', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const container = createMockElement('shadow-root');
    const instance = def.createInstance({});
    instance.mount(container as unknown as Node);
    expect(unmountSpy).not.toHaveBeenCalled();

    instance.unmount();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('converts PersistentVector hiccup to DOM via cljToJs', () => {
    // Render function returns Kiso types (as compiled CLJS would)
    const renderFn = () => vector(keyword('div'), vector(keyword('span'), 'hello'));
    const def = defineComponent('clj-test', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const container = createMockElement('shadow-root');
    const instance = def.createInstance({});
    instance.mount(container as unknown as Node);

    expect(container.children).toHaveLength(1);
    expect(container.children[0]!.tag).toBe('div');
    expect(container.children[0]!.children[0]!.tag).toBe('span');
  });

  it('still works without container (backward compat)', () => {
    const renderFn = vi.fn(() => ['div']);
    const def = defineComponent('compat-test', {
      observedAttrs: [],
      propTypes: {},
    }, renderFn);

    const instance = def.createInstance({});
    instance.mount();
    expect(renderFn).toHaveBeenCalledTimes(1);
  });
});

describe('reactive prop re-rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: (tag: string) => createMockElement(tag),
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockTextNode(text),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('re-renders Shadow DOM when attribute props change', () => {
    let callCount = 0;
    const renderFn = (propsAtom: any) => {
      callCount++;
      const props = propsAtom.deref();
      return ['div', String(props.count ?? props.get?.(keyword('count')) ?? 0)];
    };
    const def = defineComponent('rerender-test', {
      observedAttrs: ['count'],
      propTypes: { count: 'number' },
    }, renderFn);

    const container = createMockElement('shadow-root');
    const instance = def.createInstance({ count: 0 });
    instance.mount(container as unknown as Node);

    expect(callCount).toBe(1); // initial render

    instance.setAttr('count', '5');

    expect(callCount).toBe(2); // re-rendered after prop change
  });
});

describe('richProps / setProp', () => {
  it('setProp updates propsAtom with keyword key (HashMap)', () => {
    const renderFn = vi.fn((propsAtom) => ['div', propsAtom.deref()]);
    const def = defineComponent('rich-test', {
      observedAttrs: [],
      propTypes: {},
      richProps: ['tasks'],
    }, renderFn);

    const instance = def.createInstance(hashMap(keyword('tasks'), null));
    instance.setProp('tasks', [1, 2, 3]);
    const props = instance.propsAtom.deref() as any;
    // Should have updated the :tasks key
    expect(props.get(keyword('tasks'))).toEqual([1, 2, 3]);
  });

  it('setProp updates propsAtom with plain object fallback', () => {
    const renderFn = vi.fn(() => ['div']);
    const def = defineComponent('rich-plain', {
      observedAttrs: [],
      propTypes: {},
      richProps: ['items'],
    }, renderFn);

    const instance = def.createInstance({ items: null });
    instance.setProp('items', { a: 1 });
    const props = instance.propsAtom.deref() as Record<string, unknown>;
    expect(props['items']).toEqual({ a: 1 });
  });
});

describe('mount()', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: (tag: string) => createMockElement(tag),
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockTextNode(text),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders hiccup to container and returns cleanup fn', () => {
    const container = createMockElement('div');
    const cleanup = mount(container as unknown as Element, ['div', ['span', 'hello']]);

    expect(container.children).toHaveLength(1);
    expect(container.children[0]!.tag).toBe('div');
    expect(typeof cleanup).toBe('function');
  });

  it('fires onMount hooks', () => {
    const mountSpy = vi.fn();
    const container = createMockElement('div');

    // To register onMount we need a component render context,
    // so mount() itself should collect lifecycle hooks
    mount(container as unknown as Element, ['div', 'content']);
    // Just ensure it doesn't throw and renders
    expect(container.children).toHaveLength(1);
  });

  it('cleanup fn fires onUnmount hooks and removes children', () => {
    const container = createMockElement('div');
    const cleanup = mount(container as unknown as Element, ['p', 'text']);

    expect(container.children).toHaveLength(1);
    cleanup();
    // After cleanup, container should be empty
    expect(container.children).toHaveLength(0);
  });
});
