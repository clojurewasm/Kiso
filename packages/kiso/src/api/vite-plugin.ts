// Vite Plugin — Transform .cljs/.cljc files to JavaScript.

import { compile } from './compiler.js';
import type { CodegenHook } from '../codegen/emitter.js';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type CljsPluginOptions = {
  codegenHooks?: Record<string, CodegenHook>;
};

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
  resolveId: (source: string, importer: string | undefined) => string | null;
  transform: (code: string, id: string) => { code: string; map?: unknown } | null;
  handleHotUpdate: (ctx: HotUpdateCtx) => unknown[] | undefined;
};

function isCljsFile(id: string): boolean {
  return id.endsWith('.cljs') || id.endsWith('.cljc');
}

/** Create a Vite plugin for compiling ClojureScript. */
export function cljs(options?: CljsPluginOptions): VitePlugin {
  return {
    name: 'vite-plugin-clojurescript',
    config() {
      return {
        resolve: {
          alias: {
            'su/core.js': '@clojurewasm/su',
            'clojure/string.js': '@clojurewasm/kiso/runtime/string',
            'clojure/set.js': '@clojurewasm/kiso/runtime/set',
            'clojure/walk.js': '@clojurewasm/kiso/runtime/walk',
          },
        },
      };
    },
    resolveId(source: string, importer: string | undefined) {
      // Rewrite .js imports from codegen to .cljs/.cljc when the source file exists
      if (!source.endsWith('.js') || !importer || !isCljsFile(importer)) return null;
      const dir = dirname(importer);
      const base = source.replace(/\.js$/, '');
      // Try underscore path (CLJS convention: ns hyphens → fs underscores)
      for (const ext of ['.cljs', '.cljc']) {
        const p = resolve(dir, base + ext);
        if (existsSync(p)) return p;
      }
      // Fallback: try hyphenated path (user may use hyphens in filenames)
      const hyphenated = base.replace(/_/g, '-');
      if (hyphenated !== base) {
        for (const ext of ['.cljs', '.cljc']) {
          const p = resolve(dir, hyphenated + ext);
          if (existsSync(p)) return p;
        }
      }
      return null;
    },
    transform(code: string, id: string) {
      if (!isCljsFile(id)) return null;
      const result = compile(code, {
        filename: id,
        sourceMap: true,
        codegenHooks: options?.codegenHooks,
      });
      return { code: result.code, map: result.map };
    },
    handleHotUpdate(ctx: HotUpdateCtx) {
      if (!isCljsFile(ctx.file)) return undefined;
      // Return affected modules to trigger re-transform
      return ctx.modules;
    },
  };
}
