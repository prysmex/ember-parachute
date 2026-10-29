/**
 * Ready-made `serialize` / `deserialize` pairs, to spread into a
 * definition:
 *
 * ```ts
 * new QueryParams({
 *   page: { defaultValue: 1, ...integer() },
 *   tags: { defaultValue: [], ...list() },
 *   sort: { defaultValue: 'name', ...oneOf(['name', 'date'], 'name') },
 * });
 * ```
 *
 * Each one reads what it wrote, and reads values that are already typed
 * too (from a router that keeps them typed, like ember-rison-qs).
 * Something it can't read is its `fallback`.
 *
 * And each `serialize` takes its own output too, giving it back as it is:
 * Ember runs `serialize` on what a link gives it, which may already be
 * serialized (see `QueryParams#forLink`).
 */
/** A `serialize` / `deserialize` pair: `T` in the controller, `S` in the address. */
export interface Adapter<T, S = unknown> {
    /** Takes its own output too (see above). */
    serialize(value: T | S): S;
    deserialize(value: unknown): T;
}
/**
 * Whole numbers. Anything that isn't one reads as `fallback` (`null`
 * unless given).
 */
export declare function integer<F = null>(fallback?: F): Adapter<number | F, number | null>;
/** Any finite number. Anything else reads as `fallback`. */
export declare function number<F = null>(fallback?: F): Adapter<number | F, number | null>;
/**
 * `true` / `false` in the address (`1`, `0`, `yes`, `no` read too). For a
 * flag whose default isn't a boolean (Ember reads those already).
 */
export declare function boolean<F = false>(fallback?: F): Adapter<boolean | F, string | null>;
/**
 * Objects and nested lists, as JSON in the address. Anything that doesn't
 * parse (e.g. "[object Object]", from a link built without it) reads as
 * `fallback`.
 *
 * A string is taken as JSON already written: it is for objects and lists,
 * not for strings.
 */
export declare function json<T = unknown, F = null>(fallback?: F): Adapter<T | F, string | null>;
/**
 * A list, as `a,b,c` (shorter than Ember's JSON for lists): an empty list
 * is an empty value. `item` reads and writes each item (strings as they are
 * by default).
 */
export declare function list<T = string>({ separator, item, }?: {
    separator?: string;
    item?: Adapter<T>;
}): Adapter<T[], string>;
/**
 * One of a fixed set of values (a sort, a tab). Anything else reads as
 * `fallback`: a hand-edited address can't put the controller in a state
 * it doesn't know.
 */
export declare function oneOf<const V extends string, F = V>(values: readonly V[], fallback: F): Adapter<V | F, V | null>;
/**
 * A `Date`: as `YYYY-MM-DD` (`{ time: false }`, the default) or a full ISO
 * time, in UTC. Only ISO dates read (`2026-10-28`, `2026-10-28T15:30:00Z`):
 * anything else is `fallback`.
 */
export declare function date<F = null>({ time, fallback, }?: {
    time?: boolean;
    fallback?: F;
}): Adapter<Date | F, string | null>;
//# sourceMappingURL=adapters.d.ts.map