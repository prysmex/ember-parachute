import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { set } from '@ember/object';
import Route from '@ember/routing/route';
import { schedule } from '@ember/runloop';

import { config, type ParachuteOptions } from './-private/config.ts';
import { hasDecoratedQueryParams } from './-private/decorated.ts';
import ParachuteEvent from './-private/event.ts';
import { notify } from './-private/listeners.ts';
import { hasParachute, metaFor } from './-private/state.ts';
import QueryParams from './query-params.ts';

export type { ParachuteOptions } from './-private/config.ts';

// Route's own methods, untyped: they hand back whatever Ember's do
type Fn = (this: RouteLike, ...args: any[]) => unknown;

// A route, as these hooks see it (Ember's types keep most of it protected)
interface RouteLike {
  routeName: string;
  controller?: object;
  controllerName?: string;
  queryParams?: Record<string, Record<string, unknown>>;
  actions?: Record<string, Fn>;
}

// router_js' RouteInfo: `route` is undefined while its bundle loads
interface RouteInfoLike {
  isResolved?: boolean;
  route?: object;
  routePromise?: PromiseLike<unknown>;
}

interface Factory {
  class: { proto?(): object; prototype: object };
}

// What the route side replaces on Route.prototype
const HOOKS = [
  'setupController',
  'resetController',
  'deserialize',
  'serializeQueryParam',
  'deserializeQueryParam',
] as const;

// Set on Route once installed (as ember-parachute 1.x did, so a copy of 1.x
// an app replaces with this one doesn't install twice)
const INSTALLED = '_didInitializeParachute';

// A wrapped `queryParamsDidChange` action: the function it wraps
const WRAPS = Symbol('ember-parachute:wraps');

const originals = new Map<string, Fn>();
// every `actions` object whose queryParamsDidChange is wrapped
const wrappedActions = new Set<Record<string, Fn>>();
// routes whose queryParams map has the definitions' replace flags
const routesWithMap = new WeakSet<object>();
// the `changed` of each action call, by route it was scheduled for: an
// app's own queryParamsDidChange action calling super goes through two
// wrapped functions
const scheduled = new WeakMap<object, WeakSet<object>>();

const routePrototype = () =>
  Route.prototype as unknown as Record<string, Fn | Record<string, Fn>>;

/**
 * The route's controller; before the route has set one up (a link built to
 * a route not entered yet), its class's prototype. None when the route has
 * no controller of its own (Ember generates one, without query params).
 */
function lookupController(route: RouteLike): object | undefined {
  const controller = route.controller;

  if (controller) {
    return controller;
  }

  const controllerName = route.controllerName || route.routeName;
  const factory = getOwner(route)?.factoryFor(
    `controller:${controllerName}`,
  ) as Factory | undefined;

  // proto(): a classic class applies its mixins to its prototype then
  return factory?.class.proto?.() ?? factory?.class.prototype;
}

// queryParamsDidChange, after render, with what changed
// (afterRender, as 1.x: the hook sees what the change rendered)
function scheduleChangeEvent(
  routeName: string,
  controller: object,
  changed: Record<string, unknown>,
) {
  // eslint-disable-next-line ember/no-runloop
  schedule('afterRender', null, () => {
    notify(controller, 'queryParamsDidChange', [
      new ParachuteEvent(routeName, controller, changed),
    ]);
  });
}

// the definitions' `replace` flags, under whatever the route sets itself
function setupQueryParamsMap(route: RouteLike, controller: object) {
  if (routesWithMap.has(route)) {
    return;
  }

  const qpMap = route.queryParams ?? {};
  const { qpMapForRoute } = metaFor(controller);
  const merged: Record<string, Record<string, unknown>> = {};

  for (const key of Object.keys(qpMapForRoute)) {
    merged[key] = { ...qpMapForRoute[key], ...qpMap[key] };
  }

  set(route, 'queryParams', merged);
  routesWithMap.add(route);
}

function wrapQueryParamsDidChange(original: Fn): Fn {
  // Ember's own route action for a query param change
  const queryParamsDidChange: Fn = function (
    this: RouteLike,
    changed: Record<string, unknown> = {},
    _present: unknown,
    removed: Record<string, unknown> = {},
  ) {
    const { controller, routeName } = this;
    const routes = scheduled.get(changed) ?? new WeakSet<object>();

    if (controller && hasParachute(controller) && !routes.has(this)) {
      routes.add(this);
      scheduled.set(changed, routes);
      scheduleChangeEvent(routeName, controller, { ...changed, ...removed });
    }

    // eslint-disable-next-line prefer-rest-params
    return original.apply(this, arguments as unknown as unknown[]);
  };

  (queryParamsDidChange as unknown as Record<symbol, Fn>)[WRAPS] = original;

  return queryParamsDidChange;
}

/**
 * Wraps the queryParamsDidChange action of a route's `actions`. A route
 * class with an `@action` has an `actions` of its own, copied from its
 * parent's when the class was defined: before installParachute, if the
 * module ran first.
 */
function wrapActionsOf(target: { actions?: Record<string, Fn> }) {
  const actions = target.actions;
  const action = actions?.queryParamsDidChange;

  if (
    actions &&
    typeof action === 'function' &&
    !(action as unknown as Record<symbol, unknown>)[WRAPS]
  ) {
    actions.queryParamsDidChange = wrapQueryParamsDidChange(action);
    wrappedActions.add(actions);
  }
}

function hooks(): Record<(typeof HOOKS)[number], (original: Fn) => Fn> {
  return {
    setupController: (original) =>
      function (
        this: RouteLike,
        controller: object,
        _model: unknown,
        transition: unknown,
      ) {
        // eslint-disable-next-line prefer-rest-params
        original.apply(this, arguments as unknown as unknown[]);

        if (hasParachute(controller)) {
          wrapActionsOf(this);
          setupQueryParamsMap(this, controller);

          const event = new ParachuteEvent(this.routeName, controller, {});

          // on entering, everything that differs from its default is a change
          event.changed = event.changes;
          event.shouldRefresh = true;

          notify(controller, 'setup', [event, transition]);
        } else {
          assert(
            `[ember-parachute] The controller of '${this.routeName}' has @queryParam fields but no @withParachute.`,
            !hasDecoratedQueryParams(controller),
          );
        }
      },

    resetController: (original) =>
      function (this: RouteLike, controller: object, isExiting: boolean) {
        // eslint-disable-next-line prefer-rest-params
        original.apply(this, arguments as unknown as unknown[]);

        if (hasParachute(controller)) {
          const event = new ParachuteEvent(this.routeName, controller, {});

          event.shouldRefresh = false;

          notify(controller, 'reset', [event, isExiting]);
        }
      },

    // A transition's routes may still be loading (split routes, lazy
    // engines): wait for them, so their query params are known before the
    // model hook. Only then: a promise here makes the transition async,
    // which shows loading substates. And on the router's own (RSVP)
    // promises, which settle inside the run loop.
    deserialize: (original) =>
      function (
        this: RouteLike,
        params: unknown,
        transition?: { routeInfos?: RouteInfoLike[] },
      ) {
        const routeInfos = transition?.routeInfos;
        const loading = Array.isArray(routeInfos)
          ? routeInfos.filter(
              (routeInfo) =>
                !routeInfo.isResolved &&
                routeInfo.route === undefined &&
                routeInfo.routePromise !== undefined,
            )
          : [];

        if (loading.length === 0) {
          return original.call(this, params, transition);
        }

        let loaded = loading[0]!.routePromise!;

        for (const routeInfo of loading.slice(1)) {
          loaded = loaded.then(() => routeInfo.routePromise);
        }

        return loaded.then(() => original.call(this, params, transition));
      },

    serializeQueryParam: (original) =>
      function (this: RouteLike, value: unknown, urlKey: string) {
        const controller = lookupController(this);

        if (controller && hasParachute(controller)) {
          const queryParam = QueryParams.lookupQueryParam(controller, urlKey);

          if (typeof queryParam?.serialize === 'function') {
            return queryParam.serialize(value, controller);
          }
        }

        // eslint-disable-next-line prefer-rest-params
        return original.apply(this, arguments as unknown as unknown[]);
      },

    deserializeQueryParam: (original) =>
      function (this: RouteLike, value: unknown, urlKey: string) {
        const controller = lookupController(this);

        if (controller && hasParachute(controller)) {
          const queryParam = QueryParams.lookupQueryParam(controller, urlKey);

          if (typeof queryParam?.deserialize === 'function') {
            return queryParam.deserialize(value, controller) as unknown;
          }
        }

        // eslint-disable-next-line prefer-rest-params
        return original.apply(this, arguments as unknown as unknown[]);
      },
  };
}

/** Whether `installParachute` has run (in this app, or any copy of it). */
export function isParachuteInstalled(): boolean {
  return Boolean((Route as unknown as Record<string, unknown>)[INSTALLED]);
}

/**
 * Adds ember-parachute's hooks to every route: calls the controller's
 * `setup` / `reset` / `queryParamsDidChange`, runs address values through
 * the definitions' `serialize` / `deserialize`, and gives the route the
 * definitions' `replace` flags.
 *
 * Call it once, before the first route is made: in an initializer, or in
 * `app.ts`. Calling it again only updates the options.
 *
 * ```ts
 * // app/initializers/ember-parachute.ts
 * import { installParachute } from 'prysmex-ember-parachute';
 *
 * export function initialize() {
 *   installParachute();
 * }
 *
 * export default { initialize };
 * ```
 */
export function installParachute(options: ParachuteOptions = {}): void {
  config.readValue = options.readValue ?? ((value) => value);
  config.sendEvent = options.sendEvent;

  if (isParachuteInstalled()) {
    return;
  }

  // a classic class: its reopen()ed members (the actions) reach its
  // prototype here
  (Route as unknown as { proto?(): object }).proto?.();

  const proto = routePrototype();
  const make = hooks();

  for (const name of HOOKS) {
    const original = proto[name] as Fn;

    assert(
      `[ember-parachute] Route#${name} is gone: this Ember can't run ember-parachute.`,
      typeof original === 'function',
    );

    originals.set(name, original);
    proto[name] = make[name](original);
  }

  wrapActionsOf(proto as { actions?: Record<string, Fn> });

  assert(
    `[ember-parachute] Route's queryParamsDidChange action is gone: this Ember can't run ember-parachute.`,
    wrappedActions.size > 0,
  );

  (Route as unknown as Record<string, unknown>)[INSTALLED] = true;
}

/**
 * Takes ember-parachute's hooks off the routes again, putting back the very
 * functions it replaced. For tests; an app installs once.
 */
export function uninstallParachute(): void {
  const proto = routePrototype();

  for (const [name, original] of originals) {
    proto[name] = original;
  }

  for (const actions of wrappedActions) {
    const action = actions.queryParamsDidChange as unknown as Record<
      symbol,
      Fn
    >;

    if (action?.[WRAPS]) {
      actions.queryParamsDidChange = action[WRAPS];
    }
  }

  originals.clear();
  wrappedActions.clear();
  config.readValue = (value) => value;
  config.sendEvent = undefined;
  delete (Route as unknown as Record<string, unknown>)[INSTALLED];
}
