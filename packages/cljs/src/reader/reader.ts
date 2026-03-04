// Reader — Converts token stream into Form syntax tree.
//
// Three-phase architecture:
//   Source text -> Tokenizer -> Reader -> Form (syntax tree)
//
// Reader macros (quote, deref, meta, etc.) are expanded at read time
// into standard list forms: 'x -> (quote x), @x -> (deref x), etc.

import { Tokenizer, type Token, type TokenKind } from './tokenizer.js';
import {
  type Form,
  makeNil,
  makeBool,
  makeInt,
  makeBigInt,
  makeFloat,
  makeStr,
  makeChar,
  makeKeyword,
  makeSymbol,
  makeList,
  makeVector,
  makeMap,
  makeSet,
  makeRegex,
  makeRatio,
  makeTagged,
} from './form.js';

export class ReaderError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(`${message} at ${line}:${col}`);
    this.name = 'ReaderError';
    this.line = line;
    this.col = col;
  }
}

const MAX_NESTING_DEPTH = 1024;

class Reader {
  private tokenizer: Tokenizer;
  private peeked: Token | null = null;
  private depth = 0;

  constructor(source: string) {
    this.tokenizer = new Tokenizer(source);
  }

  read(): Form | null {
    const token = this.nextToken();
    if (token.kind === 'eof') return null;
    return this.readForm(token);
  }

  readAll(): Form[] {
    const forms: Form[] = [];
    for (;;) {
      const form = this.read();
      if (form === null) break;
      forms.push(form);
    }
    return forms;
  }

  // -- Token access --

  private nextToken(): Token {
    if (this.peeked !== null) {
      const tok = this.peeked;
      this.peeked = null;
      return tok;
    }
    return this.tokenizer.next();
  }


  // -- Main dispatch --

  private readForm(token: Token): Form {
    switch (token.kind) {
      case 'symbol': return this.readSymbol(token);
      case 'keyword': return this.readKeyword(token);
      case 'integer': return this.readInteger(token);
      case 'float': return this.readFloat(token);
      case 'ratio': return this.readRatio(token);
      case 'string': return this.readString(token);
      case 'char': return this.readCharacter(token);
      case 'lparen': return this.readList(token);
      case 'lbracket': return this.readVector(token);
      case 'lbrace': return this.readMap(token);
      case 'hash_lbrace': return this.readSet(token);
      case 'quote': return this.readWrapped('quote', token);
      case 'at': return this.readWrapped('deref', token);
      case 'hash_quote': return this.readWrapped('var', token);
      case 'tilde': return this.readWrapped('unquote', token);
      case 'tilde_at': return this.readWrapped('unquote-splicing', token);
      case 'hash_underscore': return this.readDiscard(token);
      case 'caret': return this.readMeta(token);
      case 'regex': return this.readRegex(token);
      case 'hash_hash': return this.readSymbolic(token);
      case 'hash_lparen': return this.readFnLit(token);
      case 'hash': return this.readTagged(token);
      case 'backtick': return this.readWrapped('syntax-quote', token);
      case 'hash_colon': return this.readNsMap(token);
      case 'rparen': throw this.error('Unmatched )', token);
      case 'rbracket': throw this.error('Unmatched ]', token);
      case 'rbrace': throw this.error('Unmatched }', token);
      case 'invalid': throw this.error('Invalid token', token);
      default: throw this.error(`Unexpected token: ${token.kind}`, token);
    }
  }

  // -- Literals --

  private readSymbol(token: Token): Form {
    const text = token.text;
    if (text === 'nil') return makeNil(token.line, token.col);
    if (text === 'true') return makeBool(true, token.line, token.col);
    if (text === 'false') return makeBool(false, token.line, token.col);

    const { ns, name } = parseQualifiedName(text);
    if (ns !== null && name === '') {
      throw this.error('Invalid symbol: trailing slash', token);
    }
    return makeSymbol(ns, name, token.line, token.col);
  }

  private readKeyword(token: Token): Form {
    let text = token.text;
    // Strip leading :
    text = text.slice(1);
    // Strip second : for auto-resolved
    if (text.startsWith(':')) {
      text = text.slice(1);
    }

    const { ns, name } = parseQualifiedName(text);
    if (ns !== null && name === '') {
      throw this.error('Invalid keyword: trailing slash', token);
    }
    return makeKeyword(ns, name, token.line, token.col);
  }

  private readInteger(token: Token): Form {
    const text = token.text;

    // BigDecimal: 42M
    if (text.endsWith('M')) {
      // Integer with M → bigint semantically, but per Clojure it's BigDecimal
      // For now, treat 42M as bigint (will be refined in runtime)
      return makeBigInt(BigInt(text.slice(0, -1)), token.line, token.col);
    }

    // BigInt: 42N
    if (text.endsWith('N')) {
      return makeBigInt(BigInt(normalizeIntText(text.slice(0, -1))), token.line, token.col);
    }

    const value = parseIntegerValue(text);
    if (Number.isSafeInteger(value)) {
      return makeInt(value, token.line, token.col);
    }
    // Overflow → bigint
    return makeBigInt(BigInt(normalizeIntText(text)), token.line, token.col);
  }

  private readFloat(token: Token): Form {
    let text = token.text;
    if (text.endsWith('M')) {
      text = text.slice(0, -1);
    }
    const value = parseFloat(text);
    return makeFloat(value, token.line, token.col);
  }

  private readRatio(token: Token): Form {
    const slashIdx = token.text.indexOf('/');
    const num = token.text.slice(0, slashIdx);
    const den = token.text.slice(slashIdx + 1);
    if (parseInt(den, 10) === 0) {
      throw this.error('Division by zero in ratio', token);
    }
    return makeRatio(num, den, token.line, token.col);
  }

  private readString(token: Token): Form {
    // Strip surrounding quotes
    const content = token.text.slice(1, -1);
    const unescaped = unescapeString(content, token);
    return makeStr(unescaped, token.line, token.col);
  }

  private readCharacter(token: Token): Form {
    // text starts with \
    const name = token.text.slice(1);
    const ch = parseCharName(name, token);
    return makeChar(ch, token.line, token.col);
  }

  private readRegex(token: Token): Form {
    // #"..." → strip #" and "
    const pattern = token.text.slice(2, -1);
    return makeRegex(pattern, token.line, token.col);
  }

  private readSymbolic(token: Token): Form {
    const next = this.nextToken();
    if (next.kind !== 'symbol') {
      throw this.error('Expected symbolic value after ##', next);
    }
    switch (next.text) {
      case 'Inf': return makeFloat(Infinity, token.line, token.col);
      case '-Inf': return makeFloat(-Infinity, token.line, token.col);
      case 'NaN': return makeFloat(NaN, token.line, token.col);
      default: throw this.error(`Unknown symbolic value: ${next.text}`, next);
    }
  }

  // -- Collections --

  private readList(token: Token): Form {
    const items = this.readDelimited('rparen');
    return makeList(items, token.line, token.col);
  }

  private readVector(token: Token): Form {
    const items = this.readDelimited('rbracket');
    return makeVector(items, token.line, token.col);
  }

  private readMap(token: Token): Form {
    const items = this.readDelimited('rbrace');
    if (items.length % 2 !== 0) {
      throw this.error('Map literal must have even number of forms', token);
    }
    return makeMap(items, token.line, token.col);
  }

  private readNsMap(token: Token): Form {
    // token.text is "#:foo", "#::bar", or "#::"
    const text = token.text;
    let ns: string;
    if (text.startsWith('#::')) {
      // #::bar or #:: (auto-resolve — use the suffix as ns for now)
      ns = text.slice(3); // "" for #::, "bar" for #::bar
    } else {
      // #:foo
      ns = text.slice(2);
    }

    // Next token must be lbrace
    const next = this.nextToken();
    if (next.kind !== 'lbrace') {
      throw this.error('Expected { after namespaced map prefix', next);
    }
    const items = this.readDelimited('rbrace');
    if (items.length % 2 !== 0) {
      throw this.error('Map literal must have even number of forms', token);
    }

    // Qualify unqualified keys
    if (ns) {
      for (let i = 0; i < items.length; i += 2) {
        const key = items[i]!;
        if (key.data.type === 'keyword' && !(key.data.ns as string | null)) {
          items[i] = makeKeyword(ns, key.data.name as string, key.line, key.col);
        } else if (key.data.type === 'symbol' && !(key.data.ns as string | null)) {
          items[i] = makeSymbol(ns, key.data.name as string, key.line, key.col);
        }
      }
    }
    return makeMap(items, token.line, token.col);
  }

  private readSet(token: Token): Form {
    const items = this.readDelimited('rbrace');
    return makeSet(items, token.line, token.col);
  }

  private readDelimited(closing: TokenKind): Form[] {
    if (++this.depth > MAX_NESTING_DEPTH) {
      throw new ReaderError('Maximum nesting depth exceeded', 0, 0);
    }
    const items: Form[] = [];
    try {
      for (;;) {
        const tok = this.nextToken();
        if (tok.kind === 'eof') {
          throw this.error('EOF while reading collection', tok);
        }
        if (tok.kind === closing) break;
        items.push(this.readForm(tok));
      }
    } finally {
      this.depth--;
    }
    return items;
  }

  // -- Reader macros --

  private readWrapped(wrapperName: string, startToken: Token): Form {
    const next = this.nextToken();
    if (next.kind === 'eof') {
      throw this.error(`EOF after ${wrapperName}`, next);
    }
    const inner = this.readForm(next);
    return makeList(
      [makeSymbol(null, wrapperName), inner],
      startToken.line,
      startToken.col,
    );
  }

  private readDiscard(startToken: Token): Form {
    const next = this.nextToken();
    if (next.kind === 'eof') {
      throw this.error('EOF after #_', next);
    }
    // Read and discard
    this.readForm(next);
    // Return the next real form
    const following = this.read();
    return following ?? makeNil(startToken.line, startToken.col);
  }

  private readMeta(startToken: Token): Form {
    // Read metadata form
    const metaTok = this.nextToken();
    if (metaTok.kind === 'eof') {
      throw this.error('EOF after ^', metaTok);
    }
    const metaForm = this.readForm(metaTok);

    // Read target form
    const targetTok = this.nextToken();
    if (targetTok.kind === 'eof') {
      throw this.error('EOF after metadata', targetTok);
    }
    const targetForm = this.readForm(targetTok);

    // Normalize metadata to map
    let metaMap: Form;
    if (metaForm.data.type === 'keyword') {
      metaMap = makeMap([
        makeKeyword(metaForm.data.ns, metaForm.data.name),
        makeBool(true),
      ]);
    } else if (metaForm.data.type === 'map') {
      metaMap = metaForm;
    } else if (metaForm.data.type === 'symbol') {
      metaMap = makeMap([
        makeKeyword(null, 'tag'),
        makeSymbol(metaForm.data.ns, metaForm.data.name),
      ]);
    } else {
      throw this.error('Invalid metadata form', metaTok);
    }

    return makeList(
      [makeSymbol(null, 'with-meta'), targetForm, metaMap],
      startToken.line,
      startToken.col,
    );
  }

  private readFnLit(token: Token): Form {
    // #(body) → (fn* [%1 %2 ...] (body))
    const body = this.readDelimited('rparen');

    // Scan for %, %N, %& parameters
    let maxParam = 0;
    let hasRest = false;
    for (const form of body) {
      scanFnLitParams(form, (n) => { if (n > maxParam) maxParam = n; }, () => { hasRest = true; });
    }

    // Build parameter vector
    const params: Form[] = [];
    for (let i = 1; i <= maxParam; i++) {
      params.push(makeSymbol(null, `%${i}`));
    }
    if (hasRest) {
      params.push(makeSymbol(null, '&'));
      params.push(makeSymbol(null, '%&'));
    }

    // Normalize % to %1 in body
    const normalizedBody = body.map(normalizeFnLitPercent);

    return makeList(
      [
        makeSymbol(null, 'fn*'),
        makeVector(params),
        makeList(normalizedBody),
      ],
      token.line,
      token.col,
    );
  }

  private readTagged(token: Token): Form {
    // # followed by a symbol → tagged literal
    const next = this.nextToken();
    if (next.kind !== 'symbol') {
      throw this.error('Expected tag symbol after #', next);
    }
    const tag = next.text;
    const valueTok = this.nextToken();
    if (valueTok.kind === 'eof') {
      throw this.error('EOF after tag', valueTok);
    }
    const value = this.readForm(valueTok);
    return makeTagged(tag, value, token.line, token.col);
  }

  // -- Helpers --

  private error(message: string, token: Token): ReaderError {
    return new ReaderError(message, token.line, token.col);
  }
}

// -- Public API --

export function readStr(source: string): Form | null {
  return new Reader(source).read();
}

export function readAllStr(source: string): Form[] {
  return new Reader(source).readAll();
}

// -- Internal helpers --

function parseQualifiedName(text: string): { ns: string | null; name: string } {
  const idx = text.indexOf('/');
  if (idx === -1) return { ns: null, name: text };
  // "/" alone is the division symbol
  if (idx === 0 && text.length === 1) return { ns: null, name: text };
  return { ns: text.slice(0, idx), name: text.slice(idx + 1) };
}

function parseIntegerValue(text: string): number {
  let s = text;
  let sign = 1;
  if (s.startsWith('-')) { sign = -1; s = s.slice(1); }
  else if (s.startsWith('+')) { s = s.slice(1); }

  // Hex
  if (s.startsWith('0x') || s.startsWith('0X')) {
    return sign * parseInt(s.slice(2), 16);
  }

  // Radix NNrXXX
  const rIdx = s.search(/[rR]/);
  if (rIdx !== -1) {
    const radix = parseInt(s.slice(0, rIdx), 10);
    return sign * parseInt(s.slice(rIdx + 1), radix);
  }

  // Octal 0NNN
  if (s.length > 1 && s.startsWith('0') && /^[0-7]+$/.test(s)) {
    return sign * parseInt(s, 8);
  }

  // Decimal
  return sign * parseInt(s, 10);
}

function normalizeIntText(text: string): string {
  // Convert hex/radix/octal to decimal string for BigInt
  const value = parseIntegerValue(text);
  if (Number.isSafeInteger(value)) return String(value);
  // If overflow, the text must be decimal — pass through
  let s = text;
  if (s.startsWith('+')) s = s.slice(1);
  return s;
}

function unescapeString(s: string, token: Token): string {
  if (!s.includes('\\')) return s;
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
        if (hex.length !== 4) {
          throw new ReaderError('Invalid unicode escape', token.line, token.col);
        }
        result += String.fromCodePoint(parseInt(hex, 16));
        i += 4;
        break;
      }
      default:
        throw new ReaderError(`Unsupported escape character: \\${s[i]}`, token.line, token.col);
    }
  }
  return result;
}

function parseCharName(name: string, token: Token): string {
  if (name.length === 1) return name;
  switch (name) {
    case 'newline': return '\n';
    case 'space': return ' ';
    case 'tab': return '\t';
    case 'return': return '\r';
    case 'backspace': return '\b';
    case 'formfeed': return '\f';
  }
  // Unicode \uXXXX
  if (name.length === 5 && name.startsWith('u')) {
    const cp = parseInt(name.slice(1), 16);
    if (!isNaN(cp)) return String.fromCodePoint(cp);
  }
  // Octal \oNNN
  if (name.length >= 2 && name.length <= 4 && name.startsWith('o')) {
    const val = parseInt(name.slice(1), 8);
    if (!isNaN(val) && val <= 0o377) return String.fromCodePoint(val);
  }
  throw new ReaderError(`Unknown character name: ${name}`, token.line, token.col);
}

function scanFnLitParams(form: Form, onParam: (n: number) => void, onRest: () => void): void {
  if (form.data.type === 'symbol' && form.data.ns === null) {
    const name = form.data.name;
    if (name === '%' || name === '%1') {
      onParam(1);
    } else if (name === '%&') {
      onRest();
    } else if (name.startsWith('%')) {
      const n = parseInt(name.slice(1), 10);
      if (!isNaN(n) && n > 0 && n <= 20) onParam(n);
    }
  }
  // Recurse into collections
  if ('items' in form.data) {
    for (const item of (form.data as { items: Form[] }).items) {
      scanFnLitParams(item, onParam, onRest);
    }
  }
}

function normalizeFnLitPercent(form: Form): Form {
  if (form.data.type === 'symbol' && form.data.ns === null && form.data.name === '%') {
    return makeSymbol(null, '%1', form.line, form.col);
  }
  if ('items' in form.data) {
    const data = form.data as { type: string; items: Form[] };
    const newItems = data.items.map(normalizeFnLitPercent);
    const newData = { ...form.data, items: newItems } as Form['data'];
    return { ...form, data: newData };
  }
  return form;
}
