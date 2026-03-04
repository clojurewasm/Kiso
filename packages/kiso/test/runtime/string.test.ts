/**
 * Tests for clojure.string runtime module.
 *
 * Matches ClojureScript clojure.string semantics.
 */
import { describe, it, expect } from 'vitest';
import {
  blank_p, capitalize, ends_with_p, escape, includes_p,
  index_of, join, last_index_of, lower_case, replace as strReplace,
  replace_first, reverse, split, split_lines, starts_with_p,
  trim, trim_newline, triml, trimr, upper_case,
} from '../../src/runtime/string.js';

// ── blank? ──

describe('blank?', () => {
  it('nil is blank', () => {
    expect(blank_p(null)).toBe(true);
  });

  it('empty string is blank', () => {
    expect(blank_p('')).toBe(true);
  });

  it('whitespace-only is blank', () => {
    expect(blank_p('  \t\n  ')).toBe(true);
  });

  it('non-empty string is not blank', () => {
    expect(blank_p('hello')).toBe(false);
  });

  it('string with spaces around text is not blank', () => {
    expect(blank_p('  x  ')).toBe(false);
  });
});

// ── capitalize ──

describe('capitalize', () => {
  it('capitalizes first char, lowercases rest', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles all caps', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single char', () => {
    expect(capitalize('a')).toBe('A');
  });
});

// ── ends-with? / starts-with? ──

describe('ends-with?', () => {
  it('returns true when string ends with suffix', () => {
    expect(ends_with_p('hello world', 'world')).toBe(true);
  });

  it('returns false when it does not', () => {
    expect(ends_with_p('hello world', 'hello')).toBe(false);
  });

  it('empty suffix always matches', () => {
    expect(ends_with_p('hello', '')).toBe(true);
  });
});

describe('starts-with?', () => {
  it('returns true when string starts with prefix', () => {
    expect(starts_with_p('hello world', 'hello')).toBe(true);
  });

  it('returns false when it does not', () => {
    expect(starts_with_p('hello world', 'world')).toBe(false);
  });
});

// ── includes? ──

describe('includes?', () => {
  it('returns true when substring found', () => {
    expect(includes_p('hello world', 'lo wo')).toBe(true);
  });

  it('returns false when not found', () => {
    expect(includes_p('hello', 'xyz')).toBe(false);
  });
});

// ── index-of / last-index-of ──

describe('index-of', () => {
  it('finds first occurrence', () => {
    expect(index_of('abcabc', 'b')).toBe(1);
  });

  it('finds from offset', () => {
    expect(index_of('abcabc', 'b', 2)).toBe(4);
  });

  it('returns -1 when not found', () => {
    expect(index_of('abc', 'z')).toBe(-1);
  });
});

describe('last-index-of', () => {
  it('finds last occurrence', () => {
    expect(last_index_of('abcabc', 'b')).toBe(4);
  });

  it('returns -1 when not found', () => {
    expect(last_index_of('abc', 'z')).toBe(-1);
  });
});

// ── join ──

describe('join', () => {
  it('joins with separator', () => {
    expect(join(', ', ['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('joins without separator', () => {
    expect(join(['a', 'b', 'c'])).toBe('abc');
  });

  it('joins empty collection', () => {
    expect(join(', ', [])).toBe('');
  });

  it('converts elements to strings', () => {
    expect(join('-', [1, 2, 3])).toBe('1-2-3');
  });
});

// ── lower-case / upper-case ──

describe('lower-case', () => {
  it('lowercases string', () => {
    expect(lower_case('HELLO')).toBe('hello');
  });

  it('handles mixed case', () => {
    expect(lower_case('HeLLo WoRLd')).toBe('hello world');
  });
});

describe('upper-case', () => {
  it('uppercases string', () => {
    expect(upper_case('hello')).toBe('HELLO');
  });
});

// ── replace ──

describe('replace', () => {
  it('replaces string match (all occurrences)', () => {
    expect(strReplace('hello world hello', 'hello', 'hi')).toBe('hi world hi');
  });

  it('replaces regex match', () => {
    expect(strReplace('abc123def456', /\d+/g, 'N')).toBe('abcNdefN');
  });

  it('no match returns original', () => {
    expect(strReplace('hello', 'xyz', 'abc')).toBe('hello');
  });
});

// ── replace-first ──

describe('replace-first', () => {
  it('replaces only first occurrence', () => {
    expect(replace_first('hello hello', 'hello', 'hi')).toBe('hi hello');
  });

  it('replaces first regex match', () => {
    expect(replace_first('abc123def456', /\d+/, 'N')).toBe('abcNdef456');
  });
});

// ── reverse ──

describe('reverse', () => {
  it('reverses a string', () => {
    expect(reverse('hello')).toBe('olleh');
  });

  it('handles empty string', () => {
    expect(reverse('')).toBe('');
  });

  it('handles single char', () => {
    expect(reverse('a')).toBe('a');
  });
});

// ── split ──

describe('split', () => {
  it('splits by regex', () => {
    expect(split('a,b,c', /,/)).toEqual(['a', 'b', 'c']);
  });

  it('splits by string pattern', () => {
    expect(split('a--b--c', /--/)).toEqual(['a', 'b', 'c']);
  });

  it('splits with limit', () => {
    expect(split('a,b,c,d', /,/, 2)).toEqual(['a', 'b,c,d']);
  });

  it('empty string splits to single element', () => {
    expect(split('', /,/)).toEqual(['']);
  });
});

// ── split-lines ──

describe('split-lines', () => {
  it('splits by newlines', () => {
    expect(split_lines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('splits by \\r\\n', () => {
    expect(split_lines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });
});

// ── trim / triml / trimr / trim-newline ──

describe('trim', () => {
  it('trims both sides', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  it('trims tabs and newlines', () => {
    expect(trim('\t\nhello\t\n')).toBe('hello');
  });
});

describe('triml', () => {
  it('trims left only', () => {
    expect(triml('  hello  ')).toBe('hello  ');
  });
});

describe('trimr', () => {
  it('trims right only', () => {
    expect(trimr('  hello  ')).toBe('  hello');
  });
});

describe('trim-newline', () => {
  it('trims trailing newlines only', () => {
    expect(trim_newline('hello\n\n')).toBe('hello');
  });

  it('trims trailing \\r\\n', () => {
    expect(trim_newline('hello\r\n')).toBe('hello');
  });

  it('does not trim leading newlines', () => {
    expect(trim_newline('\nhello')).toBe('\nhello');
  });

  it('does not trim spaces', () => {
    expect(trim_newline('hello  ')).toBe('hello  ');
  });
});

// ── escape ──

describe('escape', () => {
  it('escapes characters using map', () => {
    const cmap: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
    expect(escape('<div>A & B</div>', cmap)).toBe('&lt;div&gt;A &amp; B&lt;/div&gt;');
  });

  it('returns original when no matches', () => {
    expect(escape('hello', { x: 'y' })).toBe('hello');
  });
});
