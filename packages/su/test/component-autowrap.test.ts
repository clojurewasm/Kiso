import { describe, it, expect } from 'vitest';
import { readAllStr } from '../../kiso/src/reader/reader.js';
import { Analyzer } from '../../kiso/src/analyzer/analyzer.js';
import { emit } from '../../kiso/src/codegen/emitter.js';

const analyzer = new Analyzer();

function compileBody(source: string): string {
  const forms = readAllStr(source);
  const nodes = analyzer.analyzeAll(forms);
  return nodes.map(n => emit(n)).join('\n');
}

describe('defc auto-wrap codegen', () => {
  it('auto-wraps plain hiccup body into a thunk', () => {
    const js = compileBody(`
      (defc my-comp [] [:div "hello"])
    `);
    // fn* compiles to `function () { return vector(...) }`
    // The render fn body should contain a thunk wrapping the vector
    expect(js).toMatch(/return function \(\) \{/);
    expect(js).toMatch(/return vector\(keyword\("div"\), "hello"\)/);
  });

  it('does not double-wrap explicit fn', () => {
    const js = compileBody(`
      (defc my-comp [] (fn [] [:div "hello"]))
    `);
    // Should have exactly one function wrapper (the explicit fn), not an additional auto-wrap
    // Count `function ()` occurrences (excluding the outer render fn)
    const innerFnMatches = js.match(/return function \(\) \{/g) || [];
    expect(innerFnMatches.length).toBe(1);
  });

  it('auto-wraps inside let body', () => {
    const js = compileBody(`
      (defc my-comp []
        (let [x 1] [:div (str x)]))
    `);
    // The let body's last expr should be wrapped in function() { ... }
    expect(js).toMatch(/return function \(\) \{/);
    expect(js).toMatch(/return vector\(keyword\("div"\), str\(x\)\)/);
  });

  it('preserves fn inside let (Form-2)', () => {
    const js = compileBody(`
      (defc my-comp []
        (let [n (atom 0)]
          (fn [] [:div (str n)])))
    `);
    // The explicit fn should compile normally, with one inner function
    const innerFnMatches = js.match(/return function \(\) \{/g) || [];
    expect(innerFnMatches.length).toBe(1);
  });
});
