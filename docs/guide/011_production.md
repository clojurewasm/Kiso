# Production Build

Build and deploy your su application.

## Vite Build

Kiso uses Vite for both development and production builds.

### Configuration

```js
// vite.config.js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
  build: {
    target: 'es2022',
  },
};
```

### Build Command

```bash
npx vite build
```

Output goes to `dist/` by default. The Kiso Vite plugin compiles `.cljs` files
during the build, then Vite handles bundling, tree-shaking, and minification.

### What Gets Bundled

| Source                      | Output                              |
|-----------------------------|-------------------------------------|
| `.cljs` files               | Compiled JS, bundled by Vite        |
| Runtime functions (used)    | Tree-shaken into the bundle         |
| Runtime functions (unused)  | Eliminated by Vite                  |
| `defstyle` stylesheets      | Compiled at build time, inlined     |
| Source maps                 | Generated if `build.sourcemap: true` |

The Kiso runtime is tree-shakeable — only functions your code actually uses
end up in the final bundle.

### Typical Bundle Sizes

| Package             | Full Size | Typical (tree-shaken) |
|---------------------|-----------|-----------------------|
| `@clojurewasm/kiso` | ~146 KB   | ~20-40 KB             |
| `@clojurewasm/su`   | ~21 KB    | ~8-12 KB              |

## Preview Locally

```bash
npx vite preview
```

Serves the `dist/` directory on a local server for verification before deploying.

## Deploy to GitHub Pages

### 1. Set Vite Base URL

For `https://<user>.github.io/<repo>/`, set the base path:

```js
// vite.config.js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
  base: '/<repo>/',
};
```

### 2. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx vite build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

### 3. Enable GitHub Pages

In your repo settings: **Pages** > **Source** > **GitHub Actions**.

## Other Platforms

### Netlify

```bash
# Build command
npx vite build

# Publish directory
dist
```

### Vercel

```bash
# Framework preset: Vite
# Build command: npx vite build
# Output directory: dist
```

### Static Hosting

Any static file host works. Just upload the `dist/` directory.

## Environment Variables

Vite supports `.env` files:

```bash
# .env
VITE_API_URL=https://api.example.com
```

Access in ClojureScript:

```clojure
(def api-url (.-VITE_API_URL js/import.meta.env))
```

## Troubleshooting

### Build Fails with CompileError

The Vite plugin shows errors in the terminal with phase and location:

```
[read] src/app.cljs:12:5: Unexpected EOF
[analyze] src/app.cljs:8:1: def requires a symbol
```

Fix the indicated file and line, then rebuild.

### Large Bundle Size

1. Check for unused imports — Vite tree-shakes unused runtime functions
2. Use `npx vite build --report` to see bundle composition
3. Dynamic imports for code splitting:

```clojure
(-> (js/import "./heavy-module.cljs")
    (.then (fn [mod] ...)))
```
