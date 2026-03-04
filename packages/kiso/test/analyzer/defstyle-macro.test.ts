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

function extractCssStr(src: string): string {
  const result = expandStr(src);
  // (su.core/create-stylesheet "name" "css-text")
  if (result.data.type === 'list') {
    const items = result.data.items;
    if (items.length >= 3 && items[2]!.data.type === 'string') {
      return (items[2]!.data as { value: string }).value;
    }
  }
  throw new Error('Expected (su.core/create-stylesheet "name" "css"): ' + formToString(result));
}

describe('defstyle macro', () => {
  it('expands to bare (su.core/create-stylesheet ...)', () => {
    const result = expandStr(`
      (defstyle my-style
        [:.foo {:color "red"}])
    `);
    const s = formToString(result);
    expect(s).toMatch(/^\(su\.core\/create-stylesheet/);
    expect(s).toContain('"my-style"');
  });

  it('generates simple class rule', () => {
    const css = extractCssStr(`
      (defstyle s [:.foo {:color "red"}])
    `);
    expect(css).toContain('.foo');
    expect(css).toContain('color: red');
  });

  it('generates nested child rule', () => {
    const css = extractCssStr(`
      (defstyle s
        [:.parent {:display "flex"}
          [:span {:font-weight "bold"}]])
    `);
    expect(css).toContain('.parent { display: flex; }');
    expect(css).toContain('.parent span { font-weight: bold; }');
  });

  it('generates & (ampersand) pseudo-class rule', () => {
    const css = extractCssStr(`
      (defstyle s
        [:.btn {:cursor "pointer"}
          [:&:hover {:background "#eee"}]])
    `);
    expect(css).toContain('.btn { cursor: pointer; }');
    expect(css).toContain('.btn:hover { background: #eee; }');
  });

  it('generates &.modifier rule', () => {
    const css = extractCssStr(`
      (defstyle s
        [:.card
          [:&.active {:border "1px solid blue"}]])
    `);
    expect(css).toContain('.card.active { border: 1px solid blue; }');
  });

  it('generates :host rule', () => {
    const css = extractCssStr(`
      (defstyle s [:host {:display "block"}])
    `);
    expect(css).toContain(':host { display: block; }');
  });

  it('converts kebab-case properties', () => {
    const css = extractCssStr(`
      (defstyle s [:.x {:font-size "14px" :line-height "1.5"}])
    `);
    expect(css).toContain('font-size: 14px');
    expect(css).toContain('line-height: 1.5');
  });

  it('handles multiple top-level selectors via outer vector', () => {
    const css = extractCssStr(`
      (defstyle s
        [:.a {:color "red"}
         :.b {:color "blue"}])
    `);
    // Both should appear — either as siblings or as separate rules
    expect(css).toContain('.a');
    expect(css).toContain('.b');
  });
});
