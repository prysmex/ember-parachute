/**
 * What the `setup`, `queryParamsDidChange` and `reset` hooks receive.
 *
 * - `changed`: the query params this transition changed, by property name,
 *   deserialized. (On `queryParamsDidChange`, a key going back to its
 *   default holds the value it had. On `setup`, it is `changes`.)
 * - `changes`: every query param that differs from its default now.
 * - `queryParams`: every query param's current value.
 * - `shouldRefresh`: a changed key has `refresh: true` (always true on
 *   `setup`, false on `reset`).
 */
export default class ParachuteEvent<T = Record<string, any>> {
    /** The route the event was fired from */
    routeName: string;
    changed: Partial<T>;
    changes: Partial<T>;
    queryParams: T;
    shouldRefresh: boolean;
    /**
     * @param routeName the route firing it
     * @param controller its controller
     * @param changed what the router says changed, by name in the address, as
     *   the router keeps it (serialized)
     */
    constructor(routeName: string, controller: object, changed?: Record<string, unknown>);
}
//# sourceMappingURL=event.d.ts.map