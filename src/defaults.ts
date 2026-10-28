import QueryParams from './query-params.ts';

import type { QueryParamOption } from './-private/query-param.ts';

/** What every definition of a set made with it starts from. */
export type QueryParamDefaults = Omit<QueryParamOption, 'as' | 'defaultValue'>;

/**
 * `new QueryParams(...)`, with options every definition starts from: an
 * app's own conventions, declared once.
 *
 * ```ts
 * // every query param of the app refreshes and replaces, unless it says not to
 * export const appQueryParams = queryParamsWithDefaults({ refresh: true, replace: true });
 *
 * const queryParams = appQueryParams({
 *   search: { defaultValue: '' },
 *   print: { defaultValue: false, replace: false },
 * });
 * ```
 */
export function queryParamsWithDefaults(defaults: QueryParamDefaults) {
  return function <T = Record<string, any>>(
    ...definitions: Array<Record<string, QueryParamOption | null | undefined>>
  ): QueryParams<T> {
    return new QueryParams<T>(
      ...definitions.map((definition) => {
        const withDefaults: Record<
          string,
          QueryParamOption | null | undefined
        > = {};

        for (const [key, option] of Object.entries(definition)) {
          // null / undefined still drop a definition
          withDefaults[key] = option ? { ...defaults, ...option } : option;
        }

        return withDefaults;
      }),
    );
  };
}
