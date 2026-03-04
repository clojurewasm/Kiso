#!/usr/bin/env node
// Compile CLJS samples and output JS to the js/ directory.
// Usage: node .dev/scripts/compile-samples.mjs [file.cljs ...]
// No args = compile all .dev/codegen-samples/cljs/*.cljs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { compile } from '../../packages/kiso/dist/api/compiler.js';

// Try to load su codegen hooks (optional)
let hooks = {};
try {
  const { suCodegenHooks } = await import('../../packages/su/dist/codegen-hooks.js');
  hooks = suCodegenHooks;
} catch {
  console.warn('Warning: su codegen hooks not available (run npm run build first)');
}

const root = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const cljsDir = join(root, '.dev/codegen-samples/cljs');
const jsDir = join(root, '.dev/codegen-samples/js');

function compileSample(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const result = compile(source, { codegenHooks: hooks });
  return { source, code: result.code };
}

function printSample(filePath) {
  const name = basename(filePath);
  const { source, code } = compileSample(filePath);

  console.log('='.repeat(72));
  console.log(`  ${name}`);
  console.log('='.repeat(72));
  console.log();
  console.log('--- CLJS ---');
  console.log(source);
  console.log('--- JS ---');
  console.log(code);
  console.log();

  // Write JS output to js/ directory
  const jsPath = join(jsDir, name.replace(/\.cljs$/, '.js'));
  writeFileSync(jsPath, code, 'utf-8');
}

// Determine files to compile
let files = process.argv.slice(2);

if (files.length === 0) {
  files = readdirSync(cljsDir)
    .filter(f => f.endsWith('.cljs'))
    .sort()
    .map(f => join(cljsDir, f));
}

for (const f of files) {
  try {
    printSample(resolve(f));
  } catch (err) {
    console.error(`Error compiling ${f}: ${err.message}`);
  }
}
