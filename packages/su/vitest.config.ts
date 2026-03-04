import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@kiso/cljs/runtime': path.resolve(__dirname, '../cljs/src/runtime/index.ts'),
    },
  },
});
