import ParachuteMeta from './meta.ts';
/** Where one query param stands on a controller. */
export interface QueryParamState<V = unknown> {
    value: V;
    serializedValue: unknown;
    as: string;
    defaultValue: V;
    /** Differs from its default (compared as JSON, so key order counts). */
    changed: boolean;
}
export type QueryParamsState<T = Record<string, unknown>> = {
    [K in keyof T]: QueryParamState<T[K]>;
};
export declare function hasParachute(controller: unknown): boolean;
export declare function metaFor(controller: object): ParachuteMeta;
/** Equal as the address would see them: compared as JSON. */
export declare function isSameValue(a: unknown, b: unknown): boolean;
export declare function queryParamsFor(controller: object): Record<string, unknown>;
export declare function stateFor(controller: object): QueryParamsState;
/**
 * Back to the defaults: every query param, or the given keys. The default
 * itself is set, not a copy.
 */
export declare function resetParamsFor(controller: object, params?: string[]): void;
/** A new default for one query param of one controller. */
export declare function setDefaultValue(controller: object, param: string, defaultValue: unknown): void;
//# sourceMappingURL=state.d.ts.map