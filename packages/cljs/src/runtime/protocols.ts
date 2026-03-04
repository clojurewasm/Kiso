// Protocol System — Symbol-based dispatch on prototypes.
//
// Protocols define named method slots backed by unique JS Symbols.
// Protocol functions dispatch via the Symbol key on the first argument.
// extend-type adds Symbol methods to prototypes; deftype/defrecord
// define classes with Symbol methods directly.

export type Protocol = {
  name: string;
  methods: Record<string, symbol>;
  satisfies: symbol;
};

export function defprotocol(name: string, methodNames: string[]): Protocol {
  const methods: Record<string, symbol> = {};
  for (const m of methodNames) {
    methods[m] = Symbol(`${name}.${m}`);
  }
  return { name, methods, satisfies: Symbol(`${name}?`) };
}

export function protocolFn(proto: Protocol, methodName: string): (...args: any[]) => any {
  const sym = proto.methods[methodName]!;
  return function (target: any, ...args: any[]) {
    if (target != null) {
      const fn = target[sym];
      if (typeof fn === 'function') return fn.call(target, ...args);
    }
    throw new Error(`No protocol method ${proto.name}.${methodName} for type ${typeof target}`);
  };
}
