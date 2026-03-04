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

// Hook for su.core/define-component(name, config, renderFn)
const defineComponentHook: CodegenHook = (args, helpers) => {
  const [nameNode, configNode, renderFnNode] = args;
  if (!nameNode || !renderFnNode) return helpers.emit({ type: 'literal', value: null, jsType: 'null' });

  const su = helpers.nsRef('su.core');
  const name = helpers.emit(nameNode);
  const config = configNode ? emitStatic(configNode, helpers) : '{}';
  const renderFn = helpers.emit(renderFnNode);

  return `${su}.defineComponent(${name}, ${config}, ${renderFn})`;
};

// Hook for su.core/create-stylesheet(name, cssText)
const createStylesheetHook: CodegenHook = (args, helpers) => {
  const [nameNode, cssNode] = args;
  if (!nameNode || !cssNode) return helpers.emit({ type: 'literal', value: null, jsType: 'null' });

  const su = helpers.nsRef('su.core');
  return `${su}.createSheet(${helpers.emit(nameNode)}, ${helpers.emit(cssNode)})`;
};

/** All su codegen hooks, keyed by fully-qualified Clojure name. */
export const suCodegenHooks: Record<string, CodegenHook> = {
  'su.core/define-component': defineComponentHook,
  'su.core/create-stylesheet': createStylesheetHook,
};
