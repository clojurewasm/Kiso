import { describe, it, expect } from 'vitest';
import { readStr, readAllStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit, emitModule } from '../../src/codegen/emitter.js';
import { expandAll } from '../../src/analyzer/macros.js';
import { keyword } from '../../src/runtime/keyword.js';

const analyzer = new Analyzer();

function compile(source: string): string {
  const forms = readAllStr(source);
  const expanded = forms.map(expandAll);
  const nodes = expanded.map(f => analyzer.analyze(f));
  return nodes.map(n => emit(n)).join('\n');
}

describe('defrecord*', () => {
  it('compiles to ES6 class with constructor', () => {
    const js = compile(`(defrecord* Point [x y])`);
    expect(js).toContain('class Point');
    expect(js).toContain('constructor(x, y)');
    expect(js).toContain('this.x = x');
    expect(js).toContain('this.y = y');
  });

  it('includes __kiso_type property', () => {
    const js = compile(`(defrecord* Point [x y])`);
    expect(js).toContain('__kiso_type');
    expect(js).toContain('"Point"');
  });

  it('generates ->Name factory', () => {
    const js = compile(`(defrecord* Point [x y])`);
    expect(js).toContain('_to_Point');
    expect(js).toContain('return new Point(x, y)');
  });

  it('generates map->Name factory', () => {
    const js = compile(`(defrecord* Point [x y])`);
    expect(js).toContain('map_to_Point');
  });

  it('includes protocol methods', () => {
    const js = compile(`(defrecord* Pair [a b] ISeq (first [_] a) (rest [_] b))`);
    expect(js).toContain('class Pair');
    expect(js).toContain('ISeq.methods.first');
    expect(js).toContain('ISeq.methods.rest');
  });
});

describe('defrecord macro', () => {
  it('expands to defrecord*', () => {
    const js = compile(`(defrecord Point [x y])`);
    expect(js).toContain('class Point');
    expect(js).toContain('__kiso_type');
    expect(js).toContain('_to_Point');
    expect(js).toContain('map_to_Point');
  });
});
