export declare const ROUTER_CONTRACT = "ember-parachute.router-contract";
/**
 * Warns, once, when Ember's router doesn't do what ember-parachute needs.
 *
 * @param holds whether it does
 * @param what what it no longer does, and what of ember-parachute it breaks
 */
export declare function expectRouter(holds: boolean, what: string): void;
/** Warns again what has warned before. For tests. */
export declare function resetRouterContract(): void;
//# sourceMappingURL=contract.d.ts.map