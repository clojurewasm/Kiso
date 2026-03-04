// Runtime barrel export — all functions that compiled code may reference.

export { vector, isVector } from './vector.js';
export { hashMap, isHashMap } from './hash-map.js';
export { hashSet, isHashSet } from './hash-set.js';
export { keyword, isKeyword } from './keyword.js';
export { symbol, isSymbol } from './symbol.js';
export { list, cons, EMPTY_LIST, isList } from './list.js';
export { Atom, atom, isAtom, deref, reset_m, swap_m } from './atom.js';
export { equiv } from './equiv.js';
export { seq, first, rest, next, toArray, into } from './seq.js';
export { defprotocol, protocolFn } from './protocols.js';
export { arrayMap, isArrayMap } from './array-map.js';
export { clj_to_js, cljToJs, js_to_clj, jsToClj, bean, js_obj, js_array } from './interop.js';
export { defmultiFn } from './multifn.js';
export {
  truthy,
  add, subtract, multiply, divide, mod,
  inc, dec,
  lt, gt, lte, gte,
  eq, not_eq, not_eq as notEq,
  nil_p, some_p, not,
  zero_p, pos_p, neg_p,
  number_p, string_p, boolean_p,
  str, count, conj, get, assoc, dissoc,
  map, filter, reduce, apply,
  identity, constantly, comp, partial,
  name,
  // Map operations
  get_in, assoc_in, update, update_in,
  keys, vals, merge, select_keys, find,
  // Numeric
  max, min, abs, even_p, odd_p, rem, rand, rand_int,
  // Seq operations
  take, drop, take_while, drop_while,
  some, every_p, not_every_p, not_any_p,
  sort, sort_by, reverse,
  range, repeat, repeatedly,
  group_by, frequencies,
  // Predicates
  fn_p, integer_p, coll_p, sequential_p, associative_p, identical_p,
  // Higher-order
  complement, juxt, every_pred, some_fn, memoize,
  // Printing
  println, print_fn as print,
  // Collection access
  nth, second, last, butlast, peek, pop, subvec, not_empty, empty_p, concat,
  // Seq batch 2
  mapcat, map_indexed, remove, keep,
  flatten, distinct, dedupe,
  interleave, interpose,
  partition, partition_all, partition_by,
  merge_with, zipmap, reduce_kv,
  // Regex
  re_find, re_matches, re_seq,
  // Misc
  fnil, trampoline,
  // Navigation
  ffirst, fnext, nfirst, nnext,
  take_last, take_nth, drop_last, keep_indexed, reductions,
  // Generators
  iterate, cycle, doall, dorun,
  // empty / set
  empty, set,
  // Predicates batch 2
  float_p, ifn_p, counted_p, realized_p,
  // Numeric
  quot, compare,
  // Array interop
  aget, aset, alength, js_keys,
  // Batch 4: numeric equality, regex, printing, interop, misc
  num_eq,
  re_pattern,
  pr_str, prn_str, print_str, println_str,
  array, aclone, js_delete,
  hash,
  type_fn, instance_p,
  // Batch 5: prn, pr, predicates
  prn, pr,
  reversible_p, sorted_p,
  satisfies_p, implements_p,
  // Batch 6: dynamic vars, metadata
  _print_fn_, _print_err_fn_,
  _print_newline_, _print_readably_,
  _print_length_, _print_level_,
  alter_meta_m, reset_meta_m,
  meta, with_meta, vary_meta,
  // Sorted collections
  sorted_map, sorted_map_p,
  sorted_set, sorted_set_p,
  sorted_map_by, subseq, rsubseq,
  contains_p, subs,
} from './core.js';
export { PersistentTreeMap, isSortedMap, EMPTY_SORTED_MAP } from './sorted-map.js';
export { PersistentTreeSet, isSortedSet, EMPTY_SORTED_SET } from './sorted-set.js';
export { transient, persistent_m, conj_m, assoc_m, dissoc_m, disj_m } from './transient.js';
