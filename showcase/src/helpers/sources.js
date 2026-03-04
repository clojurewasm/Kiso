// Raw CLJS text (eager, bypasses CLJS plugin since id ends with ?raw)
const rawModules = import.meta.glob('../samples/**/*.cljs', {
  query: '?raw', import: 'default', eager: true
});

export const sources = Object.fromEntries(
  Object.entries(rawModules).map(([p, text]) => [
    p.replace(/^.*\//, '').replace(/\.cljs$/, ''), text
  ])
);

// Lazy compiled modules (goes through CLJS plugin normally)
const compiledModules = import.meta.glob('../samples/**/*.cljs');

export function loadSample(name) {
  const key = Object.keys(compiledModules).find(k => k.includes(`/${name}.cljs`));
  return key ? compiledModules[key]() : Promise.reject(`Not found: ${name}`);
}
