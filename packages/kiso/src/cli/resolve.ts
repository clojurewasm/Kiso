import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function resolveTargets(targets: string[]): string[] {
  const files: string[] = [];
  for (const target of targets) {
    let stat;
    try {
      stat = statSync(target);
    } catch {
      throw new Error(`Path does not exist: ${target}`);
    }
    if (stat.isFile()) {
      files.push(target);
    } else if (stat.isDirectory()) {
      const entries = readdirSync(target, { recursive: true, encoding: 'utf-8' });
      for (const entry of entries) {
        if (entry.endsWith('.cljs')) {
          files.push(join(target, entry));
        }
      }
    }
  }
  return files;
}
