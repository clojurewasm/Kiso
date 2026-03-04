# @clojurewasm/kiso

[![npm version](https://img.shields.io/npm/v/@clojurewasm/kiso.svg)](https://www.npmjs.com/package/@clojurewasm/kiso)
[![license](https://img.shields.io/npm/l/@clojurewasm/kiso.svg)](https://github.com/clojurewasm/Kiso/blob/main/LICENSE)

ClojureScript-to-JavaScript compiler written in TypeScript. Zero dependencies.

**Kiso** (基礎) — *foundation* in Japanese.

**[Live Showcase](https://clojurewasm.github.io/Kiso/)** | **[Documentation](https://github.com/clojurewasm/Kiso/tree/main/docs)**

## Install

```bash
npm install @clojurewasm/kiso
```

## Quick Start

### With Vite

```bash
npm install @clojurewasm/kiso @clojurewasm/su -D vite
```

```js
// vite.config.js
import { cljs } from '@clojurewasm/kiso/vite';
export default { plugins: [cljs()] };
```

```clojure
;; src/main.cljs
(ns my.app)
(defn greet [name] (str "Hello, " name "!"))
(js/console.log (greet "World"))
```

```bash
npx vite
```

### Compiler API

```ts
import { compile } from '@clojurewasm/kiso/compiler';
const { code } = compile('(defn add [a b] (+ a b))');
```

### CLI

```bash
npx kiso compile src/ --out-dir dist/ --source-map
```

## What Compiles to What?

```clojure
(defn greet [name]           ;; → export let greet = function greet(name) {
  (str "Hello, " name "!"))  ;;     return str("Hello, ", name, "!");  };

(.toUpperCase "hello")       ;; → "hello".toUpperCase()
(.-length "hello")           ;; → "hello".length
(js/console.log "hi")        ;; → console.log("hi")

[1 2 3]                      ;; → vector(1, 2, 3)
{:a 1}                       ;; → hashMap(keyword("a"), 1)
```

## Exports

| Subpath      | Description                    |
|--------------|--------------------------------|
| `.`          | `CompileError`, `version`      |
| `./compiler` | `compile`, `read`, `analyze`   |
| `./vite`     | Vite plugin (`cljs()`)         |
| `./runtime`  | Persistent data structures     |
| `./codegen`  | Codegen hooks for libraries    |

## License

[MIT](https://github.com/clojurewasm/Kiso/blob/main/LICENSE)
