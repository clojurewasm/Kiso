import { describe, it, expect } from 'vitest';
import { expandOnce } from '../../src/analyzer/macros.js';
import { readAllStr } from '../../src/reader/reader.js';

function expandStr(src: string) {
  const forms = readAllStr(src);
  return expandOnce(forms[0]!);
}

function formToString(form: { data: { type: string; [key: string]: unknown } }): string {
  const d = form.data as Record<string, unknown>;
  switch (d.type) {
    case 'symbol': return d.ns ? `${d.ns}/${d.name}` : d.name as string;
    case 'keyword': return d.ns ? `:${d.ns}/${d.name}` : `:${d.name}`;
    case 'string': return JSON.stringify(d.value);
    case 'integer': case 'float': return String(d.value);
    case 'nil': return 'nil';
    case 'boolean': return String(d.value);
    case 'list': return '(' + (d.items as unknown[]).map(formToString).join(' ') + ')';
    case 'vector': return '[' + (d.items as unknown[]).map(formToString).join(' ') + ']';
    case 'map': return '{' + (d.items as unknown[]).map(formToString).join(' ') + '}';
    default: return `<${d.type}>`;
  }
}

describe('defc macro', () => {
  it('expands basic defc with explicit props', () => {
    const result = expandStr(`
      (defc my-counter
        {:props {:initial {:type :number}}}
        [{:keys [initial]}]
        [:div @count])
    `);
    const s = formToString(result);
    // Should expand to (su.core/define-component "my-counter" config render-fn)
    expect(s).toContain('su.core/define-component');
    expect(s).toContain('"my-counter"');
  });

  it('expands minimal defc (no options map)', () => {
    const result = expandStr(`
      (defc my-widget [{:keys [title]}]
        [:div title])
    `);
    const s = formToString(result);
    expect(s).toContain('su.core/define-component');
    expect(s).toContain('"my-widget"');
  });

  it('throws if name has no hyphen', () => {
    expect(() => expandStr(`
      (defc counter [{:keys [x]}] [:div])
    `)).toThrow('hyphen');
  });

  it('skips docstring in expansion', () => {
    const result = expandStr(`
      (defc my-comp
        "A doc string"
        [{:keys [x]}]
        [:div x])
    `);
    const s = formToString(result);
    expect(s).toContain('su.core/define-component');
    expect(s).toContain('"my-comp"');
  });

  it('extracts observed attrs from props map', () => {
    const result = expandStr(`
      (defc my-thing
        {:props {:name {:type :string} :count {:type :number}}}
        [{:keys [name count]}]
        [:div name count])
    `);
    const s = formToString(result);
    // Should include the observed attrs
    expect(s).toContain('"name"');
    expect(s).toContain('"count"');
  });

  it('handles empty params vector (no-props component)', () => {
    const result = expandStr(`
      (defc my-shell []
        [:div "hello"])
    `);
    const s = formToString(result);
    expect(s).toContain('su.core/define-component');
    expect(s).toContain('"my-shell"');
    // Should not crash, render fn ignores props-atom
  });

  it('infers attrs from destructuring keys when no props map', () => {
    const result = expandStr(`
      (defc my-card [{:keys [title subtitle]}]
        [:div title subtitle])
    `);
    const s = formToString(result);
    expect(s).toContain('"title"');
    expect(s).toContain('"subtitle"');
  });
});
