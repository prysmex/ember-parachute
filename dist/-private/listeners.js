import { config } from './config.js';

/** The hooks a parachute controller is called with, and their arguments. */

const listeners = new WeakMap();

/**
 * Calls `listener` every time the route calls one of the controller's
 * hooks, after the hook itself. Returns the function that stops it.
 *
 * ```ts
 * const stop = addParachuteListener(controller, 'queryParamsDidChange', (event) => {
 *   analytics.track('filters', event.changed);
 * });
 * ```
 */
function addParachuteListener(controller, hook, listener) {
  let hooks = listeners.get(controller);
  if (!hooks) {
    hooks = new Map();
    listeners.set(controller, hooks);
  }
  let set = hooks.get(hook);
  if (!set) {
    set = new Set();
    hooks.set(hook, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** The controller's hook, then its listeners. */
function notify(controller, hook, args) {
  const method = controller[hook];
  if (typeof method === 'function') {
    method.apply(controller, args);
  }
  for (const listener of [...(listeners.get(controller)?.get(hook) ?? [])]) {
    listener(...args);
  }
  config.sendEvent?.(controller, hook, args);
}

export { addParachuteListener, notify };
//# sourceMappingURL=listeners.js.map
