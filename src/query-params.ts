import { parachuteClass, parachuteMixin } from './-private/controller.ts';
import { emberDeserialize, emberSerialize } from './-private/ember-values.ts';
import {
  hasParachute,
  isSameValue,
  metaFor,
  queryParamsFor,
  resetParamsFor,
  setDefaultValue,
  stateFor,
} from './-private/state.ts';

import type ParachuteEvent from './-private/event.ts';
import type ParachuteMeta from './-private/meta.ts';
import type QueryParam from './-private/query-param.ts';
import type {
  QueryParamOption,
  QueryParamOptions,
} from './-private/query-param.ts';
import type { QueryParamsState } from './-private/state.ts';

/** What the Mixin adds to a controller. */
export interface QueryParamMixin<T> {
  /** Every query param's current value. */
  readonly allQueryParams: T;
  /** Where each query param stands: value, default, whether it changed. */
  readonly queryParamsState: QueryParamsState<T>;
  /**
   * The route set the controller up (entered, or a new model). `transition`
   * is the route's (a `Transition`), left `unknown` so a subclass can pass
   * on what it was given.
   */
  setup?(event: ParachuteEvent<T>, transition: unknown): void;
  /** A query param changed while on the route. Runs after render. */
  queryParamsDidChange?(event: ParachuteEvent<T>): void;
  /** The route is being left (`isExiting`) or is moving to a new model. */
  reset?(event: ParachuteEvent<T>, isExiting: boolean): void;
  /** Back to the defaults: every query param, or the given keys. */
  resetQueryParams(params?: Array<keyof T & string>): void;
  /** A new default for one query param, for state and reset. */
  setDefaultQueryParamValue<K extends keyof T & string>(
    key: K,
    defaultValue: T[K],
  ): void;
}

/**
 * The values of a definition set: `QueryParamValues<typeof queryParams>`,
 * e.g. for `ParachuteEvent<QueryParamValues<typeof queryParams>>`.
 */
export type QueryParamValues<Q> = Q extends QueryParams<infer T> ? T : never;

/** How `serialize` / `forLink` write values. */
export interface SerializeOptions {
  /**
   * Keep values equal to their default. `serialize` leaves them out by
   * default, as Ember does in the address; `forLink` keeps them, so a link
   * can set a query param back to its default.
   */
  keepDefaults?: boolean;
}

type Definitions<T> = Partial<QueryParamOptions<T>> | Record<string, unknown>;

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
export default class QueryParams<T = Record<string, any>> {
  /** The definitions, by controller property. */
  queryParams: Record<string, QueryParamOption>;

  #mixin?: QueryParamMixin<T> & T;

  constructor(...definitions: Array<Definitions<T>>) {
    const merged: Record<string, QueryParamOption | null | undefined> =
      Object.assign({}, ...definitions) as Record<
        string,
        QueryParamOption | null | undefined
      >;

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
  get Mixin(): QueryParamMixin<T> & T {
    this.#mixin ??= parachuteMixin(
      this.queryParams,
    ) as unknown as QueryParamMixin<T> & T;

    return this.#mixin;
  }

  /** A new set: this one's definitions, then the given ones. */
  extend<E = T>(...definitions: Array<Definitions<E>>): QueryParams<T & E> {
    return new QueryParams<T & E>(
      this.queryParams as Definitions<T & E>,
      ...(definitions as Array<Definitions<T & E>>),
    );
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
  mixInto<B extends abstract new (...args: any[]) => object>(
    Base: B,
  ): B &
    (abstract new (
      ...args: any[]
    ) => InstanceType<B> & QueryParamMixin<T> & T) {
    return parachuteClass(Base, this.queryParams) as never;
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
  serialize(
    values: Partial<T>,
    { keepDefaults = false }: SerializeOptions = {},
  ): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    const given = values as Record<string, unknown>;

    for (const [key, definition] of Object.entries(this.queryParams)) {
      if (!(key in given)) {
        continue;
      }

      const value = given[key];

      if (!keepDefaults && isSameValue(value, definition.defaultValue)) {
        continue;
      }

      serialized[definition.as || key] =
        typeof definition.serialize === 'function'
          ? definition.serialize(value)
          : emberSerialize(value, definition.defaultValue);
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
   * should take its own output (every adapter in `ember-parachute/adapters`
   * does). Lists and objects need a `serialize` of their own for links to a
   * route that may not have loaded.
   */
  forLink(
    values: Partial<T>,
    { keepDefaults = true }: SerializeOptions = {},
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const given = values as Record<string, unknown>;

    for (const [key, definition] of Object.entries(this.queryParams)) {
      if (!(key in given)) {
        continue;
      }

      const value = given[key];

      if (!keepDefaults && isSameValue(value, definition.defaultValue)) {
        continue;
      }

      params[definition.as || key] =
        typeof definition.serialize === 'function'
          ? definition.serialize(value)
          : value;
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
  deserialize(params: Record<string, unknown> = {}): T {
    const values: Record<string, unknown> = {};

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

    return values as T;
  }

  /** The parachute meta of a controller (asserts it has one). */
  static metaFor(controller: object): ParachuteMeta {
    return metaFor(controller);
  }

  /** Whether a controller is set up with ember-parachute. */
  static hasParachute(controller: unknown): boolean {
    return hasParachute(controller);
  }

  /** The definition whose name in the address is `urlKey`. */
  static lookupQueryParam(
    controller: object,
    urlKey: string,
  ): QueryParam<any> | undefined {
    return metaFor(controller).queryParamsArray.find(
      (queryParam) => queryParam.as === urlKey,
    );
  }

  /** Every query param's current value, by property name. */
  static queryParamsFor(controller: object): Record<string, unknown> {
    return queryParamsFor(controller);
  }

  /** Where each query param stands. */
  static stateFor(controller: object): QueryParamsState {
    return stateFor(controller);
  }

  /**
   * Back to the defaults: every query param, or the given keys. The default
   * itself is set, not a copy.
   */
  static resetParamsFor(controller: object, params: string[] = []): void {
    resetParamsFor(controller, params);
  }

  /** A new default for one query param of one controller. */
  static setDefaultValue(
    controller: object,
    param: string,
    defaultValue: unknown,
  ): void {
    setDefaultValue(controller, param, defaultValue);
  }
}
