import { describe, it, expect } from 'vitest';
import { Tokenizer, type Token, type TokenKind } from '../../src/reader/tokenizer.js';

/** Collect all tokens from source (excluding eof). */
function tokenize(source: string): Token[] {
  const t = new Tokenizer(source);
  const tokens: Token[] = [];
  for (;;) {
    const tok = t.next();
    if (tok.kind === 'eof') break;
    tokens.push(tok);
  }
  return tokens;
}

/** Collect all token kinds from source (excluding eof). */
function kinds(source: string): TokenKind[] {
  return tokenize(source).map((t) => t.kind);
}

/** Collect all token texts from source (excluding eof). */
function texts(source: string): string[] {
  return tokenize(source).map((t) => t.text);
}

// -- Empty / Whitespace / Comments --

describe('whitespace and comments', () => {
  it('empty string returns eof', () => {
    const t = new Tokenizer('');
    expect(t.next().kind).toBe('eof');
  });

  it('whitespace-only returns eof', () => {
    const t = new Tokenizer('   \n\t  ');
    expect(t.next().kind).toBe('eof');
  });

  it('comma is whitespace', () => {
    expect(kinds('(,)')).toEqual(['lparen', 'rparen']);
  });

  it('semicolon comment is skipped', () => {
    expect(kinds('; comment\n()')).toEqual(['lparen', 'rparen']);
  });

  it('comment at end of input', () => {
    expect(kinds('42 ; trailing')).toEqual(['integer']);
  });

  it('multiple eof calls are safe', () => {
    const t = new Tokenizer('');
    expect(t.next().kind).toBe('eof');
    expect(t.next().kind).toBe('eof');
    expect(t.next().kind).toBe('eof');
  });

  it('shebang comment is skipped', () => {
    expect(kinds('#!/usr/bin/env clj\n42')).toEqual(['integer']);
  });
});

// -- Delimiters --

describe('delimiters', () => {
  it('tokenizes all delimiters', () => {
    expect(kinds('()[]{}'))
      .toEqual(['lparen', 'rparen', 'lbracket', 'rbracket', 'lbrace', 'rbrace']);
  });

  it('preserves delimiter text', () => {
    expect(texts('( ) [ ] { }')).toEqual(['(', ')', '[', ']', '{', '}']);
  });
});

// -- Symbols --

describe('symbols', () => {
  it('reads simple symbols', () => {
    expect(texts('foo bar')).toEqual(['foo', 'bar']);
    expect(kinds('foo bar')).toEqual(['symbol', 'symbol']);
  });

  it('reads namespaced symbols', () => {
    expect(texts('clojure.core/map')).toEqual(['clojure.core/map']);
  });

  it('reads symbols with special characters', () => {
    expect(texts('swap! foo# *bar* -baz>')).toEqual(['swap!', 'foo#', '*bar*', '-baz>']);
  });

  it('reads +/- as symbols when not followed by digit', () => {
    expect(kinds('+')).toEqual(['symbol']);
    expect(kinds('-')).toEqual(['symbol']);
    expect(texts('+ -')).toEqual(['+', '-']);
  });

  it('nil true false are symbols at token level', () => {
    expect(kinds('nil true false')).toEqual(['symbol', 'symbol', 'symbol']);
    expect(texts('nil true false')).toEqual(['nil', 'true', 'false']);
  });
});

// -- Keywords --

describe('keywords', () => {
  it('reads simple keywords', () => {
    const tok = tokenize(':foo');
    expect(tok[0].kind).toBe('keyword');
    expect(tok[0].text).toBe(':foo');
  });

  it('reads namespaced keywords', () => {
    expect(texts(':bar/baz')).toEqual([':bar/baz']);
  });

  it('reads auto-resolved keywords', () => {
    expect(texts('::foo')).toEqual(['::foo']);
    expect(kinds('::foo')).toEqual(['keyword']);
  });

  it('lone colon is invalid', () => {
    expect(kinds(': x')).toEqual(['invalid', 'symbol']);
  });
});

// -- Strings --

describe('strings', () => {
  it('reads simple strings', () => {
    const tok = tokenize('"hello"');
    expect(tok[0].kind).toBe('string');
    expect(tok[0].text).toBe('"hello"');
  });

  it('reads strings with escapes', () => {
    const tok = tokenize('"he\\"llo"');
    expect(tok[0].kind).toBe('string');
    expect(tok[0].text).toBe('"he\\"llo"');
  });

  it('reads empty string', () => {
    expect(texts('""')).toEqual(['""']);
  });

  it('unterminated string is invalid', () => {
    expect(kinds('"oops')).toEqual(['invalid']);
  });

  it('string with newline', () => {
    const tok = tokenize('"line1\nline2"');
    expect(tok[0].kind).toBe('string');
  });
});

// -- Numbers --

describe('numbers', () => {
  it('reads integers', () => {
    expect(kinds('42')).toEqual(['integer']);
    expect(texts('42 0 100')).toEqual(['42', '0', '100']);
  });

  it('reads signed integers', () => {
    expect(kinds('-17')).toEqual(['integer']);
    expect(kinds('+5')).toEqual(['integer']);
    expect(texts('-17 +5')).toEqual(['-17', '+5']);
  });

  it('reads floats', () => {
    expect(kinds('3.14')).toEqual(['float']);
    expect(texts('3.14 0.5')).toEqual(['3.14', '0.5']);
  });

  it('reads floats with exponent', () => {
    expect(kinds('1e10')).toEqual(['float']);
    expect(kinds('2.5e-3')).toEqual(['float']);
    expect(texts('1e10 2.5e-3 1E+5')).toEqual(['1e10', '2.5e-3', '1E+5']);
  });

  it('reads hex literals', () => {
    expect(kinds('0xFF')).toEqual(['integer']);
    expect(texts('0xFF 0x2A')).toEqual(['0xFF', '0x2A']);
  });

  it('reads radix literals', () => {
    expect(kinds('2r101010')).toEqual(['integer']);
    expect(texts('2r101010 8r52 36rZZ')).toEqual(['2r101010', '8r52', '36rZZ']);
  });

  it('reads ratio literals', () => {
    expect(kinds('22/7')).toEqual(['ratio']);
    expect(texts('22/7 1/2')).toEqual(['22/7', '1/2']);
  });

  it('reads bigint suffix N', () => {
    expect(kinds('42N')).toEqual(['integer']);
    expect(texts('42N')).toEqual(['42N']);
  });

  it('reads bigdecimal suffix M', () => {
    expect(kinds('3.14M')).toEqual(['float']);
    expect(texts('3.14M')).toEqual(['3.14M']);
  });
});

// -- Character literals --

describe('character literals', () => {
  it('reads single character', () => {
    const tok = tokenize('\\a');
    expect(tok[0].kind).toBe('char');
    expect(tok[0].text).toBe('\\a');
  });

  it('reads named characters', () => {
    expect(texts('\\newline \\space \\tab')).toEqual(['\\newline', '\\space', '\\tab']);
    expect(kinds('\\newline \\space \\tab')).toEqual(['char', 'char', 'char']);
  });

  it('reads unicode character', () => {
    expect(texts('\\u03BB')).toEqual(['\\u03BB']);
  });

  it('backslash at eof is invalid', () => {
    expect(kinds('\\')).toEqual(['invalid']);
  });
});

// -- Macro characters --

describe('macro characters', () => {
  it('reads quote', () => {
    expect(kinds("'foo")).toEqual(['quote', 'symbol']);
  });

  it('reads backtick', () => {
    expect(kinds('`foo')).toEqual(['backtick', 'symbol']);
  });

  it('reads tilde (unquote)', () => {
    expect(kinds('~x')).toEqual(['tilde', 'symbol']);
  });

  it('reads tilde-at (unquote-splicing)', () => {
    expect(kinds('~@xs')).toEqual(['tilde_at', 'symbol']);
  });

  it('reads caret (metadata)', () => {
    expect(kinds('^meta')).toEqual(['caret', 'symbol']);
  });

  it('reads at (deref)', () => {
    expect(kinds('@atom')).toEqual(['at', 'symbol']);
  });

  it('all macro chars in sequence', () => {
    expect(kinds("'a @b ^c `d ~e ~@f")).toEqual([
      'quote', 'symbol',
      'at', 'symbol',
      'caret', 'symbol',
      'backtick', 'symbol',
      'tilde', 'symbol',
      'tilde_at', 'symbol',
    ]);
  });
});

// -- Dispatch tokens --

describe('dispatch tokens', () => {
  it('reads #( as hash_lparen (fn literal)', () => {
    expect(kinds('#(+ %1 %2)')).toEqual([
      'hash_lparen', 'symbol', 'symbol', 'symbol', 'rparen',
    ]);
  });

  it('reads #{ as hash_lbrace (set literal)', () => {
    expect(kinds('#{1 2}')).toEqual(['hash_lbrace', 'integer', 'integer', 'rbrace']);
  });

  it("reads #' as hash_quote (var)", () => {
    expect(kinds("#'foo")).toEqual(['hash_quote', 'symbol']);
  });

  it('reads #_ as hash_underscore (discard)', () => {
    expect(kinds('#_foo')).toEqual(['hash_underscore', 'symbol']);
  });

  it('reads #? as hash_question (reader conditional)', () => {
    expect(kinds('#?(:cljs 1)')).toEqual([
      'hash_question', 'lparen', 'keyword', 'integer', 'rparen',
    ]);
  });

  it('reads #?@ as hash_question_at (reader conditional splicing)', () => {
    expect(kinds('#?@(:cljs [1])')).toEqual([
      'hash_question_at', 'lparen', 'keyword', 'lbracket', 'integer', 'rbracket', 'rparen',
    ]);
  });

  it('reads ## as hash_hash (symbolic value)', () => {
    expect(kinds('##Inf')).toEqual(['hash_hash', 'symbol']);
  });

  it('reads #: as hash_colon (namespaced map)', () => {
    const toks = tokenize('#:foo{:a 1}');
    expect(toks[0].kind).toBe('hash_colon');
    expect(toks[0].text).toBe('#:foo');
  });

  it('reads #:: as hash_colon (auto-resolved namespaced map)', () => {
    const toks = tokenize('#::bar{:a 1}');
    expect(toks[0].kind).toBe('hash_colon');
    expect(toks[0].text).toBe('#::bar');
  });

  it('reads # followed by symbol as hash (tagged literal)', () => {
    const toks = tokenize('#inst "2024-01-01"');
    expect(toks[0].kind).toBe('hash');
    expect(toks[1].kind).toBe('symbol');
    expect(toks[1].text).toBe('inst');
  });

  it('reads regex', () => {
    const toks = tokenize('#"foo.*bar"');
    expect(toks[0].kind).toBe('regex');
    expect(toks[0].text).toBe('#"foo.*bar"');
  });

  it('reads regex with escape', () => {
    const toks = tokenize('#"\\d+"');
    expect(toks[0].kind).toBe('regex');
    expect(toks[0].text).toBe('#"\\d+"');
  });

  it('unterminated regex is invalid', () => {
    expect(kinds('#"oops')).toEqual(['invalid']);
  });

  it('lone # at eof is invalid', () => {
    expect(kinds('#')).toEqual(['invalid']);
  });
});

// -- Line/Column tracking --

describe('line and column tracking', () => {
  it('tracks first token at line 1 col 1', () => {
    const tok = tokenize('foo')[0];
    expect(tok.line).toBe(1);
    expect(tok.col).toBe(1);
  });

  it('tracks column within line', () => {
    const toks = tokenize('(  42)');
    expect(toks[0]).toMatchObject({ kind: 'lparen', line: 1, col: 1 });
    expect(toks[1]).toMatchObject({ kind: 'integer', line: 1, col: 4 });
    expect(toks[2]).toMatchObject({ kind: 'rparen', line: 1, col: 6 });
  });

  it('tracks line after newline', () => {
    const toks = tokenize('(\n  42)');
    expect(toks[0]).toMatchObject({ kind: 'lparen', line: 1, col: 1 });
    expect(toks[1]).toMatchObject({ kind: 'integer', line: 2, col: 3 });
    expect(toks[2]).toMatchObject({ kind: 'rparen', line: 2, col: 5 });
  });

  it('tracks multiple lines', () => {
    const toks = tokenize('a\nb\nc');
    expect(toks[0]).toMatchObject({ line: 1, col: 1 });
    expect(toks[1]).toMatchObject({ line: 2, col: 1 });
    expect(toks[2]).toMatchObject({ line: 3, col: 1 });
  });
});

// -- Complete expressions --

describe('complete expressions', () => {
  it('tokenizes (defn f [x] (+ x 1))', () => {
    const k = kinds('(defn f [x] (+ x 1))');
    expect(k).toEqual([
      'lparen', 'symbol', 'symbol', 'lbracket', 'symbol', 'rbracket',
      'lparen', 'symbol', 'symbol', 'integer', 'rparen', 'rparen',
    ]);
  });

  it('tokenizes {:a 1 :b "two"}', () => {
    const k = kinds('{:a 1 :b "two"}');
    expect(k).toEqual([
      'lbrace', 'keyword', 'integer', 'keyword', 'string', 'rbrace',
    ]);
  });

  it('tokenizes quoted form', () => {
    const k = kinds("'(1 2 3)");
    expect(k).toEqual(['quote', 'lparen', 'integer', 'integer', 'integer', 'rparen']);
  });
});
