import type { QueryParamOption } from './-private/query-param.ts';
interface FieldDescriptor {
    configurable?: boolean;
    enumerable?: boolean;
    writable?: boolean;
    initializer?: (() => unknown) | null;
}
type FieldDecorator = (target: object, key: string, descriptor?: FieldDescriptor) => any;
/** Options of a `@queryParam` field: its value is the default. */
export type QueryParamFieldOptions<T = any> = Omit<QueryParamOption<T>, 'defaultValue'> & {
    /** For a field without an initializer. */
    defaultValue?: T;
};
/**
 * A query param, declared on its controller field: the field's value is its
 * default, and the field is tracked. The class needs `@withParachute`.
 *
 * ```ts
 * @withParachute
 * class SearchController extends Controller {
 *   @queryParam({ as: 'q', refresh: true }) search = '';
 *   @queryParam({ ...integer(), refresh: true }) page = 1;
 *   @queryParam tags: string[] = [];
 * }
 * ```
 */
export declare function queryParam(options?: QueryParamFieldOptions): FieldDecorator;
export declare function queryParam(target: object, key: string, descriptor?: FieldDescriptor): any;
type ControllerClass = abstract new (...args: any[]) => object;
/**
 * Sets a controller class up with ember-parachute: its `@queryParam`
 * fields (its parents' included), the `setup` / `queryParamsDidChange` /
 * `reset` hooks, `allQueryParams`, `queryParamsState`, `resetQueryParams`.
 * With no `@queryParam` field, the hooks alone.
 */
export declare function withParachute<T extends ControllerClass>(Klass: T): T;
export {};
//# sourceMappingURL=decorators.d.ts.map