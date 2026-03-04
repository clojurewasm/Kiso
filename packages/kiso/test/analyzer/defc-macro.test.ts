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

describe('defc auto-wrap', () => {
  // Helper: extract the render fn body from defc expansion
  // defc expands to (su.core/define-component name config (fn* [props-atom__auto] body))
  function getRenderBody(src: string): string {
    const result = expandStr(src);
    const s = formToString(result);
    // The render fn is the last arg to define-component
    // Extract via formToString on the render fn form
    const items = (result.data as { items: unknown[] }).items as Array<{ data: { type: string; [key: string]: unknown } }>;
    const renderFn = items[items.length - 1]!;
    return formToString(renderFn);
  }

  it('wraps plain vector in fn*', () => {
    const body = getRenderBody(`
      (defc my-comp [] [:div "hello"])
    `);
    // Body should be (fn* [] [:div "hello"]) — auto-wrapped
    expect(body).toContain('(fn* [] [:div "hello"])');
  });

  it('skips explicit fn (no double wrap)', () => {
    const body = getRenderBody(`
      (defc my-comp [] (fn [] [:div "hello"]))
    `);
    // Should NOT contain fn* wrapping fn
    expect(body).toContain('(fn [] [:div "hello"])');
    expect(body).not.toContain('(fn* [] (fn ');
  });

  it('skips explicit fn* (no double wrap)', () => {
    const body = getRenderBody(`
      (defc my-comp [] (fn* [] [:div]))
    `);
    expect(body).toContain('(fn* [] [:div])');
    // Should be exactly fn* [] [:div], not double-wrapped
    expect(body).not.toMatch(/\(fn\* \[\] \(fn\*/);
  });

  it('wraps inside let', () => {
    const body = getRenderBody(`
      (defc my-comp []
        (let [x 1] [:div x]))
    `);
    // The let's last expr should be wrapped
    expect(body).toContain('(let [x 1] (fn* [] [:div x]))');
  });

  it('wraps inside nested let', () => {
    const body = getRenderBody(`
      (defc my-comp []
        (let [a 1] (let [b 2] [:div a b])))
    `);
    // Inner let's final expr should be wrapped
    expect(body).toContain('(let [b 2] (fn* [] [:div a b]))');
  });

  it('wraps inside do', () => {
    const body = getRenderBody(`
      (defc my-comp []
        (do (println "setup") [:div]))
    `);
    expect(body).toContain('(do (println "setup") (fn* [] [:div]))');
  });

  it('wraps multi-body (implicit do)', () => {
    const body = getRenderBody(`
      (defc my-comp []
        (println "setup")
        [:div])
    `);
    // Multi-body becomes (do ... last), last is wrapped
    expect(body).toContain('(do (println "setup") (fn* [] [:div]))');
  });

  it('preserves fn inside let (Form-2 pattern)', () => {
    const body = getRenderBody(`
      (defc my-comp []
        (let [n (atom 0)] (fn [] [:div n])))
    `);
    // fn detected inside let → no additional fn* wrap around [:div n]
    expect(body).toContain('(let [n (atom 0)] (fn [] [:div n]))');
    // The (fn [] ...) should NOT be double-wrapped — no (fn* [] (fn ...))
    expect(body).not.toContain('(fn* [] (fn ');
  });

  it('wraps with props destructuring', () => {
    const result = expandStr(`
      (defc my-comp [{:keys [title]}] [:div title])
    `);
    const s = formToString(result);
    // The render body should have let* with wrapped final expr
    expect(s).toContain('(fn* [] [:div title])');
  });
});
