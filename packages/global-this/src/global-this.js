// @noflow
/* eslint-disable */

// Note: the __global_this__ trick did not work in Safari + Karma,
//       so we continue to test global variables first :'-(
function getGlobalThis() {
  // Browser main thread
  if (typeof window !== 'undefined')
    return window;

  // Browser worker
  if (typeof WorkerGlobalScope !== 'undefined')
    return self;

  // Node.js
  if (typeof global !== 'undefined')
    return global;

  // Other JS envs not in strict mode
  if (this)
    return this;

  // All other cases
  // See: https://mathiasbynens.be/notes/globalthis
  Object.defineProperty(Object.prototype, '__global_this__', {
    get: function () { return this; },
    configurable: true,
  });

  try {
    return __global_this__;
  } finally {
    delete Object.prototype.__global_this__;
  }
};

const globalThis = getGlobalThis();

export { globalThis, getGlobalThis };
