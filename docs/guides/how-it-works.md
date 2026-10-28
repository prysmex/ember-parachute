---
order: 14
---

# How it works

ember-parachute is two halves over Ember's own interfaces: the controller side (the definitions, as Ember's controller `queryParams`) and the route side (the hooks, in Ember's route methods).

## The controller side

`mixInto(Controller)` returns a native subclass of the class you give it:

- `queryParams`, Ember's own controller property, as a class field: the base's, then `{ search: { as: 'q', scope }, ... }`, concatenated as Ember concatenates it;
- the default values on the subclass's prototype, where a mixin would have put them, so the class's own fields win;
- getters for `allQueryParams` and `queryParamsState`, and a copy of the definitions for each controller instance (`setDefaultQueryParamValue` changes one controller's);
- `resetQueryParams` and `setDefaultQueryParamValue`.

No mixin, no `extend()`. `@withParachute` does the same with the class's `@queryParam` fields, which `@queryParam` makes tracked.

## The route side

`installParachute()` replaces five methods of `Route.prototype` (`setupController`, `resetController`, `deserialize`, `serializeQueryParam`, `deserializeQueryParam`) and Route's `queryParamsDidChange` action, each with a function that calls the one it replaced, then does its part:

- `setupController` builds the event and calls `setup`, and gives the route the definitions' `replace` flags (under the route's own `queryParams` options);
- `resetController` calls `reset`;
- the `queryParamsDidChange` action schedules the controller's `queryParamsDidChange` after render;
- `serializeQueryParam` / `deserializeQueryParam` run each definition's `serialize` / `deserialize` (on the controller class's prototype when the route hasn't set its controller up yet: a link to a route not entered);
- `deserialize` waits for routes of the transition that are still loading.

Every route, native or classic, reaches these through `super` (or `_super`). A route class with an `@action` has its own copy of Route's actions, made when the class was defined; its `queryParamsDidChange` is wrapped the first time it sets a controller up. `uninstallParachute()` puts back the very functions it replaced.

1.x did this with `Route.reopen(Mixin)`. Patching the prototype does the same without `reopen` or a mixin, and can be undone.

## Ready for Ember 8

Ember 7.4 deprecates mixins, `Evented` and `@ember/object/events` (`addListener`, `sendEvent`), and 7.5 `@ember/utils`' `typeOf`, all to be removed in Ember 8. ember-parachute 2 uses none of them, unless you ask for 1.x's `Mixin` or pass `sendEvent`.

How that's checked:

- **The whole test suite runs with every Ember deprecation enabled**, the ones not enabled yet included (`EmberENV._ALL_DEPRECATIONS_ENABLED`). A test that hits a deprecation fails, except the ones about 1.x's deprecated paths.
- **An Ember contract suite** (`tests/acceptance/ember-contract-test.ts`): one test for each thing parachute needs Ember to keep doing, named after it, run on Ember alone (`setupController(controller, model, transition)`, the `queryParamsDidChange` action's arguments, `transition.routeInfos`, a route's `queryParams[key].replace` read when a value changes, tracked query params, ...). An Ember that changes one fails that test by name.
- **Every Ember from 5.8**: the CI runs the suite on Ember 5.8, 5.12, 6.4, 6.8, 6.12, 7.3, the latest, the beta and the alpha.

### Ember 7.5 (alpha, October 2026)

7.5 brings route managers (the NavigationState RFC), and with them a router that waits for a route's ancestors itself. On 7.5.0-alpha.5 the whole suite passes but for:

- the contract test for `transition.routeInfos`: its items no longer have `route` / `routePromise`, so `deserialize`'s wait for split routes doesn't run. It isn't needed there: the split route tests pass on the alpha, the router waiting by itself. The test stays, failing by name, until 7.5 is released and the wait can be dropped for it;
- the ember-rison-qs tests: ember-rison-qs doesn't run on the alpha yet (it finds no `route.serializeQueryParam` to replace).
- **Whole-log pins**: the hooks, the addresses and their push / replace, as Ember produces them, compared whole. A change in Ember's routing shows as a diff.

## Does it need to be an addon?

Hardly. ember-parachute is a v2 addon only so that its `@ember/*` imports resolve through `@embroider/addon-shim` in classic builds. It has no app re-exports, no initializers of its own, no build hooks, no services: everything is explicit, a package of functions and classes over Ember's `Route` and `Controller`. In a Vite / Embroider app it's an ES module package like any other.
