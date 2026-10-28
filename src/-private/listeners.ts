import { config } from './config.ts';

import type ParachuteEvent from './event.ts';

/** The hooks a parachute controller is called with, and their arguments. */
export interface ParachuteHooks<T = Record<string, any>> {
  setup: [event: ParachuteEvent<T>, transition: unknown];
  queryParamsDidChange: [event: ParachuteEvent<T>];
  reset: [event: ParachuteEvent<T>, isExiting: boolean];
}

export type ParachuteHook = keyof ParachuteHooks;

type Listener = (...args: any[]) => void;

const listeners = new WeakMap<object, Map<ParachuteHook, Set<Listener>>>();

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
export function addParachuteListener<
  T = Record<string, any>,
  H extends ParachuteHook = ParachuteHook,
>(
  controller: object,
  hook: H,
  listener: (...args: ParachuteHooks<T>[H]) => void,
): () => void {
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

  set.add(listener as Listener);

  return () => {
    set.delete(listener as Listener);
  };
}

/** The controller's hook, then its listeners. */
export function notify(
  controller: object,
  hook: ParachuteHook,
  args: unknown[],
) {
  const method = (controller as Record<string, unknown>)[hook];

  if (typeof method === 'function') {
    (method as Listener).apply(controller, args);
  }

  for (const listener of [...(listeners.get(controller)?.get(hook) ?? [])]) {
    listener(...args);
  }

  config.sendEvent?.(controller, hook, args);
}
