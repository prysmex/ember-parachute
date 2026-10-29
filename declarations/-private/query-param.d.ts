/**
 * How one query param is declared.
 *
 * `T` is the value the controller holds, inferred from `defaultValue` (type
 * it when the default doesn't say it all: `[] as string[]`); `serialize`
 * turns it into what the address holds, `deserialize` turns that back into
 * a `T`.
 */
export interface QueryParamOption<T = any> {
    /** Its name in the address. Defaults to the controller property's name. */
    as?: string;
    /** The value it has when the address doesn't mention it. */
    defaultValue?: T;
    /** A change sets `event.shouldRefresh` (the hooks decide what to do). */
    refresh?: boolean;
    /** A change replaces the history entry instead of pushing a new one. */
    replace?: boolean;
    /** `'controller'`: the value is shared by every model of the route. */
    scope?: 'controller';
    /** The value, as the address will hold it. */
    serialize?(value: NoInfer<T>, controller?: object): unknown;
    /** What the address holds, as the controller will hold it. */
    deserialize?(value: any, controller?: object): NoInfer<T>;
}
/** A definition per controller property. */
export type QueryParamOptions<T> = {
    [K in keyof T]: QueryParamOption<T[K]>;
};
/**
 * One query param definition, normalized: the controller property `key`,
 * read from and written to the address as `as`.
 */
export default class QueryParam<T = unknown> {
    key: string;
    as: string;
    scope: QueryParamOption['scope'];
    defaultValue: T;
    refresh: boolean;
    replace: boolean;
    serialize: QueryParamOption<T>['serialize'];
    deserialize: QueryParamOption<T>['deserialize'];
    constructor(key: string, options?: QueryParamOption<T>);
    /** The controller's current value. */
    value(controller: object): T;
    /** The controller's current value, through `serialize` when it has one. */
    serializedValue(controller: object): unknown;
    toString(): string;
}
//# sourceMappingURL=query-param.d.ts.map