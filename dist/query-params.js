import { parachuteMixin, parachuteClass } from './-private/controller.js';
import { emberSerialize, emberDeserialize } from './-private/ember-values.js';
import { isSameValue, metaFor, hasParachute, queryParamsFor, stateFor, resetParamsFor, setDefaultValue } from './-private/state.js';

/** What the Mixin adds to a controller. */

/**
 * The values of a definition set: `QueryParamValues<typeof queryParams>`,
 * e.g. for `ParachuteEvent<QueryParamValues<typeof queryParams>>`.
 */

/** How `serialize` / `forLink` write values. */

/**
 * A set of query param definitions, and the Mixin that gives them to a
 * controller.
 *
 * ```ts
 * const queryParams = new QueryParams({
 *   search: { as: 'q', defaultValue: '', refresh: true },
 *   page: { defaultValue: 1, refresh: true },
 * });
 *
 * export default class PostsController extends queryParams.mixInto(Controller) {
 *   setup({ queryParams }) { this.fetch(queryParams); }
 *   queryParamsDidChange({ shouldRefresh, queryParams }) {
 *     if (shouldRefresh) this.fetch(queryParams);
 *   }
 * }
 * ```
 */
class QueryParams {
  /** The definitions, by controller property. */
  queryParams;
  #mixin;
  constructor(...definitions) {
    const merged = Object.assign({}, ...definitions);
    this.queryParams = {};

    // keys passed as undefined or null (e.g. through extend()) drop a
    // definition
    for (const key of Object.keys(merged)) {
      const definition = merged[key];
      if (definition !== null && definition !== undefined) {
        this.queryParams[key] = definition;
      }
    }
  }

  /**
   * The definitions as an Ember Mixin, for `Controller.extend(qp.Mixin)`
   * (ember-parachute 1.x). Made the first time it is read.
   *
   * @deprecated Ember deprecates mixins from 7.4: use `mixInto(Controller)`
   */
  get Mixin() {
    this.#mixin ??= parachuteMixin(this.queryParams);
    return this.#mixin;
  }

  /** A new set: this one's definitions, then the given ones. */
  extend(...definitions) {
    return new QueryParams(this.queryParams, ...definitions);
  }

  /**
   * A subclass of `Base` (a controller class) set up with these query
   * params: their values, `allQueryParams`, `queryParamsState`,
   * `resetQueryParams`, `setDefaultQueryParamValue`, and the hooks.
   *
   * A native subclass: no mixin, no `extend()`.
   *
   * ```ts
   * export default class PostsController extends queryParams.mixInto(Controller) {}
   * ```
   */
  mixInto(Base) {
    return parachuteClass(Base, this.queryParams);
  }

  /**
   * Values, as the address holds them: by name in the address, through each
   * definition's `serialize` (or as Ember would write them).
   *
   * For links and transitions built where the route may not have loaded yet
   * (a split route, a push notification on a cold start): until then, Ember
   * knows nothing of its query params and writes objects as
   * "[object Object]".
   */
  serialize(values, {
    keepDefaults = false
  } = {}) {
    const serialized = {};
    const given = values;
    for (const [key, definition] of Object.entries(this.queryParams)) {
      if (!(key in given)) {
        continue;
      }
      const value = given[key];
      if (!keepDefaults && isSameValue(value, definition.defaultValue)) {
        continue;
      }
      serialized[definition.as || key] = typeof definition.serialize === 'function' ? definition.serialize(value) : emberSerialize(value, definition.defaultValue);
    }
    return serialized;
  }

  /**
   * Values for `router.urlFor` / `transitionTo` / `<LinkTo @query>`: by
   * name in the address (Ember takes them by that name, not by property
   * name), through each definition's own `serialize`; the rest as they are,
   * for Ember to write.
   *
   * Right whether the route has loaded or not: until a split route has
   * loaded, Ember knows nothing of its query params and writes values with
   * `${value}`; once it has, it runs `serialize` again, so a `serialize`
   * should take its own output (every adapter in `prysmex-ember-parachute/adapters`
   * does). Lists and objects need a `serialize` of their own for links to a
   * route that may not have loaded.
   */
  forLink(values, {
    keepDefaults = true
  } = {}) {
    const params = {};
    const given = values;
    for (const [key, definition] of Object.entries(this.queryParams)) {
      if (!(key in given)) {
        continue;
      }
      const value = given[key];
      if (!keepDefaults && isSameValue(value, definition.defaultValue)) {
        continue;
      }
      params[definition.as || key] = typeof definition.serialize === 'function' ? definition.serialize(value) : value;
    }
    return params;
  }

  /**
   * Every value, from what an address holds (by name in the address, or by
   * property name): through each definition's `deserialize` (or as Ember
   * would read them). What it doesn't mention is its default.
   *
   * For addresses read outside a route: `router.recognize(url).queryParams`,
   * a push notification's payload, a link in an email.
   */
  deserialize(params = {}) {
    const values = {};
    for (const [key, definition] of Object.entries(this.queryParams)) {
      const as = definition.as || key;
      const raw = as in params ? params[as] : params[key];
      if (raw === undefined) {
        values[key] = definition.defaultValue;
      } else if (typeof definition.deserialize === 'function') {
        values[key] = definition.deserialize(raw);
      } else {
        values[key] = emberDeserialize(raw, definition.defaultValue);
      }
    }
    return values;
  }

  /** The parachute meta of a controller (asserts it has one). */
  static metaFor(controller) {
    return metaFor(controller);
  }

  /** Whether a controller is set up with ember-parachute. */
  static hasParachute(controller) {
    return hasParachute(controller);
  }

  /** The definition whose name in the address is `urlKey`. */
  static lookupQueryParam(controller, urlKey) {
    return metaFor(controller).queryParamsArray.find(queryParam => queryParam.as === urlKey);
  }

  /** Every query param's current value, by property name. */
  static queryParamsFor(controller) {
    return queryParamsFor(controller);
  }

  /** Where each query param stands. */
  static stateFor(controller) {
    return stateFor(controller);
  }

  /**
   * Back to the defaults: every query param, or the given keys. The default
   * itself is set, not a copy.
   */
  static resetParamsFor(controller, params = []) {
    resetParamsFor(controller, params);
  }

  /** A new default for one query param of one controller. */
  static setDefaultValue(controller, param, defaultValue) {
    setDefaultValue(controller, param, defaultValue);
  }
}

export { QueryParams as default };
//# sourceMappingURL=query-params.js.map
