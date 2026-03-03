# Reader Design — CW Knowledge Port

## Design Approach

CW's Reader uses 3 files (tokenizer.zig 795 lines, reader.zig 1601 lines, form.zig 485 lines)
to handle all Clojure syntax. The TS port adopts the same 3-layer structure.

---

## Form Data Model

```typescript
// form.ts
export type Form = {
  data: FormData;
  line: number;      // 1-indexed
  col: number;       // 1-indexed
  meta?: Form;       // ^metadata
};

export type FormData =
  | { type: 'nil' }
  | { type: 'boolean'; value: boolean }
  | { type: 'integer'; value: number }      // safe integer range
  | { type: 'bigint'; value: bigint }       // beyond safe integer
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'char'; value: string }         // single character
  | { type: 'keyword'; ns: string | null; name: string }
  | { type: 'symbol'; ns: string | null; name: string }
  | { type: 'list'; items: Form[] }
  | { type: 'vector'; items: Form[] }
  | { type: 'map'; items: Form[] }          // flat [k, v, k, v, ...]
  | { type: 'set'; items: Form[] }
  | { type: 'regex'; pattern: string }
  | { type: 'tagged'; tag: string; form: Form }
  | { type: 'ratio'; numerator: string; denominator: string };
```

**Difference from CW**: CW uses NaN-boxing to pack values into 64 bits.
TS uses a straightforward tagged union — V8's object optimization handles it well.

---

## Tokenizer

```typescript
// tokenizer.ts
export type TokenKind =
  | 'lparen' | 'rparen'       // ( )
  | 'lbracket' | 'rbracket'   // [ ]
  | 'lbrace' | 'rbrace'       // { }
  | 'quote'                     // '
  | 'backtick'                  // `
  | 'tilde'                     // ~
  | 'tilde_at'                  // ~@
  | 'caret'                     // ^
  | 'at'                        // @
  | 'hash'                      // #
  | 'hash_lparen'               // #(
  | 'hash_lbrace'               // #{
  | 'hash_quote'                // #'
  | 'hash_underscore'           // #_
  | 'hash_question'             // #?
  | 'hash_question_at'          // #?@
  | 'hash_colon'                // #: (namespaced map)
  | 'hash_hash'                 // ## (symbolic)
  | 'integer' | 'float' | 'ratio'
  | 'string' | 'char'
  | 'symbol' | 'keyword'
  | 'regex'
  | 'eof';

export type Token = {
  kind: TokenKind;
  text: string;          // slice of source string
  line: number;
  col: number;
};

export class Tokenizer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;

  next(): Token { ... }
}
```

### Key Tokenizer Lessons from CW

1. **Comma is whitespace** — `[1, 2, 3]` = `[1 2 3]`
2. **Escape processing deferred to Reader** — Tokenizer only recognizes byte boundaries
3. **Number classification is complex** — sign → hex/radix/octal → decimal → ratio → float → suffix(N/M)
4. **Regex `#"..."` preserves escapes** — `\"` for token boundary only, contents pass through
5. **`~@` is 1 token** — not `~` + `@`
6. **`#?@` is also 1 token** — reader conditional splicing

---

## Reader

### Reader Macro Reference (all 12 types from CW)

| Syntax     | Expansion                      | Complexity | Notes |
|------------|--------------------------------|------------|-------|
| `'x`       | `(quote x)`                    | Low        | |
| `` `x ``   | syntax-quote expansion         | **Highest**| gensym, ns resolution, special form table |
| `~x`       | `(unquote x)`                  | Low        | Only valid inside syntax-quote |
| `~@x`      | `(unquote-splicing x)`         | Low        | Same |
| `@x`       | `(deref x)`                    | Low        | |
| `#'x`      | `(var x)`                      | Low        | |
| `^meta x`  | `(with-meta x meta)`           | Medium     | normalize keyword/symbol/map |
| `#_x`      | (discard x, return next form)  | Low        | Returns nil at EOF |
| `#(...)`   | `(fn* [%1...] ...)`            | Medium     | % parameter extraction, limit %20 |
| `#{...}`   | set literal                    | Low        | Duplicate detection |
| `#"..."`   | regex literal                  | Low        | |
| `#?(...)`  | reader conditional             | Medium     | Priority: `:cljs > :cljc > :default` |

### Syntax-quote (Most Complex) — CW Implementation Knowledge

CW's syntax-quote implementation is the most complex part of reader.zig (~200 lines).

```typescript
function expandSyntaxQuote(form: Form, ctx: SyntaxQuoteContext): Form {
  // 1. Literals (nil, boolean, number, string, keyword, char)
  //    → (quote literal)

  // 2. Symbols
  //    → qualified name resolution + gensym
  //    a. foo# → foo__<counter>__auto (gensym)
  //    b. unqualified & not special form → qualify with current ns
  //    c. unqualified & special form → leave unqualified
  //    d. already qualified → leave as-is

  // 3. unquote (~x)
  //    → return x as-is (no expansion)

  // 4. unquote-splicing (~@x)
  //    → only valid inside collections. splice marker

  // 5. Collections (list, vector, map, set)
  //    → recursively expand each element
  //    → if unquote-splicing present, join with concat
  //    → (apply vector (concat ...)) etc.
}
```

**Edge cases fixed in CW**:
- **Special form table**: `if`, `do`, `let`, `fn*`, `def`, `quote`, `loop`, `recur`, `try`, `catch`, `finally`, `throw`, `new`, `.`, `set!`, `var`, `defmacro`, `instance?`, `case*`, `ns`, `ns*`, `deftype*`, `defrecord*`, `&`, `js*` — these are NOT namespace-qualified
- **Gensym map**: reset per syntax-quote invocation (nested `` ` `` gets a new map)
- **Anonymous fn parameters** (`%`, `%1`, `%&`): not namespace-qualified (like special forms)

### Namespaced Map — CW Implementation Knowledge

```typescript
// #:ns{:a 1}     → {:ns/a 1}
// #::alias{:a 1} → {(resolved-ns)/a 1}
// #::{:a 1}      → {:current-ns/a 1}

function expandNamespacedMap(nsToken: string, mapForm: Form, ctx: ReaderContext): Form {
  const isAutoResolve = nsToken.startsWith('::');
  const nsName = isAutoResolve ? nsToken.slice(2) : nsToken.slice(1);

  let resolvedNs: string;
  if (isAutoResolve && nsName === '') {
    resolvedNs = ctx.currentNs ?? 'user';
  } else if (isAutoResolve) {
    resolvedNs = ctx.resolveAlias(nsName) ?? nsName;
  } else {
    resolvedNs = nsName;
  }

  // Transform keys only. Values unchanged.
  // Already-qualified keys are skipped.
  return transformMapKeys(mapForm, (key) => {
    if (key.data.type === 'keyword' && key.data.ns === null) {
      return { ...key, data: { ...key.data, ns: resolvedNs } };
    }
    if (key.data.type === 'symbol' && key.data.ns === null) {
      return { ...key, data: { ...key.data, ns: resolvedNs } };
    }
    return key; // already qualified or non-keyword/symbol
  });
}
```

### Number Literal Decision Tree (CW Port)

```typescript
function parseNumber(text: string): FormData {
  // 1. Suffix check
  if (text.endsWith('N')) return parseBigInt(text.slice(0, -1));
  if (text.endsWith('M')) return parseBigDecimal(text.slice(0, -1));

  // 2. Ratio check
  if (text.includes('/') && !text.includes('.')) {
    const [num, den] = text.split('/');
    if (den === '0') throw new ReaderError('Divide by zero');
    return { type: 'ratio', numerator: num, denominator: den };
  }

  // 3. Hex
  if (text.startsWith('0x') || text.startsWith('0X') ||
      text.startsWith('+0x') || text.startsWith('-0x')) {
    return parseIntegerRadix(text, 16);
  }

  // 4. Radix (NNrDIGITS)
  const radixMatch = text.match(/^([+-]?)(\d{1,2})[rR](.+)$/);
  if (radixMatch) {
    const radix = parseInt(radixMatch[2]);
    if (radix < 2 || radix > 36) throw new ReaderError('Invalid radix');
    return parseIntegerRadix(radixMatch[1] + radixMatch[3], radix);
  }

  // 5. Octal (0NNN, all digits 0-7)
  if (/^[+-]?0\d+$/.test(text) && /^[+-]?0[0-7]+$/.test(text)) {
    return parseIntegerRadix(text, 8);
  }

  // 6. Float (decimal point or exponent)
  if (text.includes('.') || /[eE]/.test(text)) {
    return { type: 'float', value: parseFloat(text) };
  }

  // 7. Regular integer
  const n = Number(text);
  if (Number.isSafeInteger(n)) {
    return { type: 'integer', value: n };
  }
  return { type: 'bigint', value: BigInt(text) };
}
```

### String Unescape (CW Port)

```typescript
function unescapeString(s: string): string {
  if (!s.includes('\\')) return s;  // optimization: no copy needed if no escapes

  let result = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') { result += s[i]; continue; }
    i++;
    switch (s[i]) {
      case 'n': result += '\n'; break;
      case 't': result += '\t'; break;
      case 'r': result += '\r'; break;
      case 'b': result += '\b'; break;
      case 'f': result += '\f'; break;
      case '\\': result += '\\'; break;
      case '"': result += '"'; break;
      case 'u': {
        const hex = s.slice(i + 1, i + 5);
        if (hex.length !== 4) throw new ReaderError('Invalid unicode escape');
        result += String.fromCodePoint(parseInt(hex, 16));
        i += 4;
        break;
      }
      default:
        throw new ReaderError(`Unsupported escape character: \\${s[i]}`);
        // Same as CW: unknown escapes are errors (strict Clojure behavior)
    }
  }
  return result;
}
```

---

## Test Strategy

Test cases to port from CW's Reader tests:

```typescript
// Basic literals
read('nil')           // → { type: 'nil' }
read('42')            // → { type: 'integer', value: 42 }
read('0xff')          // → { type: 'integer', value: 255 }
read('2r101')         // → { type: 'integer', value: 5 }
read('36rZZ')         // → { type: 'integer', value: 1295 }
read('3.14')          // → { type: 'float', value: 3.14 }
read('1/3')           // → { type: 'ratio', ... }
read('##Inf')         // → { type: 'float', value: Infinity }
read('##NaN')         // → { type: 'float', value: NaN }

// Character literals
read('\\a')           // → { type: 'char', value: 'a' }
read('\\newline')     // → { type: 'char', value: '\n' }
read('\\u03BB')       // → { type: 'char', value: 'λ' }

// String escapes
read('"hello\\nworld"') // → "hello\nworld"
read('"\\u03BB"')       // → "λ"
// read('"\\x"')         // → ERROR (strict)

// Reader macros
read("'x")             // → (quote x)
read('@x')             // → (deref x)
read("#'x")            // → (var x)
read('#_(ignored) 42') // → 42
read('#(+ % 1)')       // → (fn* [%1] (+ %1 1))
read('#{1 2 3}')       // → set

// Edge cases (fixed in CW)
read('foo/')           // → ERROR (trailing slash)
read(':foo/')          // → ERROR
read('{:a 1 :a 2}')   // → ERROR (duplicate key)
```

---

## Size Estimate

```
tokenizer.ts:    ~300 lines (CW 795 → TS string ops are easier)
reader.ts:       ~600 lines (CW 1601 → TS needs no GC/memory management)
form.ts:         ~100 lines (CW 485 → TS type definitions are concise)
───────────────────────
Total: ~1,000 lines (excluding tests)
Tests: ~500 lines
```

About 1/3 of CW (2,881 lines). Savings from no Zig memory management / error handling.
