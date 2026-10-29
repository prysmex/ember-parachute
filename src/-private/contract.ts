import { warn } from '@ember/debug';

// What ember-parachute needs of Ember's router, checked where it is used: a
// router that stops doing one of these warns (once, in development) instead
// of leaving ember-parachute silently doing nothing. Its tests fail on any
// of these warnings, on every Ember of the CI, the beta and alpha included.

export const ROUTER_CONTRACT = 'ember-parachute.router-contract';

const warned = new Set<string>();

/**
 * Warns, once, when Ember's router doesn't do what ember-parachute needs.
 *
 * @param holds whether it does
 * @param what what it no longer does, and what of ember-parachute it breaks
 */
export function expectRouter(holds: boolean, what: string): void {
  if (holds || warned.has(what)) {
    return;
  }

  warned.add(what);
  warn(
    `[ember-parachute] Ember's router changed: ${what}. Please report it, with your Ember version: https://github.com/prysmex/ember-parachute/issues`,
    false,
    { id: ROUTER_CONTRACT },
  );
}

/** Warns again what has warned before. For tests. */
export function resetRouterContract(): void {
  warned.clear();
}
