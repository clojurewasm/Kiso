#!/usr/bin/env node
// Compile CLJS samples and output both source and JS side by side.
// Usage: node .dev/scripts/compile-samples.mjs [file.cljs ...]
// No args = compile all private/codegen-samples/*.cljs + private/sample.cljs

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

  // Write JS output to same directory
  const jsPath = filePath.replace(/\.cljs$/, '.js');
  writeFileSync(jsPath, code, 'utf-8');
}

// Determine files to compile
let files = process.argv.slice(2);

if (files.length === 0) {
  const samplesDir = join(root, 'private/codegen-samples');
  const sampleFiles = readdirSync(samplesDir)
    .filter(f => f.endsWith('.cljs'))
    .sort()
    .map(f => join(samplesDir, f));

  const mainSample = join(root, 'private/sample.cljs');
  files = [...sampleFiles, mainSample];
}

for (const f of files) {
  try {
    printSample(resolve(f));
  } catch (err) {
    console.error(`Error compiling ${f}: ${err.message}`);
  }
}
