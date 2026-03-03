// Vite Plugin — Transform .cljs/.cljc files to JavaScript.

import { compile } from './compiler.js';

export type CljsPluginOptions = Record<string, never>;

type VitePlugin = {
  name: string;
  transform: (code: string, id: string) => { code: string; map?: unknown } | null;
};

/** Create a Vite plugin for compiling ClojureScript. */
export function cljs(_options?: CljsPluginOptions): VitePlugin {
  return {
    name: 'vite-plugin-clojurescript',
    transform(code: string, id: string) {
      if (!id.endsWith('.cljs') && !id.endsWith('.cljc')) return null;
      const result = compile(code, { filename: id, sourceMap: true });
      return { code: result.code, map: result.map };
    },
  };
}
