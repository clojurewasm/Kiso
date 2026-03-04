// Form — Reader output representing syntactic Clojure data.
//
// Three-phase architecture:
//   Form (Reader) -> Node (Analyzer) -> Value (Runtime)
//
// Form wraps syntactic data with source location.
// Unlike Value (runtime), Form preserves reader-level details
// (e.g., quote syntax, metadata annotation) for the Analyzer.

// -- Types --

export type FormData =
  | { type: 'nil' }
  | { type: 'boolean'; value: boolean }
  | { type: 'integer'; value: number }
  | { type: 'bigint'; value: bigint }
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'char'; value: string }
  | { type: 'keyword'; ns: string | null; name: string }
  | { type: 'symbol'; ns: string | null; name: string }
  | { type: 'list'; items: Form[] }
  | { type: 'vector'; items: Form[] }
  | { type: 'map'; items: Form[] }
  | { type: 'set'; items: Form[] }
  | { type: 'regex'; pattern: string }
  | { type: 'tagged'; tag: string; form: Form }
  | { type: 'ratio'; numerator: string; denominator: string };

export type Form = {
  data: FormData;
  line: number;
  col: number;
  meta?: Form;
};

// -- Constructors --

function make(data: FormData, line = 0, col = 0): Form {
  return { data, line, col };
}

export function makeNil(line = 0, col = 0): Form {
  return make({ type: 'nil' }, line, col);
}

export function makeBool(value: boolean, line = 0, col = 0): Form {
  return make({ type: 'boolean', value }, line, col);
}

export function makeInt(value: number, line = 0, col = 0): Form {
  return make({ type: 'integer', value }, line, col);
}

export function makeBigInt(value: bigint, line = 0, col = 0): Form {
  return make({ type: 'bigint', value }, line, col);
}

export function makeFloat(value: number, line = 0, col = 0): Form {
  return make({ type: 'float', value }, line, col);
}

export function makeStr(value: string, line = 0, col = 0): Form {
  return make({ type: 'string', value }, line, col);
}

export function makeChar(value: string, line = 0, col = 0): Form {
  return make({ type: 'char', value }, line, col);
}

export function makeKeyword(ns: string | null, name: string, line = 0, col = 0): Form {
  return make({ type: 'keyword', ns, name }, line, col);
}

export function makeSymbol(ns: string | null, name: string, line = 0, col = 0): Form {
  return make({ type: 'symbol', ns, name }, line, col);
}

export function makeList(items: Form[], line = 0, col = 0): Form {
  return make({ type: 'list', items }, line, col);
}

export function makeVector(items: Form[], line = 0, col = 0): Form {
  return make({ type: 'vector', items }, line, col);
}

export function makeMap(items: Form[], line = 0, col = 0): Form {
  return make({ type: 'map', items }, line, col);
}

export function makeSet(items: Form[], line = 0, col = 0): Form {
  return make({ type: 'set', items }, line, col);
}

export function makeRegex(pattern: string, line = 0, col = 0): Form {
  return make({ type: 'regex', pattern }, line, col);
}

export function makeRatio(numerator: string, denominator: string, line = 0, col = 0): Form {
  return make({ type: 'ratio', numerator, denominator }, line, col);
}

export function makeTagged(tag: string, form: Form, line = 0, col = 0): Form {
  return make({ type: 'tagged', tag, form }, line, col);
}

// -- Functions --

export function typeName(form: Form): string {
  return form.data.type;
}

/** Clojure truthiness: nil and false are falsy, everything else is truthy. */
export function isTruthy(form: Form): boolean {
  if (form.data.type === 'nil') return false;
  if (form.data.type === 'boolean') return form.data.value;
  return true;
}

/** Print representation (pr-str semantics). */
export function prStr(form: Form): string {
  const d = form.data;
  switch (d.type) {
    case 'nil': return 'nil';
    case 'boolean': return d.value ? 'true' : 'false';
    case 'integer': return String(d.value);
    case 'bigint': return `${d.value}N`;
    case 'float': return formatFloat(d.value);
    case 'string': return `"${escapeString(d.value)}"`;
    case 'char': return formatChar(d.value);
    case 'keyword': return `:${formatName(d.ns, d.name)}`;
    case 'symbol': return formatName(d.ns, d.name);
    case 'list': return `(${d.items.map(prStr).join(' ')})`;
    case 'vector': return `[${d.items.map(prStr).join(' ')}]`;
    case 'map': return formatMap(d.items);
    case 'set': return `#{${d.items.map(prStr).join(' ')}}`;
    case 'regex': return `#"${d.pattern}"`;
    case 'ratio': return `${d.numerator}/${d.denominator}`;
    case 'tagged': return `#${d.tag} ${prStr(d.form)}`;
  }
}

// -- Internal helpers --

function formatName(ns: string | null, name: string): string {
  return ns !== null ? `${ns}/${name}` : name;
}

function formatFloat(n: number): string {
  if (Number.isNaN(n)) return '##NaN';
  if (n === Infinity) return '##Inf';
  if (n === -Infinity) return '##-Inf';
  return String(n);
}

function escapeString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    switch (s[i]) {
      case '"': out += '\\"'; break;
      case '\\': out += '\\\\'; break;
      case '\n': out += '\\n'; break;
      case '\r': out += '\\r'; break;
      case '\t': out += '\\t'; break;
      case '\b': out += '\\b'; break;
      case '\f': out += '\\f'; break;
      default: out += s[i];
    }
  }
  return out;
}

function formatChar(c: string): string {
  switch (c) {
    case '\n': return '\\newline';
    case '\r': return '\\return';
    case '\t': return '\\tab';
    case ' ': return '\\space';
    case '\b': return '\\backspace';
    case '\f': return '\\formfeed';
    default: return `\\${c}`;
  }
}

function formatMap(items: Form[]): string {
  const pairs: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const k = items[i]!;
    const v = items[i + 1];
    pairs.push(v !== undefined ? `${prStr(k)} ${prStr(v)}` : prStr(k));
  }
  return `{${pairs.join(', ')}}`;
}
