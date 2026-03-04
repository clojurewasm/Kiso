// Public API — compile, read, analyze, generate.
//
// Single-entry-point for compiling ClojureScript to JavaScript.

import { readStr, readAllStr } from '../reader/reader.js';
import { Analyzer } from '../analyzer/analyzer.js';
import { emit, emitModule } from '../codegen/emitter.js';
import { SourceMapBuilder, type SourceMapV3 } from '../codegen/sourcemap.js';
import type { Form } from '../reader/form.js';
import type { Node } from '../analyzer/node.js';

export type CompileOptions = {
  filename?: string;
  sourceMap?: boolean;
};

export type CompileResult = {
  code: string;
  map?: SourceMapV3;
};

const analyzer = new Analyzer();

/** Read a single form from source. */
export function read(source: string): Form | null {
  return readStr(source);
}

/** Read all forms from source. */
export function readAll(source: string): Form[] {
  return readAllStr(source);
}

/** Analyze a form into a Node. */
export function analyze(form: Form): Node {
  return analyzer.analyze(form);
}

/** Generate JavaScript from a Node. */
export function generate(node: Node): string {
  return emit(node);
}

/** Extract namespace name from the first (ns ...) form, if present. */
function extractNsName(forms: Form[]): string | null {
  if (forms.length === 0) return null;
  const first = forms[0]!;
  if (first.data.type !== 'list' || first.data.items.length < 2) return null;
  const head = first.data.items[0]!;
  if (head.data.type !== 'symbol' || head.data.name !== 'ns') return null;
  const nameForm = first.data.items[1]!;
  if (nameForm.data.type !== 'symbol') return null;
  return nameForm.data.ns ? `${nameForm.data.ns}.${nameForm.data.name}` : nameForm.data.name;
}

/** Deep-walk forms, replacing keyword ns "__auto__" with the actual namespace. */
function resolveAutoKeywords(forms: Form[], nsName: string): Form[] {
  function walkForm(form: Form): Form {
    const d = form.data;
    if (d.type === 'keyword' && d.ns === '__auto__') {
      return { ...form, data: { type: 'keyword', ns: nsName, name: d.name } };
    }
    if (d.type === 'list' || d.type === 'vector' || d.type === 'set') {
      return { ...form, data: { ...d, items: d.items.map(walkForm) } };
    }
    if (d.type === 'map') {
      return { ...form, data: { ...d, items: d.items.map(walkForm) } };
    }
    if (d.type === 'tagged') {
      return { ...form, data: { ...d, form: walkForm(d.form) } };
    }
    return form;
  }
  return forms.map(walkForm);
}

/** Compile ClojureScript source to JavaScript. */
export function compile(source: string, options?: CompileOptions): CompileResult {
  let forms = readAllStr(source);
  const nsName = extractNsName(forms);
  if (nsName) {
    forms = resolveAutoKeywords(forms, nsName);
  }
  const nodes = forms.map((f) => analyzer.analyze(f));
  const code = emitModule(nodes);

  let map: SourceMapV3 | undefined;
  if (options?.sourceMap) {
    const filename = options.filename ?? 'input.cljs';
    const builder = new SourceMapBuilder(filename.replace(/\.cljs$/, '.js'), filename, source);
    // Basic mapping: first form → line 0, col 0
    // Full source mapping requires emitter position tracking (deferred)
    if (forms.length > 0) {
      builder.addMapping(0, 0, forms[0]!.line, forms[0]!.col);
    }
    map = builder.toJSON();
  }

  return { code, map };
}
