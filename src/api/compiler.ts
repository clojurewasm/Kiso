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

/** Compile ClojureScript source to JavaScript. */
export function compile(source: string, options?: CompileOptions): CompileResult {
  const forms = readAllStr(source);
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
