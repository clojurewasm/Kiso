import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTag, renderHiccup } from '../src/hiccup.js';

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
});

// -- Minimal DOM mock for renderHiccup tests --

type MockNode = {
  type: 'element' | 'text' | 'comment';
  tag?: string;
  text?: string;
  id?: string;
  className?: string;
  attrs: Record<string, string>;
  style: Record<string, string> & { setProperty?(prop: string, val: string): void };
  children: MockNode[];
  listeners: Record<string, unknown>;
  parentNode: MockNode | null;
  nextSibling: MockNode | null;
  appendChild(child: MockNode): void;
  insertBefore(newChild: MockNode, ref: MockNode | null): void;
  replaceChild(newChild: MockNode, oldChild: MockNode): void;
  setAttribute(name: string, value: string): void;
  addEventListener(event: string, fn: unknown): void;
};

function createMockElement(tag: string): MockNode {
  const styleObj = {} as Record<string, string> & { setProperty(prop: string, val: string): void };
  styleObj.setProperty = function(prop: string, val: string) { styleObj[prop] = val; };
  const node: MockNode = {
    type: 'element',
    tag,
    id: undefined,
    className: undefined,
    attrs: {},
    style: styleObj,
    children: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild(child: MockNode) {
      child.parentNode = node;
      if (node.children.length > 0) {
        node.children[node.children.length - 1].nextSibling = child;
      }
      node.children.push(child);
    },
    insertBefore(newChild: MockNode, ref: MockNode | null) {
      newChild.parentNode = node;
      if (ref === null) {
        node.children.push(newChild);
      } else {
        const idx = node.children.indexOf(ref);
        node.children.splice(idx, 0, newChild);
      }
    },
    replaceChild(newChild: MockNode, oldChild: MockNode) {
      const idx = node.children.indexOf(oldChild);
      if (idx >= 0) {
        node.children[idx] = newChild;
        newChild.parentNode = node;
        oldChild.parentNode = null;
      }
    },
    setAttribute(name: string, value: string) {
      node.attrs[name] = value;
    },
    addEventListener(event: string, fn: unknown) {
      node.listeners[event] = fn;
    },
  };
  return node;
}

function createMockTextNode(text: string): MockNode {
  return {
    type: 'text',
    text,
    attrs: {},
    style: {},
    children: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild() { /* noop */ },
    insertBefore() { /* noop */ },
    replaceChild() { /* noop */ },
    setAttribute() { /* noop */ },
    addEventListener() { /* noop */ },
  };
}

function createMockComment(text: string): MockNode {
  return {
    type: 'comment',
    text,
    attrs: {},
    style: {},
    children: [],
    listeners: {},
    parentNode: null,
    nextSibling: null,
    appendChild() { /* noop */ },
    insertBefore() { /* noop */ },
    replaceChild() { /* noop */ },
    setAttribute() { /* noop */ },
    addEventListener() { /* noop */ },
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
});
