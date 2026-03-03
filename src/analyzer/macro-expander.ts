// Macro Expander Pipeline — Unifies core macros and user defmacro.
//
// Core macros are pure Form→Form transforms (from macros.ts).
// User macros are evaluated by the mini evaluator.

import type { Form } from '../reader/form.js';
import { expandOnce as coreExpandOnce } from './macros.js';
import { MacroEvaluator, makeEnv, type Env } from './evaluator.js';

export class MacroExpander {
  private evaluator: MacroEvaluator;
  private globalEnv: Env;
  private userMacros = new Map<string, Form>(); // name → fn Form

  constructor() {
    this.evaluator = new MacroEvaluator();
    this.globalEnv = makeEnv();
  }

  /** Process a top-level form. If defmacro, register it. */
  processToplevel(form: Form): void {
    if (form.data.type !== 'list') return;
    const items = form.data.items;
    if (items.length === 0) return;
    const head = items[0]!;
    if (head.data.type !== 'symbol') return;

    if (head.data.name === 'defmacro') {
      this.registerMacro(items);
    }
  }

  private registerMacro(items: Form[]): void {
    // (defmacro name [params] body...)
    // or (defmacro name docstring [params] body...)
    const nameSym = items[1]!;
    if (nameSym.data.type !== 'symbol') throw new Error('defmacro requires a name symbol');
    const name = nameSym.data.name;

    // Build a fn* form from the remaining items
    let paramIdx = 2;
    // Skip optional docstring
    if (items[paramIdx]?.data.type === 'string') {
      paramIdx++;
    }

    // Create (fn* name [params] body...) and evaluate it
    const fnItems: Form[] = [
      { data: { type: 'symbol', ns: null, name: 'fn*' }, line: 0, col: 0 },
      nameSym,
      ...items.slice(paramIdx),
    ];
    const fnForm: Form = { data: { type: 'list', items: fnItems }, line: 0, col: 0 };
    const fnVal = this.evaluator.evaluate(fnForm, this.globalEnv);
    this.userMacros.set(name, fnVal);
  }

  /** Expand one level: try core macro first, then user macro. */
  expandOnce(form: Form): Form {
    // Try core macros first
    const coreExpanded = coreExpandOnce(form);
    if (coreExpanded !== form) return coreExpanded;

    // Try user macros
    if (form.data.type !== 'list') return form;
    const items = form.data.items;
    if (items.length === 0) return form;
    const head = items[0]!;
    if (head.data.type !== 'symbol' || head.data.ns !== null) return form;

    const userMacro = this.userMacros.get(head.data.name);
    if (!userMacro) return form;

    // Apply macro: pass unevaluated args
    const args = items.slice(1);
    return this.evaluator.applyFn(userMacro, args);
  }

  /** Expand all macros recursively (form + children). */
  expandAll(form: Form): Form {
    let current = form;
    for (let i = 0; i < 1024; i++) {
      const expanded = this.expandOnce(current);
      if (expanded === current) break;
      current = expanded;
    }

    // Expand children
    if (current.data.type === 'list') {
      const newItems = current.data.items.map((f) => this.expandAll(f));
      return { ...current, data: { type: 'list', items: newItems } };
    }
    if (current.data.type === 'vector') {
      const newItems = current.data.items.map((f) => this.expandAll(f));
      return { ...current, data: { type: 'vector', items: newItems } };
    }
    if (current.data.type === 'map') {
      const newItems = current.data.items.map((f) => this.expandAll(f));
      return { ...current, data: { type: 'map', items: newItems } };
    }
    if (current.data.type === 'set') {
      const newItems = current.data.items.map((f) => this.expandAll(f));
      return { ...current, data: { type: 'set', items: newItems } };
    }

    return current;
  }
}
