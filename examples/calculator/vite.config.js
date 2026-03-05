import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
  build: { target: 'es2022' },
};
