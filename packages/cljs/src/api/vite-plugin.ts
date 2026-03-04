// Vite Plugin — Transform .cljs/.cljc files to JavaScript.

import { compile } from './compiler.js';

export type CljsPluginOptions = Record<string, never>;

type HotUpdateCtx = {
  file: string;
  modules: unknown[];
};

type ViteConfig = {
  resolve?: { alias?: Record<string, string> };
};

type VitePlugin = {
  name: string;
  config: () => ViteConfig;
  transform: (code: string, id: string) => { code: string; map?: unknown } | null;
  handleHotUpdate: (ctx: HotUpdateCtx) => unknown[] | undefined;
};

function isCljsFile(id: string): boolean {
  return id.endsWith('.cljs') || id.endsWith('.cljc');
}

/** Create a Vite plugin for compiling ClojureScript. */
export function cljs(_options?: CljsPluginOptions): VitePlugin {
  return {
    name: 'vite-plugin-clojurescript',
    config() {
      return {
        resolve: {
          alias: {
            'su/core.js': '@kiso/su',
          },
        },
      };
    },
    transform(code: string, id: string) {
      if (!isCljsFile(id)) return null;
      const result = compile(code, { filename: id, sourceMap: true });
      return { code: result.code, map: result.map };
    },
    handleHotUpdate(ctx: HotUpdateCtx) {
      if (!isCljsFile(ctx.file)) return undefined;
      // Return affected modules to trigger re-transform
      return ctx.modules;
    },
  };
}
