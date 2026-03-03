import { describe, it, expect } from 'vitest';
import { readStr, readAllStr, ReaderError } from '../../src/reader/reader.js';
import { prStr, type Form } from '../../src/reader/form.js';

/** Read one form and return its prStr. */
function pr(source: string): string {
  const form = readStr(source);
  if (form === null) throw new Error('Expected a form, got EOF');
  return prStr(form);
}

/** Read all forms and return their prStr. */
function prAll(source: string): string[] {
  return readAllStr(source).map(prStr);
}

/** Assert that a form has the expected data type. */
function expectType(source: string, type: string) {
  const form = readStr(source);
  expect(form).not.toBeNull();
  expect(form!.data.type).toBe(type);
}

// -- Basic Literals --

describe('nil, true, false', () => {
  it('reads nil', () => {
    expect(pr('nil')).toBe('nil');
    expectType('nil', 'nil');
  });

  it('reads true', () => {
    expect(pr('true')).toBe('true');
    expectType('true', 'boolean');
  });

  it('reads false', () => {
    expect(pr('false')).toBe('false');
    expectType('false', 'boolean');
  });
});

// -- Numbers --

describe('integers', () => {
  it('reads decimal integers', () => {
    expect(pr('42')).toBe('42');
    expect(pr('0')).toBe('0');
    expect(pr('-17')).toBe('-17');
    expect(pr('+5')).toBe('5');
  });

  it('reads hex integers', () => {
    expect(pr('0xff')).toBe('255');
    expect(pr('0xFF')).toBe('255');
    expect(pr('0x2A')).toBe('42');
  });

  it('reads radix integers', () => {
    expect(pr('2r101')).toBe('5');
    expect(pr('8r52')).toBe('42');
    expect(pr('36rZZ')).toBe('1295');
  });

  it('reads octal integers', () => {
    expect(pr('052')).toBe('42');
    expect(pr('010')).toBe('8');
  });

  it('reads bigint with N suffix', () => {
    expect(pr('42N')).toBe('42N');
    expectType('42N', 'bigint');
  });

  it('overflows to bigint', () => {
    expect(pr('9007199254740993')).toBe('9007199254740993N');
    expectType('9007199254740993', 'bigint');
  });
});

describe('floats', () => {
  it('reads decimal floats', () => {
    expect(pr('3.14')).toBe('3.14');
    expect(pr('0.5')).toBe('0.5');
  });

  it('reads floats with exponent', () => {
    expect(pr('1e10')).toBe('10000000000');
    expect(pr('2.5e-3')).toBe('0.0025');
  });

  it('reads symbolic values', () => {
    expect(pr('##Inf')).toBe('##Inf');
    expect(pr('##-Inf')).toBe('##-Inf');
    expect(pr('##NaN')).toBe('##NaN');
  });
});

describe('ratios', () => {
  it('reads ratios', () => {
    expect(pr('22/7')).toBe('22/7');
    expect(pr('1/3')).toBe('1/3');
    expectType('22/7', 'ratio');
  });

  it('errors on divide by zero', () => {
    expect(() => readStr('0/0')).toThrow(ReaderError);
  });
});

// -- Strings --

describe('strings', () => {
  it('reads simple strings', () => {
    expect(pr('"hello"')).toBe('"hello"');
  });

  it('unescapes string escapes', () => {
    const form = readStr('"a\\nb"');
    expect(form!.data.type).toBe('string');
    if (form!.data.type === 'string') {
      expect(form!.data.value).toBe('a\nb');
    }
  });

  it('unescapes all escape sequences', () => {
    const f = (s: string) => {
      const form = readStr(s);
      if (form!.data.type === 'string') return form!.data.value;
      throw new Error('not a string');
    };
    expect(f('"\\t"')).toBe('\t');
    expect(f('"\\r"')).toBe('\r');
    expect(f('"\\n"')).toBe('\n');
    expect(f('"\\\\"\'')).toBe('\\');
    expect(f('"\\""')).toBe('"');
    expect(f('"\\b"')).toBe('\b');
    expect(f('"\\f"')).toBe('\f');
  });

  it('unescapes unicode', () => {
    const form = readStr('"\\u03BB"');
    if (form!.data.type === 'string') {
      expect(form!.data.value).toBe('\u03BB');
    }
  });

  it('reads empty string', () => {
    expect(pr('""')).toBe('""');
  });
});

// -- Characters --

describe('characters', () => {
  it('reads single character', () => {
    expect(pr('\\a')).toBe('\\a');
    expectType('\\a', 'char');
  });

  it('reads named characters', () => {
    expect(pr('\\newline')).toBe('\\newline');
    expect(pr('\\space')).toBe('\\space');
    expect(pr('\\tab')).toBe('\\tab');
    expect(pr('\\return')).toBe('\\return');
    expect(pr('\\backspace')).toBe('\\backspace');
    expect(pr('\\formfeed')).toBe('\\formfeed');
  });

  it('reads unicode character', () => {
    const form = readStr('\\u03BB');
    expect(form!.data.type).toBe('char');
    if (form!.data.type === 'char') {
      expect(form!.data.value).toBe('\u03BB');
    }
  });
});

// -- Symbols --

describe('symbols', () => {
  it('reads simple symbols', () => {
    expect(pr('foo')).toBe('foo');
    expectType('foo', 'symbol');
  });

  it('reads namespaced symbols', () => {
    expect(pr('clojure.core/map')).toBe('clojure.core/map');
    const form = readStr('clojure.core/map');
    if (form!.data.type === 'symbol') {
      expect(form!.data.ns).toBe('clojure.core');
      expect(form!.data.name).toBe('map');
    }
  });

  it('reads / as division symbol', () => {
    expect(pr('/')).toBe('/');
    const form = readStr('/');
    if (form!.data.type === 'symbol') {
      expect(form!.data.ns).toBeNull();
      expect(form!.data.name).toBe('/');
    }
  });

  it('errors on trailing slash', () => {
    expect(() => readStr('foo/')).toThrow(ReaderError);
  });
});

// -- Keywords --

describe('keywords', () => {
  it('reads simple keywords', () => {
    expect(pr(':foo')).toBe(':foo');
    expectType(':foo', 'keyword');
  });

  it('reads namespaced keywords', () => {
    expect(pr(':bar/baz')).toBe(':bar/baz');
    const form = readStr(':bar/baz');
    if (form!.data.type === 'keyword') {
      expect(form!.data.ns).toBe('bar');
      expect(form!.data.name).toBe('baz');
    }
  });

  it('reads auto-resolved keywords', () => {
    expect(pr('::foo')).toBe(':foo');
    // auto-resolved keywords are stored without the ::
  });

  // CSS selector keywords for su's defstyle
  it('reads CSS class keyword', () => {
    expect(pr(':.counter')).toBe(':.counter');
  });

  it('reads CSS ampersand-hover keyword', () => {
    expect(pr(':&:hover')).toBe(':&:hover');
  });

  it('reads CSS host keyword', () => {
    expect(pr(':host')).toBe(':host');
  });

  it('reads CSS keyword with hyphens', () => {
    expect(pr(':font-size')).toBe(':font-size');
  });
});

// -- Collections --

describe('lists', () => {
  it('reads empty list', () => {
    expect(pr('()')).toBe('()');
  });

  it('reads list of integers', () => {
    expect(pr('(1 2 3)')).toBe('(1 2 3)');
  });

  it('reads nested lists', () => {
    expect(pr('(+ (- 3 1) 2)')).toBe('(+ (- 3 1) 2)');
  });
});

describe('vectors', () => {
  it('reads empty vector', () => {
    expect(pr('[]')).toBe('[]');
  });

  it('reads vector of values', () => {
    expect(pr('[1 2 3]')).toBe('[1 2 3]');
  });
});

describe('maps', () => {
  it('reads empty map', () => {
    expect(pr('{}')).toBe('{}');
  });

  it('reads map of key-value pairs', () => {
    expect(pr('{:a 1 :b 2}')).toBe('{:a 1, :b 2}');
  });

  it('errors on odd number of forms', () => {
    expect(() => readStr('{:a 1 :b}')).toThrow(ReaderError);
  });
});

describe('sets', () => {
  it('reads empty set', () => {
    expect(pr('#{}')).toBe('#{}');
  });

  it('reads set of values', () => {
    expect(pr('#{1 2 3}')).toBe('#{1 2 3}');
  });
});

// -- Reader macros --

describe('quote', () => {
  it("expands 'x to (quote x)", () => {
    expect(pr("'x")).toBe('(quote x)');
  });

  it("expands '(1 2) to (quote (1 2))", () => {
    expect(pr("'(1 2)")).toBe('(quote (1 2))');
  });
});

describe('deref', () => {
  it('expands @x to (deref x)', () => {
    expect(pr('@x')).toBe('(deref x)');
  });
});

describe('var', () => {
  it("expands #'x to (var x)", () => {
    expect(pr("#'x")).toBe('(var x)');
  });
});

describe('unquote', () => {
  it('expands ~x to (unquote x)', () => {
    expect(pr('~x')).toBe('(unquote x)');
  });
});

describe('unquote-splicing', () => {
  it('expands ~@x to (unquote-splicing x)', () => {
    expect(pr('~@x')).toBe('(unquote-splicing x)');
  });
});

describe('discard', () => {
  it('discards next form', () => {
    expect(pr('#_foo 42')).toBe('42');
  });

  it('discards complex form', () => {
    expect(pr('#_(1 2 3) :ok')).toBe(':ok');
  });
});

describe('metadata', () => {
  it('reads ^:key form as (with-meta form {:key true})', () => {
    expect(pr('^:dynamic x')).toBe('(with-meta x {:dynamic true})');
  });

  it('reads ^{...} form', () => {
    expect(pr('^{:tag String} x')).toBe('(with-meta x {:tag String})');
  });

  it('reads ^Type form as (with-meta form {:tag Type})', () => {
    expect(pr('^String x')).toBe('(with-meta x {:tag String})');
  });
});

// -- Fn literal --

describe('fn literal', () => {
  it('reads #(inc %) as (fn* [%1] (inc %1))', () => {
    expect(pr('#(inc %)')).toBe('(fn* [%1] (inc %1))');
  });

  it('reads #(+ %1 %2) with multiple params', () => {
    expect(pr('#(+ %1 %2)')).toBe('(fn* [%1 %2] (+ %1 %2))');
  });

  it('reads #(apply + %&) with rest param', () => {
    expect(pr('#(apply + %&)')).toBe('(fn* [& %&] (apply + %&))');
  });
});

// -- Regex --

describe('regex', () => {
  it('reads regex literal', () => {
    expect(pr('#"\\d+"')).toBe('#"\\d+"');
    expectType('#"\\d+"', 'regex');
  });
});

// -- Tagged literals --

describe('tagged literals', () => {
  it('reads tagged literal', () => {
    expect(pr('#inst "2024-01-01"')).toBe('#inst "2024-01-01"');
    expectType('#inst "2024-01-01"', 'tagged');
  });
});

// -- readAll --

describe('readAllStr', () => {
  it('reads multiple top-level forms', () => {
    expect(prAll('1 2 3')).toEqual(['1', '2', '3']);
  });

  it('reads complex program', () => {
    expect(prAll('(ns foo) (defn bar [x] x)')).toEqual([
      '(ns foo)',
      '(defn bar [x] x)',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(prAll('')).toEqual([]);
  });
});

// -- Error cases --

describe('errors', () => {
  it('throws on unmatched )', () => {
    expect(() => readStr(')')).toThrow(ReaderError);
  });

  it('throws on unmatched ]', () => {
    expect(() => readStr(']')).toThrow(ReaderError);
  });

  it('throws on unmatched }', () => {
    expect(() => readStr('}')).toThrow(ReaderError);
  });

  it('throws on EOF in list', () => {
    expect(() => readStr('(1 2')).toThrow(ReaderError);
  });

  it('throws on EOF after quote', () => {
    expect(() => readStr("'")).toThrow(ReaderError);
  });

  it('throws on unknown escape in string', () => {
    expect(() => readStr('"\\x"')).toThrow(ReaderError);
  });

  it('includes line/col in error', () => {
    try {
      readStr('(\n  )foo)');
    } catch (e) {
      expect(e).toBeInstanceOf(ReaderError);
    }
  });
});

// -- Source location --

describe('source location', () => {
  it('preserves line and col on forms', () => {
    const form = readStr('  42');
    expect(form!.line).toBe(1);
    expect(form!.col).toBe(3);
  });

  it('tracks line for multi-line input', () => {
    const forms = readAllStr('a\nb');
    expect(forms[0].line).toBe(1);
    expect(forms[1].line).toBe(2);
  });
});
