import { cljs } from '@clojurewasm/kiso/vite';

export default {
  base: '/Kiso/',
  plugins: [cljs()],
  build: {
    target: 'es2022',
  },
};
