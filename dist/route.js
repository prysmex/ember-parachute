import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { set } from '@ember/object';
import Route from '@ember/routing/route';
import { schedule } from '@ember/runloop';
import { config } from './-private/config.js';
import { resetRouterContract, expectRouter } from './-private/contract.js';
import { hasDecoratedQueryParams } from './-private/decorated.js';
import ParachuteEvent from './-private/event.js';
import { notify } from './-private/listeners.js';
import { hasParachute, metaFor } from './-private/state.js';
import QueryParams from './query-params.js';

// Route's own methods, untyped: they hand back whatever Ember's do

// A route, as these hooks see it (Ember's types keep most of it protected)

// router_js' RouteInfo: `route` is undefined while its bundle loads

// The promise of a route of the transition whose bundle is still loading
function loadingPromise(routeInfo) {
  if (routeInfo.isResolved) {
    return undefined;
  }
  if ('managementPromise' in routeInfo) {
    // reading it fetches the route, as the router would: a loaded route
    // has its management then
    const promise = routeInfo.managementPromise;
    return routeInfo.hasResolvedManagement ? undefined : promise;
  }
  return routeInfo.route === undefined ? routeInfo.routePromise : undefined;
}
// What the route side replaces on Route.prototype
const HOOKS = ['setupController', 'resetController', 'deserialize', 'serializeQueryParam', 'deserializeQueryParam'];

// Set on Route once installed (as ember-parachute 1.x did, so a copy of 1.x
// an app replaces with this one doesn't install twice)
const INSTALLED = '_didInitializeParachute';

// A wrapped `queryParamsDidChange` action: the function it wraps
const WRAPS = Symbol('ember-parachute:wraps');
const originals = new Map();
// every `actions` object whose queryParamsDidChange is wrapped
const wrappedActions = new Set();
// routes whose queryParams map has the definitions' replace flags
const routesWithMap = new WeakSet();
// the `changed` of each action call, by route it was scheduled for: an
// app's own queryParamsDidChange action calling super goes through two
// wrapped functions
const scheduled = new WeakMap();
const routePrototype = () => Route.prototype;

/**
 * The route's controller; before the route has set one up (a link built to
 * a route not entered yet), its class's prototype. None when the route has
 * no controller of its own (Ember generates one, without query params).
 */
function lookupController(route) {
  const controller = route.controller;
  if (controller) {
    return controller;
  }
  const owner = getOwner(route);
  expectRouter(owner !== undefined, "a route has no owner, so a link to a route not entered yet doesn't run its query params' serialize");
  const controllerName = route.controllerName || route.routeName;
  const factory = owner?.factoryFor(`controller:${controllerName}`);

  // proto(): a classic class applies its mixins to its prototype then
  return factory?.class.proto?.() ?? factory?.class.prototype;
}

// queryParamsDidChange, after render, with what changed
// (afterRender, as 1.x: the hook sees what the change rendered)
function scheduleChangeEvent(routeName, controller, changed) {
  // eslint-disable-next-line ember/no-runloop
  schedule('afterRender', null, () => {
    notify(controller, 'queryParamsDidChange', [new ParachuteEvent(routeName, controller, changed)]);
  });
}

// the definitions' `replace` flags, under whatever the route sets itself
function setupQueryParamsMap(route, controller) {
  if (routesWithMap.has(route)) {
    return;
  }
  const qpMap = route.queryParams ?? {};
  const {
    qpMapForRoute
  } = metaFor(controller);
  const merged = {};
  for (const key of Object.keys(qpMapForRoute)) {
    merged[key] = {
      ...qpMapForRoute[key],
      ...qpMap[key]
    };
  }
  set(route, 'queryParams', merged);
  routesWithMap.add(route);
}
function wrapQueryParamsDidChange(original) {
  // Ember's own route action for a query param change
  const queryParamsDidChange = function (changed = {}, _present, removed = {}) {
    const {
      controller,
      routeName
    } = this;

    // eslint-disable-next-line prefer-rest-params
    const [given] = arguments;
    expectRouter(typeof given === 'object' && given !== null, "Route's queryParamsDidChange action no longer gets what changed first, so the controller's queryParamsDidChange gets no changes");
    const routes = scheduled.get(changed) ?? new WeakSet();
    if (controller && hasParachute(controller) && !routes.has(this)) {
      routes.add(this);
      scheduled.set(changed, routes);
      scheduleChangeEvent(routeName, controller, {
        ...changed,
        ...removed
      });
    }

    // eslint-disable-next-line prefer-rest-params
    return original.apply(this, arguments);
  };
  queryParamsDidChange[WRAPS] = original;
  return queryParamsDidChange;
}

/**
 * Wraps the queryParamsDidChange action of a route's `actions`. A route
 * class with an `@action` has an `actions` of its own, copied from its
 * parent's when the class was defined: before installParachute, if the
 * module ran first.
 */
function wrapActionsOf(target) {
  const actions = target.actions;
  const action = actions?.queryParamsDidChange;
  if (actions && typeof action === 'function' && !action[WRAPS]) {
    actions.queryParamsDidChange = wrapQueryParamsDidChange(action);
    wrappedActions.add(actions);
  }
}

/**
 * The definition a route's (de)serializeQueryParam is called for: Ember
 * passes the name in the address.
 */
function queryParamFor(controller, urlKey) {
  const queryParam = QueryParams.lookupQueryParam(controller, urlKey);
  expectRouter(queryParam !== undefined || !QueryParams.metaFor(controller).queryParamsArray.some(qp => qp.key === urlKey && qp.as !== urlKey), "a route's serializeQueryParam / deserializeQueryParam get the property name, not the name in the address, so query params with `as` skip their serialize / deserialize");
  return queryParam;
}
function hooks() {
  return {
    setupController: original => function (controller, _model, transition) {
      // eslint-disable-next-line prefer-rest-params
      original.apply(this, arguments);
      if (hasParachute(controller)) {
        expectRouter(typeof this.routeName === 'string', 'a route has no routeName, so the hooks are called with no route name');
        expectRouter(typeof this.actions?.queryParamsDidChange === 'function', "a route has no queryParamsDidChange action, so the controller's queryParamsDidChange is never called");
        wrapActionsOf(this);
        setupQueryParamsMap(this, controller);
        const event = new ParachuteEvent(this.routeName, controller, {});

        // on entering, everything that differs from its default is a change
        event.changed = event.changes;
        event.shouldRefresh = true;
        notify(controller, 'setup', [event, transition]);
      } else {
        assert(`[ember-parachute] The controller of '${this.routeName}' has @queryParam fields but no @withParachute.`, !hasDecoratedQueryParams(controller));
      }
    },
    resetController: original => function (controller, isExiting) {
      // eslint-disable-next-line prefer-rest-params
      original.apply(this, arguments);
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
    deserialize: original => function (params, transition) {
      const routeInfos = transition?.routeInfos;
      expectRouter(!Array.isArray(routeInfos) || routeInfos.every(routeInfo => 'managementPromise' in routeInfo || 'routePromise' in routeInfo), "transition.routeInfos have neither routePromise nor managementPromise, so a route's deserialize doesn't wait for split routes still loading (a parent's paramsFor them is {} on a deep link)");
      const loading = Array.isArray(routeInfos) ? routeInfos.map(loadingPromise).filter(promise => promise !== undefined) : [];
      if (loading.length === 0) {
        return original.call(this, params, transition);
      }
      let loaded = loading[0];
      for (const promise of loading.slice(1)) {
        loaded = loaded.then(() => promise);
      }
      return loaded.then(() => original.call(this, params, transition));
    },
    serializeQueryParam: original => function (value, urlKey) {
      const controller = lookupController(this);
      if (controller && hasParachute(controller)) {
        const queryParam = queryParamFor(controller, urlKey);
        if (typeof queryParam?.serialize === 'function') {
          return queryParam.serialize(value, controller);
        }
      }

      // eslint-disable-next-line prefer-rest-params
      return original.apply(this, arguments);
    },
    deserializeQueryParam: original => function (value, urlKey) {
      const controller = lookupController(this);
      if (controller && hasParachute(controller)) {
        const queryParam = queryParamFor(controller, urlKey);
        if (typeof queryParam?.deserialize === 'function') {
          return queryParam.deserialize(value, controller);
        }
      }

      // eslint-disable-next-line prefer-rest-params
      return original.apply(this, arguments);
    }
  };
}

/** Whether `installParachute` has run (in this app, or any copy of it). */
function isParachuteInstalled() {
  return Boolean(Route[INSTALLED]);
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
function installParachute(options = {}) {
  config.readValue = options.readValue ?? (value => value);
  config.sendEvent = options.sendEvent;
  if (isParachuteInstalled()) {
    return;
  }

  // a classic class: its reopen()ed members (the actions) reach its
  // prototype here
  Route.proto?.();
  const proto = routePrototype();
  const make = hooks();
  for (const name of HOOKS) {
    const original = proto[name];
    assert(`[ember-parachute] Route#${name} is gone: this Ember can't run ember-parachute.`, typeof original === 'function');
    originals.set(name, original);
    proto[name] = make[name](original);
  }
  wrapActionsOf(proto);
  assert(`[ember-parachute] Route's queryParamsDidChange action is gone: this Ember can't run ember-parachute.`, wrappedActions.size > 0);
  Route[INSTALLED] = true;
}

/**
 * Takes ember-parachute's hooks off the routes again, putting back the very
 * functions it replaced. For tests; an app installs once.
 */
function uninstallParachute() {
  const proto = routePrototype();
  for (const [name, original] of originals) {
    proto[name] = original;
  }
  for (const actions of wrappedActions) {
    const action = actions.queryParamsDidChange;
    if (action?.[WRAPS]) {
      actions.queryParamsDidChange = action[WRAPS];
    }
  }
  originals.clear();
  wrappedActions.clear();
  resetRouterContract();
  config.readValue = value => value;
  config.sendEvent = undefined;
  delete Route[INSTALLED];
}

export { installParachute, isParachuteInstalled, uninstallParachute };
//# sourceMappingURL=route.js.map
