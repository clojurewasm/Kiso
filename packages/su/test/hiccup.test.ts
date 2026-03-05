import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTag, renderHiccup, patchNode } from '../src/hiccup.js';
import { Atom } from '../../kiso/src/runtime/atom.js';
import { initReactiveTracking } from '../src/reactive.js';

describe('parseTag', () => {
  it('parses plain tag', () => {
    expect(parseTag('div')).toEqual({ tag: 'div', id: null, classes: [] });
  });

  it('parses tag with id', () => {
    expect(parseTag('div#app')).toEqual({ tag: 'div', id: 'app', classes: [] });
  });

  it('parses tag with classes', () => {
    expect(parseTag('div.main.dark')).toEqual({ tag: 'div', id: null, classes: ['main', 'dark'] });
  });

  it('parses tag with id and classes', () => {
    expect(parseTag('div#app.main.dark')).toEqual({
      tag: 'div', id: 'app', classes: ['main', 'dark'],
    });
  });

  it('defaults to div when only id', () => {
    expect(parseTag('#app')).toEqual({ tag: 'div', id: 'app', classes: [] });
  });

  it('defaults to div when only classes', () => {
    expect(parseTag('.main.dark')).toEqual({ tag: 'div', id: null, classes: ['main', 'dark'] });
  });

  it('strips namespace prefix from tag', () => {
    expect(parseTag('task-manager.core/stat-card')).toEqual({
      tag: 'stat-card', id: null, classes: [],
    });
  });

  it('strips namespace prefix with id and classes', () => {
    expect(parseTag('my.ns/widget#main.active')).toEqual({
      tag: 'widget', id: 'main', classes: ['active'],
    });
  });

  it('keeps plain tags without slash unchanged', () => {
    expect(parseTag('my-component')).toEqual({
      tag: 'my-component', id: null, classes: [],
    });
  });
});

// -- Minimal DOM mock for renderHiccup tests --

type MockNode = {
  type: 'element' | 'text' | 'comment';
  nodeType: number;
  tag?: string;
  tagName?: string;
  text?: string;
  data?: string;
  id?: string;
  className?: string;
  attrs: Record<string, string>;
  style: Record<string, string> & { setProperty?(prop: string, val: string): void; removeProperty?(prop: string): void };
  children: MockNode[];
  childNodes: MockNode[];
  listeners: Record<string, unknown>;
  parentNode: MockNode | null;
  nextSibling: MockNode | null;
  appendChild(child: MockNode): void;
  insertBefore(newChild: MockNode, ref: MockNode | null): void;
  replaceChild(newChild: MockNode, oldChild: MockNode): void;
  removeChild(child: MockNode): void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  addEventListener(event: string, fn: unknown): void;
  removeEventListener(event: string, fn: unknown): void;
};

function createMockElement(tag: string): MockNode {
  const styleObj = {} as Record<string, string> & { setProperty(prop: string, val: string): void; removeProperty(prop: string): void };
  styleObj.setProperty = function(prop: string, val: string) { styleObj[prop] = val; };
  styleObj.removeProperty = function(prop: string) { delete styleObj[prop]; };
  const node: MockNode = {
    type: 'element',
    nodeType: 1,
    tag,
    tagName: tag.toUpperCase(),
    id: undefined,
    className: undefined,
    attrs: {},
    style: styleObj,
    children: [],
    childNodes: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild(child: MockNode) {
      child.parentNode = node;
      if (node.children.length > 0) {
        node.children[node.children.length - 1].nextSibling = child;
      }
      node.children.push(child);
      node.childNodes = node.children;
    },
    insertBefore(newChild: MockNode, ref: MockNode | null) {
      newChild.parentNode = node;
      if (ref === null) {
        node.children.push(newChild);
      } else {
        const idx = node.children.indexOf(ref);
        node.children.splice(idx, 0, newChild);
      }
      node.childNodes = node.children;
    },
    replaceChild(newChild: MockNode, oldChild: MockNode) {
      const idx = node.children.indexOf(oldChild);
      if (idx >= 0) {
        node.children[idx] = newChild;
        newChild.parentNode = node;
        oldChild.parentNode = null;
      }
    },
    removeChild(child: MockNode) {
      const idx = node.children.indexOf(child);
      if (idx >= 0) {
        node.children.splice(idx, 1);
        child.parentNode = null;
      }
      node.childNodes = node.children;
    },
    setAttribute(name: string, value: string) {
      node.attrs[name] = value;
    },
    removeAttribute(name: string) {
      delete node.attrs[name];
    },
    addEventListener(event: string, fn: unknown) {
      node.listeners[event] = fn;
    },
    removeEventListener(event: string, _fn: unknown) {
      delete node.listeners[event];
    },
  };
  node.childNodes = node.children;
  return node;
}

function createMockTextNode(text: string): MockNode {
  return {
    type: 'text',
    nodeType: 3,
    text,
    data: text,
    attrs: {},
    style: {},
    children: [],
    childNodes: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild() { /* noop */ },
    insertBefore() { /* noop */ },
    replaceChild() { /* noop */ },
    removeChild() { /* noop */ },
    setAttribute() { /* noop */ },
    removeAttribute() { /* noop */ },
    addEventListener() { /* noop */ },
    removeEventListener() { /* noop */ },
  };
}

function createMockComment(text: string): MockNode {
  return {
    type: 'comment',
    nodeType: 8,
    text,
    data: text,
    attrs: {},
    style: {},
    children: [],
    childNodes: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild() { /* noop */ },
    insertBefore() { /* noop */ },
    replaceChild() { /* noop */ },
    removeChild() { /* noop */ },
    setAttribute() { /* noop */ },
    removeAttribute() { /* noop */ },
    addEventListener() { /* noop */ },
    removeEventListener() { /* noop */ },
  };
}

describe('renderHiccup', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: (tag: string) => createMockElement(tag),
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockComment(text),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a string as text node', () => {
    const node = renderHiccup('hello') as unknown as MockNode;
    expect(node.type).toBe('text');
    expect(node.text).toBe('hello');
  });

  it('renders a number as text node', () => {
    const node = renderHiccup(42) as unknown as MockNode;
    expect(node.type).toBe('text');
    expect(node.text).toBe('42');
  });

  it('renders null as comment node', () => {
    const node = renderHiccup(null) as unknown as MockNode;
    expect(node.type).toBe('comment');
  });

  it('renders simple element', () => {
    const node = renderHiccup(['div']) as unknown as MockNode;
    expect(node.type).toBe('element');
    expect(node.tag).toBe('div');
  });

  it('renders element with text child', () => {
    const node = renderHiccup(['p', 'hello']) as unknown as MockNode;
    expect(node.tag).toBe('p');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].text).toBe('hello');
  });

  it('renders element with id and classes from tag', () => {
    const node = renderHiccup(['div#app.main']) as unknown as MockNode;
    expect(node.tag).toBe('div');
    expect(node.id).toBe('app');
    expect(node.className).toBe('main');
  });

  it('renders element with attrs map', () => {
    const node = renderHiccup(['input', { type: 'text', placeholder: 'name' }]) as unknown as MockNode;
    expect(node.tag).toBe('input');
    expect(node.attrs['type']).toBe('text');
    expect(node.attrs['placeholder']).toBe('name');
  });

  it('renders element with class attr merged', () => {
    const node = renderHiccup(['div.base', { class: 'extra' }]) as unknown as MockNode;
    expect(node.className).toBe('base extra');
  });

  it('renders element with style map', () => {
    const node = renderHiccup(['div', { style: { color: 'red', fontSize: '14px' } }]) as unknown as MockNode;
    expect(node.style['color']).toBe('red');
    expect(node.style['fontSize']).toBe('14px');
  });

  it('renders element with event listener', () => {
    const handler = vi.fn();
    const node = renderHiccup(['button', { 'on-click': handler }, 'Click']) as unknown as MockNode;
    expect(node.listeners['click']).toBe(handler);
    expect(node.children[0].text).toBe('Click');
  });

  it('renders nested elements', () => {
    const node = renderHiccup(
      ['div', ['span', 'inner']]
    ) as unknown as MockNode;
    expect(node.tag).toBe('div');
    expect(node.children).toHaveLength(1);
    expect(node.children[0].tag).toBe('span');
    expect(node.children[0].children[0].text).toBe('inner');
  });

  it('skips null children', () => {
    const node = renderHiccup(['div', null, 'text', null]) as unknown as MockNode;
    expect(node.children).toHaveLength(1);
    expect(node.children[0].text).toBe('text');
  });

  it('renders multiple children', () => {
    const node = renderHiccup(['ul',
      ['li', 'a'],
      ['li', 'b'],
      ['li', 'c'],
    ]) as unknown as MockNode;
    expect(node.children).toHaveLength(3);
    expect(node.children[0].children[0].text).toBe('a');
    expect(node.children[2].children[0].text).toBe('c');
  });

  // K10: part attribute for external styling
  it('sets part attribute', () => {
    const node = renderHiccup(['button', { part: 'btn' }, 'Click']) as unknown as MockNode;
    expect(node.attrs['part']).toBe('btn');
  });

  // K10: CSS custom properties in style
  it('sets CSS custom properties via style map', () => {
    const node = renderHiccup(['div', { style: { '--su-color': 'red', color: 'var(--su-color)' } }]) as unknown as MockNode;
    expect(node.style['--su-color']).toBe('red');
    expect(node.style['color']).toBe('var(--su-color)');
  });

  it('sets non-primitive attr as JS property on custom elements', () => {
    const node = renderHiccup(['my-widget', { tasks: { items: [1, 2] } }]) as unknown as MockNode;
    expect(node.attrs['tasks']).toBeUndefined();
    expect((node as any).tasks).toEqual({ items: [1, 2] });
  });

  it('still uses setAttribute for primitives on custom elements', () => {
    const node = renderHiccup(['my-widget', { title: 'hello' }]) as unknown as MockNode;
    expect(node.attrs['title']).toBe('hello');
  });

  it('still uses setAttribute for objects on standard elements', () => {
    const node = renderHiccup(['div', { data: { x: 1 } }]) as unknown as MockNode;
    expect(node.attrs['data']).toBe('[object Object]');
  });

  it('reactive :class fn sets class and updates on atom change', () => {
    initReactiveTracking();
    const active = new Atom(false);
    const classFn = () => active.deref() ? 'on' : 'off';
    const node = renderHiccup(['div', { class: classFn }]) as unknown as MockNode;
    expect(node.className).toBe('off');

    active.reset(true);
    expect(node.className).toBe('on');
  });

  it('reactive :style fn sets style and updates on atom change', () => {
    initReactiveTracking();
    const color = new Atom('red');
    const styleFn = () => ({ color: color.deref() as string });
    const node = renderHiccup(['div', { style: styleFn }]) as unknown as MockNode;
    expect(node.style['color']).toBe('red');

    color.reset('blue');
    expect(node.style['color']).toBe('blue');
  });

  it('handles kebab-case style properties via setProperty', () => {
    const setPropertySpy = vi.fn();
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        const el = createMockElement(tag);
        el.style = { setProperty: setPropertySpy } as any;
        return el;
      },
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockComment(text),
    });

    renderHiccup(['div', { style: { 'font-size': '14px', 'background-color': '#fff' } }]);
    expect(setPropertySpy).toHaveBeenCalledWith('font-size', '14px');
    expect(setPropertySpy).toHaveBeenCalledWith('background-color', '#fff');
  });
  it('sets innerHTML via inner-html attr', () => {
    const node = renderHiccup(['div', { 'inner-html': '<b>bold</b>' }]) as unknown as MockNode;
    expect((node as any).innerHTML).toBe('<b>bold</b>');
  });
});

describe('patchNode', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: (tag: string) => createMockElement(tag),
      createTextNode: (text: string) => createMockTextNode(text),
      createComment: (text: string) => createMockComment(text),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates text node data in-place', () => {
    const container = createMockElement('div');
    const text = renderHiccup('hello') as unknown as MockNode;
    container.appendChild(text);

    const result = patchNode(text as unknown as Node, 'world') as unknown as MockNode;
    expect(result).toBe(text); // same reference — reused
    expect(result.data).toBe('world');
  });

  it('replaces text node with element when types differ', () => {
    const container = createMockElement('div');
    const text = renderHiccup('hello') as unknown as MockNode;
    container.appendChild(text);

    const result = patchNode(text as unknown as Node, ['span', 'new']) as unknown as MockNode;
    expect(result).not.toBe(text);
    expect(result.tag).toBe('span');
    expect(container.children[0]).toBe(result);
  });

  it('reuses element with same tag and updates text child', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['p', 'old']) as unknown as MockNode;
    container.appendChild(el);
    const originalEl = el;

    const result = patchNode(el as unknown as Node, ['p', 'new']) as unknown as MockNode;
    expect(result).toBe(originalEl); // same element reused
    expect(result.children[0].data).toBe('new');
  });

  it('replaces element when tag differs', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['p', 'text']) as unknown as MockNode;
    container.appendChild(el);

    const result = patchNode(el as unknown as Node, ['span', 'text']) as unknown as MockNode;
    expect(result).not.toBe(el);
    expect(result.tag).toBe('span');
  });

  it('updates attributes on same-tag element', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['input', { type: 'text', placeholder: 'old' }]) as unknown as MockNode;
    container.appendChild(el);

    const result = patchNode(el as unknown as Node, ['input', { type: 'email', value: 'x' }]) as unknown as MockNode;
    expect(result).toBe(el); // reused
    expect(result.attrs['type']).toBe('email');
    expect(result.attrs['value']).toBe('x');
    expect(result.attrs['placeholder']).toBeUndefined(); // removed
  });

  it('preserves event handlers on reused element', () => {
    const container = createMockElement('div');
    const handler1 = vi.fn();
    const el = renderHiccup(['button', { 'on-click': handler1 }, 'Click']) as unknown as MockNode;
    container.appendChild(el);

    const handler2 = vi.fn();
    const result = patchNode(el as unknown as Node, ['button', { 'on-click': handler2 }, 'Click']) as unknown as MockNode;
    expect(result).toBe(el); // same button element
    expect(result.listeners['click']).toBe(handler2); // handler updated
  });

  it('removes excess children', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['ul', ['li', 'a'], ['li', 'b'], ['li', 'c']]) as unknown as MockNode;
    container.appendChild(el);

    patchNode(el as unknown as Node, ['ul', ['li', 'x']]);
    expect(el.children).toHaveLength(1);
    expect(el.children[0].children[0].data).toBe('x');
  });

  it('adds new children', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['ul', ['li', 'a']]) as unknown as MockNode;
    container.appendChild(el);

    patchNode(el as unknown as Node, ['ul', ['li', 'a'], ['li', 'b']]);
    expect(el.children).toHaveLength(2);
    expect(el.children[1].children[0].data).toBe('b');
  });

  it('patches nested elements recursively', () => {
    const container = createMockElement('div');
    const el = renderHiccup(['div', ['span', ['em', 'deep']]]) as unknown as MockNode;
    container.appendChild(el);
    const originalSpan = el.children[0];
    const originalEm = originalSpan.children[0];

    patchNode(el as unknown as Node, ['div', ['span', ['em', 'updated']]]);
    expect(el.children[0]).toBe(originalSpan); // span reused
    expect(el.children[0].children[0]).toBe(originalEm); // em reused
    expect(originalEm.children[0].data).toBe('updated');
  });
});
