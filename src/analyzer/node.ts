// Node — Analyzed AST optimized for JavaScript code generation.
//
// The Analyzer converts Form (reader output) to Node (codegen input).
// Node types map closely to JavaScript constructs.

export type Node =
  | LiteralNode
  | KeywordNode
  | VectorNode
  | MapNode
  | SetNode
  | VarRefNode
  | InvokeNode
  | IfNode
  | DoNode
  | LetNode
  | LetfnNode
  | FnNode
  | DefNode
  | RecurNode
  | LoopNode
  | ThrowNode
  | TryNode
  | NewNode
  | InteropCallNode
  | InteropFieldNode
  | SetBangNode
  | JsRawNode
  | NsNode;

export type LiteralNode = {
  type: 'literal';
  value: null | boolean | number | bigint | string;
  jsType: 'null' | 'boolean' | 'number' | 'bigint' | 'string';
};

export type KeywordNode = { type: 'keyword'; ns: string | null; name: string };
export type VectorNode = { type: 'vector'; items: Node[] };
export type MapNode = { type: 'map'; keys: Node[]; vals: Node[] };
export type SetNode = { type: 'set'; items: Node[] };
export type VarRefNode = { type: 'var-ref'; name: string; local: boolean };
export type InvokeNode = { type: 'invoke'; fn: Node; args: Node[] };

export type IfNode = { type: 'if'; test: Node; then: Node; else: Node };
export type DoNode = { type: 'do'; statements: Node[]; ret: Node };
export type LetNode = { type: 'let'; bindings: LetBinding[]; body: Node };
export type LetfnNode = { type: 'letfn'; bindings: LetBinding[]; body: Node };
export type FnNode = {
  type: 'fn';
  name: string | null;
  arities: FnArity[];
};
export type DefNode = { type: 'def'; name: string; init: Node | null };
export type RecurNode = { type: 'recur'; args: Node[] };
export type LoopNode = { type: 'loop'; bindings: LetBinding[]; body: Node };
export type ThrowNode = { type: 'throw'; expr: Node };
export type TryNode = { type: 'try'; body: Node; catches: CatchClause[]; finally: Node | null };
export type NewNode = { type: 'new'; ctor: Node; args: Node[] };
export type InteropCallNode = { type: 'interop-call'; target: Node; method: string; args: Node[] };
export type InteropFieldNode = { type: 'interop-field'; target: Node; field: string };
export type SetBangNode = { type: 'set!'; target: Node; value: Node };
export type JsRawNode = { type: 'js-raw'; code: string };
export type NsNode = { type: 'ns'; name: string; requires: NsRequire[] };

export type LetBinding = { name: string; init: Node };
export type FnArity = { params: string[]; restParam: string | null; body: Node };
export type CatchClause = { exType: string; binding: string; body: Node };
export type NsRequire = { ns: string; alias: string | null; refers: string[] };
