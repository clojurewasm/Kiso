// Su codegen hooks — emit readable JS for defc/defstyle output.

import type { CodegenHook, CodegenHelpers, Node } from '@clojurewasm/kiso/codegen';

function camelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Convert a keyword node name to a camelCase JS key.
function keywordToKey(node: Node): string | null {
  if (node.type !== 'keyword') return null;
  return camelCase(node.name);
}

// Try to convert a Node to a static JS expression (object/array/string literal).
// Falls back to helpers.emit for dynamic expressions.
function emitStatic(node: Node, helpers: CodegenHelpers): string {
  if (node.type === 'literal') {
    return JSON.stringify(node.value);
  }
  if (node.type === 'keyword') {
    return JSON.stringify(node.name);
  }
  if (node.type === 'vector') {
    return `[${node.items.map(n => emitStatic(n, helpers)).join(', ')}]`;
  }
  if (node.type === 'map') {
    const pairs: string[] = [];
    for (let i = 0; i < node.keys.length; i++) {
      const key = keywordToKey(node.keys[i]!);
      const val = emitStatic(node.vals[i]!, helpers);
      if (key) {
        pairs.push(`${key}: ${val}`);
      } else {
        pairs.push(`[${emitStatic(node.keys[i]!, helpers)}]: ${val}`);
      }
    }
    return `{ ${pairs.join(', ')} }`;
  }
  // Dynamic expression — fall back to normal emit
  return helpers.emit(node);
}

// Extract and remove :doc from a map node, returning [doc, cleanedNode].
function extractDoc(configNode: Node): [string | null, Node] {
  if (configNode.type !== 'map') return [null, configNode];
  let doc: string | null = null;
  const keys: Node[] = [];
  const vals: Node[] = [];
  for (let i = 0; i < configNode.keys.length; i++) {
    const k = configNode.keys[i]!;
    if (k.type === 'keyword' && k.name === 'doc') {
      const v = configNode.vals[i]!;
      if (v.type === 'literal' && typeof v.value === 'string') {
        doc = v.value;
        continue;
      }
    }
    keys.push(k);
    vals.push(configNode.vals[i]!);
  }
  return [doc, { ...configNode, keys, vals }];
}

// Hook for su.core/define-component(name, config, renderFn)
const defineComponentHook: CodegenHook = (args, helpers) => {
  const [nameNode, configNode, renderFnNode] = args;
  if (!nameNode || !renderFnNode) return helpers.emit({ type: 'literal', value: null, jsType: 'null' });

  const su = helpers.nsRef('su.core');
  const name = helpers.emit(nameNode);

  // Extract docstring from config, emit as JSDoc
  let jsdoc = '';
  let cleanConfig = configNode;
  if (configNode) {
    const [doc, cleaned] = extractDoc(configNode);
    cleanConfig = cleaned;
    if (doc) {
      const safe = doc.replace(/\*\//g, '*\\/');
      jsdoc = `/** ${safe} */\n${helpers.indent}`;
    }
  }

  const config = cleanConfig ? emitStatic(cleanConfig, helpers) : '{}';
  const renderFn = helpers.emit(renderFnNode);

  return `${jsdoc}${su}.defineComponent(${name}, ${config}, ${renderFn})`;
};

// Format CSS string: add newlines between rule blocks for readability.
function formatCss(cssLiteral: string, indent: string): string {
  try {
    const raw: string = JSON.parse(cssLiteral);
    const rules = raw.split('} ').map((r, i, arr) => i < arr.length - 1 ? r + '}' : r);
    if (rules.length <= 1) return cssLiteral;
    const formatted = rules.map(r => `${indent}  ${r}`).join('\n');
    return '`\n' + formatted + '\n' + indent + '`';
  } catch {
    return cssLiteral;
  }
}

// Hook for su.core/create-stylesheet(name, cssText)
const createStylesheetHook: CodegenHook = (args, helpers) => {
  const [nameNode, cssNode] = args;
  if (!nameNode || !cssNode) return helpers.emit({ type: 'literal', value: null, jsType: 'null' });

  const su = helpers.nsRef('su.core');
  const cssText = helpers.emit(cssNode);
  const formattedCss = formatCss(cssText, helpers.indent);
  return `${su}.createSheet(${helpers.emit(nameNode)}, ${formattedCss})`;
};

/** All su codegen hooks, keyed by fully-qualified Clojure name. */
export const suCodegenHooks: Record<string, CodegenHook> = {
  'su.core/define-component': defineComponentHook,
  'su.core/create-stylesheet': createStylesheetHook,
};
