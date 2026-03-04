import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, type ComponentConfig } from '../src/component.js';
import { onMount, onUnmount } from '../src/lifecycle.js';

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
});

// -- K12: Shadow DOM mounting --

type MockNode = {
  type: 'element' | 'text';
  tag?: string;
  text?: string;
  children: MockNode[];
  appendChild(child: MockNode): void;
};

function createMockElement(tag: string): MockNode {
  const node: MockNode = {
    type: 'element',
    tag,
    children: [],
    appendChild(child: MockNode) { node.children.push(child); },
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
