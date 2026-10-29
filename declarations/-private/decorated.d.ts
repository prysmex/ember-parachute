import type { QueryParamOption } from './query-param.ts';
/** A `@queryParam` field: its options, and the field's own initializer. */
export interface DecoratedQueryParam {
    options: QueryParamOption;
    initializer?: () => unknown;
}
export declare function declareQueryParam(prototype: object, key: string, field: DecoratedQueryParam): void;
/** Every @queryParam field of a class, its parents' first. */
export declare function decoratedQueryParamsOf(prototype: object | null): Record<string, DecoratedQueryParam>;
export declare function hasDecoratedQueryParams(instance: object | undefined): boolean;
//# sourceMappingURL=decorated.d.ts.map