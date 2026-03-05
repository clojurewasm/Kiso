// Hiccup — hiccup vector → DOM conversion for su framework.
//
// parseTag: split tag strings like "div#id.class1.class2"
// renderHiccup: convert hiccup vectors to DOM nodes (browser only)
// bind: reactive DOM fragment that re-renders on atom changes

import { cljToJs } from '@clojurewasm/kiso/runtime';
import { effect } from './reactive.js';

export type ParsedTag = {
  tag: string;
  id: string | null;
  classes: string[];
};

/** Parse a hiccup tag string into tag name, id, and classes. */
export function parseTag(s: string): ParsedTag {
  // Strip namespace prefix (e.g. "my.ns/widget" → "widget")
  const slashIdx = s.indexOf('/');
  if (slashIdx !== -1) {
    s = s.slice(slashIdx + 1);
  }

  let tag = '';
  let id: string | null = null;
  const classes: string[] = [];

  // Find positions of first # and first .
  const hashIdx = s.indexOf('#');
  const dotIdx = s.indexOf('.');

  // Determine where the tag name ends
  let tagEnd: number;
  if (hashIdx === -1 && dotIdx === -1) {
    tagEnd = s.length;
  } else if (hashIdx === -1) {
    tagEnd = dotIdx;
  } else if (dotIdx === -1) {
    tagEnd = hashIdx;
  } else {
    tagEnd = Math.min(hashIdx, dotIdx);
  }

  tag = s.slice(0, tagEnd) || 'div';

  // Parse the rest
  const rest = s.slice(tagEnd);
  if (rest) {
    // Split on # and . boundaries
    const parts = rest.split(/(?=[#.])/);
    for (const part of parts) {
      if (part.startsWith('#')) {
        id = part.slice(1);
      } else if (part.startsWith('.')) {
        classes.push(part.slice(1));
      }
    }
  }

  return { tag, id, classes };
}

// -- Attr tracking for patchNode --

const prevAttrsStore = new WeakMap<HTMLElement, Set<string>>();
const listenersStore = new WeakMap<HTMLElement, Map<string, EventListener>>();

// -- Hiccup types --

type HiccupVector = [string | unknown, ...unknown[]];
type HiccupNode = HiccupVector | string | number | null | undefined;

function isHiccupVector(x: unknown): x is HiccupVector {
  return Array.isArray(x) && x.length > 0 && typeof x[0] === 'string';
}

function isAttrsMap(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

// -- renderHiccup --

/** Convert a hiccup value to a DOM Node. Browser only. */
export function renderHiccup(hiccup: HiccupNode): Node {
  if (hiccup === null || hiccup === undefined) {
    return document.createComment('');
  }

  if (typeof hiccup === 'string') {
    return document.createTextNode(hiccup);
  }

  if (typeof hiccup === 'number') {
    return document.createTextNode(String(hiccup));
  }

  if (typeof hiccup === 'function') {
    return bind(hiccup as () => HiccupNode);
  }

  if (!isHiccupVector(hiccup)) {
    return document.createTextNode(String(hiccup));
  }

  const [rawTag, ...rest] = hiccup;
  const { tag, id, classes } = parseTag(rawTag as string);
  const el = document.createElement(tag);

  if (id) el.id = id;
  if (classes.length > 0) el.className = classes.join(' ');

  let childStart = 0;
  if (rest.length > 0 && isAttrsMap(rest[0])) {
    applyAttrs(el, rest[0], tag);
    childStart = 1;
  }

  for (let i = childStart; i < rest.length; i++) {
    const child = rest[i];
    if (child === null || child === undefined) continue;
    if (Array.isArray(child) && child.length > 0 && !isHiccupVector(child)) {
      // Sequence (from map/for) — flatten
      for (const item of child) {
        el.appendChild(renderHiccup(item as HiccupNode));
      }
    } else {
      el.appendChild(renderHiccup(child as HiccupNode));
    }
  }

  return el;
}

function applyAttrs(el: HTMLElement, attrs: Record<string, unknown>, tag: string): void {
  const keys = new Set<string>();
  const listeners = new Map<string, EventListener>();

  for (const [key, val] of Object.entries(attrs)) {
    keys.add(key);
    if (key === 'class') {
      if (typeof val === 'function') {
        const baseClass = el.className || '';
        effect(() => {
          const v = (val as () => unknown)();
          el.className = baseClass ? baseClass + ' ' + String(v) : String(v);
        });
      } else if (typeof val === 'string') {
        el.className = el.className ? el.className + ' ' + val : val;
      }
    } else if (key === 'style') {
      if (typeof val === 'function') {
        effect(() => {
          const styleMap = (val as () => unknown)() as Record<string, string>;
          if (styleMap && typeof styleMap === 'object') {
            for (const [prop, sval] of Object.entries(styleMap)) {
              el.style.setProperty(prop, sval);
            }
          }
        });
      } else if (typeof val === 'object' && val !== null) {
        for (const [prop, sval] of Object.entries(val as Record<string, string>)) {
          el.style.setProperty(prop, sval);
        }
      }
    } else if (key.startsWith('on-')) {
      if (tag.includes('-') && key in el) {
        (el as unknown as Record<string, unknown>)[key] = val;
      } else {
        const event = key.slice(3);
        el.addEventListener(event, val as EventListener);
        listeners.set(event, val as EventListener);
      }
    } else if (tag.includes('-') && typeof val === 'object' && val !== null) {
      (el as unknown as Record<string, unknown>)[key] = val;
    } else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readonly') {
      (el as unknown as Record<string, unknown>)[key] = !!val;
    } else {
      el.setAttribute(key, String(val));
    }
  }

  prevAttrsStore.set(el, keys);
  listenersStore.set(el, listeners);
}

// -- patchNode --

function flattenChildren(rest: unknown[]): HiccupNode[] {
  const result: HiccupNode[] = [];
  for (const child of rest) {
    if (child === null || child === undefined) continue;
    if (Array.isArray(child) && child.length > 0 && !isHiccupVector(child)) {
      for (const item of child) result.push(item as HiccupNode);
    } else {
      result.push(child as HiccupNode);
    }
  }
  return result;
}

/** Patch an existing DOM node to match new hiccup. Reuses same-tag elements. */
export function patchNode(existing: Node, hiccup: HiccupNode): Node {
  // String/number → patch text or replace
  if (typeof hiccup === 'string' || typeof hiccup === 'number') {
    const text = String(hiccup);
    if (existing.nodeType === 3) {
      if ((existing as Text).data !== text) {
        (existing as Text).data = text;
      }
      return existing;
    }
    const newNode = document.createTextNode(text);
    existing.parentNode!.replaceChild(newNode, existing);
    return newNode;
  }

  // null/undefined → comment
  if (hiccup === null || hiccup === undefined) {
    if (existing.nodeType === 8) return existing;
    const comment = document.createComment('');
    existing.parentNode!.replaceChild(comment, existing);
    return comment;
  }

  // function → new bind (reactive boundary, can't patch into)
  if (typeof hiccup === 'function') {
    const newNode = bind(hiccup as () => HiccupNode);
    existing.parentNode!.replaceChild(newNode, existing);
    return newNode;
  }

  // Not hiccup vector → text
  if (!isHiccupVector(hiccup)) {
    const newNode = document.createTextNode(String(hiccup));
    existing.parentNode!.replaceChild(newNode, existing);
    return newNode;
  }

  // Hiccup vector
  const [rawTag, ...rest] = hiccup;
  const { tag, id, classes } = parseTag(rawTag as string);

  // Different tag or not an element → full replace
  if (existing.nodeType !== 1 || (existing as HTMLElement).tagName.toLowerCase() !== tag) {
    const newNode = renderHiccup(hiccup);
    existing.parentNode!.replaceChild(newNode, existing);
    return newNode;
  }

  // Same tag — reuse element
  const el = existing as HTMLElement;

  // Update id
  if (id) el.id = id;
  else if (el.id) el.removeAttribute('id');

  // Extract attrs
  let childStart = 0;
  let attrs: Record<string, unknown> = {};
  if (rest.length > 0 && isAttrsMap(rest[0])) {
    attrs = rest[0];
    childStart = 1;
  }

  // Patch attrs
  patchAttrs(el, attrs, classes.join(' '), tag);

  // Patch children
  patchChildren(el, flattenChildren(rest.slice(childStart)));

  return el;
}

function patchAttrs(el: HTMLElement, newAttrs: Record<string, unknown>, baseClass: string, tag: string): void {
  const prevKeys = prevAttrsStore.get(el);
  const prevListeners = listenersStore.get(el);

  // Remove old attrs not in new
  if (prevKeys) {
    for (const key of prevKeys) {
      if (key in newAttrs) continue;
      if (key === 'class' || key === 'style') continue;
      if (key.startsWith('on-')) {
        const event = key.slice(3);
        const handler = prevListeners?.get(event);
        if (handler) {
          el.removeEventListener(event, handler);
          prevListeners!.delete(event);
        }
      } else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readonly') {
        (el as unknown as Record<string, unknown>)[key] = false;
      } else {
        el.removeAttribute(key);
      }
    }
  }

  // Set className
  const classAttr = newAttrs['class'];
  if (typeof classAttr === 'function') {
    const v = (classAttr as () => unknown)();
    el.className = baseClass ? baseClass + ' ' + String(v) : String(v);
  } else if (typeof classAttr === 'string') {
    el.className = baseClass ? baseClass + ' ' + classAttr : classAttr;
  } else {
    el.className = baseClass;
  }

  // Set new attrs
  const newKeys = new Set<string>();
  const listeners = prevListeners || new Map<string, EventListener>();

  for (const [key, val] of Object.entries(newAttrs)) {
    newKeys.add(key);
    if (key === 'class') continue; // handled above
    if (key === 'style') {
      if (typeof val === 'function') {
        const styleMap = (val as () => unknown)() as Record<string, string>;
        if (styleMap && typeof styleMap === 'object') {
          for (const [prop, sval] of Object.entries(styleMap)) {
            el.style.setProperty(prop, sval);
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        for (const [prop, sval] of Object.entries(val as Record<string, string>)) {
          el.style.setProperty(prop, sval);
        }
      }
    } else if (key.startsWith('on-')) {
      if (tag.includes('-') && key in el) {
        (el as unknown as Record<string, unknown>)[key] = val;
      } else {
        const event = key.slice(3);
        const oldHandler = listeners.get(event);
        if (oldHandler && oldHandler !== val) {
          el.removeEventListener(event, oldHandler);
        }
        if (!oldHandler || oldHandler !== val) {
          el.addEventListener(event, val as EventListener);
          listeners.set(event, val as EventListener);
        }
      }
    } else if (tag.includes('-') && typeof val === 'object' && val !== null) {
      (el as unknown as Record<string, unknown>)[key] = val;
    } else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readonly') {
      (el as unknown as Record<string, unknown>)[key] = !!val;
    } else {
      el.setAttribute(key, String(val));
    }
  }

  prevAttrsStore.set(el, newKeys);
  listenersStore.set(el, listeners);
}

function patchChildren(el: HTMLElement, newChildren: HiccupNode[]): void {
  const existing = Array.from(el.childNodes);
  const maxLen = Math.max(existing.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < existing.length && i < newChildren.length) {
      patchNode(existing[i]!, newChildren[i]!);
    } else if (i >= existing.length) {
      el.appendChild(renderHiccup(newChildren[i]!));
    } else {
      el.removeChild(existing[i]!);
    }
  }
}

// -- bind --

/** Create a reactive DOM fragment. Re-renders when tracked atoms change.
 * Returns a placeholder node; the actual content is managed reactively. */
export function bind(fn: () => HiccupNode): Node {
  const anchor = document.createComment('bind');
  let currentNode: Node | null = null;
  let dispose: (() => void) | null = null;

  // Use queueMicrotask to defer initial effect until anchor is in DOM
  queueMicrotask(() => {
    dispose = effect(() => {
      const hiccup = cljToJs(fn()) as HiccupNode;

      if (currentNode && anchor.parentNode) {
        // Patch existing DOM instead of full replace
        currentNode = patchNode(currentNode, hiccup);
      } else if (anchor.parentNode) {
        const newNode = renderHiccup(hiccup);
        anchor.parentNode.insertBefore(newNode, anchor.nextSibling);
        currentNode = newNode;
      }
    });
  });

  // Attach dispose for cleanup
  (anchor as unknown as Record<string, unknown>)._dispose = () => {
    dispose?.();
  };

  return anchor;
}
