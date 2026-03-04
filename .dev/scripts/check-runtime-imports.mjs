#!/usr/bin/env node
// Check for runtime functions exported from core.ts that are missing from RUNTIME_FUNCTIONS in emitter.ts

import { readFileSync } from 'node:fs';

const core = readFileSync('packages/kiso/src/runtime/core.ts', 'utf-8');
const exported = [];
for (const m of core.matchAll(/export\s+function\s+(\w+)/g)) exported.push(m[1]);
for (const m of core.matchAll(/export\s+const\s+(\w+)\s*=/g)) exported.push(m[1]);

const emitter = readFileSync('packages/kiso/src/codegen/emitter.ts', 'utf-8');

const missing = exported.filter(name => {
  // Try the original name and common Clojure name variants
  const variants = [name, name.replace(/_p$/, '?'), name.replace(/_m$/, '!')];
  return variants.every(v => !emitter.includes(`'${v}'`));
});

console.log(`Exported from core.ts: ${exported.length}`);
console.log(`Missing from RUNTIME_FUNCTIONS (${missing.length}):`);
missing.forEach(m => console.log(`  ${m}`));
