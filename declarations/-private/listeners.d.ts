import type ParachuteEvent from './event.ts';
/** The hooks a parachute controller is called with, and their arguments. */
export interface ParachuteHooks<T = Record<string, any>> {
    setup: [event: ParachuteEvent<T>, transition: unknown];
    queryParamsDidChange: [event: ParachuteEvent<T>];
    reset: [event: ParachuteEvent<T>, isExiting: boolean];
}
export type ParachuteHook = keyof ParachuteHooks;
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
export declare function addParachuteListener<T = Record<string, any>, H extends ParachuteHook = ParachuteHook>(controller: object, hook: H, listener: (...args: ParachuteHooks<T>[H]) => void): () => void;
/** The controller's hook, then its listeners. */
export declare function notify(controller: object, hook: ParachuteHook, args: unknown[]): void;
//# sourceMappingURL=listeners.d.ts.map