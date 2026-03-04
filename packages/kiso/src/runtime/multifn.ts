// MultiFn — Runtime support for defmulti/defmethod dispatch.
//
// A MultiFn wraps a dispatch function and a method table.
// When invoked, it calls the dispatch fn on the args to get a dispatch value,
// then looks up the matching method. Falls back to :default if no match.

import { equiv } from './equiv.js';
import { isKeyword } from './keyword.js';

export type MultiFn = {
  (...args: any[]): any;
  addMethod(dispatchVal: any, fn: (...args: any[]) => any): void;
};

export function defmultiFn(dispatchFn: (...args: any[]) => any): MultiFn {
  const methods: Array<[any, (...args: any[]) => any]> = [];
  let defaultMethod: ((...args: any[]) => any) | null = null;

  const mf = function (...args: any[]) {
    const dv = dispatchFn(...args);
    // Value-based lookup using equiv
    for (const [key, method] of methods) {
      if (equiv(key, dv)) return method(...args);
    }
    if (defaultMethod) return defaultMethod(...args);
    throw new Error(`No method in multimethod for dispatch value: ${dv}`);
  } as MultiFn;

  mf.addMethod = function (dispatchVal: any, fn: (...args: any[]) => any): void {
    if (isKeyword(dispatchVal) && dispatchVal.name === 'default') {
      defaultMethod = fn;
      return;
    }
    methods.push([dispatchVal, fn]);
  };

  return mf;
}
