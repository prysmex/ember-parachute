import QueryParams from './query-params.js';

/** What every definition of a set made with it starts from. */

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
function queryParamsWithDefaults(defaults) {
  return function (...definitions) {
    return new QueryParams(...definitions.map(definition => {
      const withDefaults = {};
      for (const [key, option] of Object.entries(definition)) {
        // null / undefined still drop a definition
        withDefaults[key] = option ? {
          ...defaults,
          ...option
        } : option;
      }
      return withDefaults;
    }));
  };
}

export { queryParamsWithDefaults };
//# sourceMappingURL=defaults.js.map
