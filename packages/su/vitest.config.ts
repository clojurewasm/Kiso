import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@clojurewasm/kiso/runtime': path.resolve(__dirname, '../kiso/src/runtime/index.ts'),
    },
  },
});
