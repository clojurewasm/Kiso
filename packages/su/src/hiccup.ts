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
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') {
      if (typeof val === 'string') {
        el.className = el.className ? el.className + ' ' + val : val;
      }
    } else if (key === 'style' && typeof val === 'object' && val !== null) {
      for (const [prop, sval] of Object.entries(val as Record<string, string>)) {
        el.style.setProperty(prop, sval);
      }
    } else if (key.startsWith('on-')) {
      const event = key.slice(3);
      el.addEventListener(event, val as EventListener);
    } else if (tag.includes('-') && typeof val === 'object' && val !== null) {
      (el as unknown as Record<string, unknown>)[key] = val;
    } else {
      el.setAttribute(key, String(val));
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
      const newNode = renderHiccup(hiccup);

      if (currentNode && anchor.parentNode) {
        anchor.parentNode.replaceChild(newNode, currentNode);
      } else if (anchor.parentNode) {
        anchor.parentNode.insertBefore(newNode, anchor.nextSibling);
      }
      currentNode = newNode;
    });
  });

  // Attach dispose for cleanup
  (anchor as unknown as Record<string, unknown>)._dispose = () => {
    dispose?.();
  };

  return anchor;
}
