# Changelog

## v2.0.0

A v2 addon, in TypeScript, on native classes, ready for Ember 8. See [Upgrading from 1.x](https://ember-parachute.vercel.app/guides/upgrading).

### Breaking

- Published as `prysmex-ember-parachute` (was `ember-parachute`): change the package and its imports.
- Ember 5.8 or later, Node 20 or later.
- The route hooks are no longer installed by an initializer of the addon's: call `installParachute()`, or re-export `prysmex-ember-parachute/initializer` from `app/initializers`.
- Hooks are no longer sent as Ember events (`addListener` from `@ember/object/events`, deprecated in Ember 7.4): use `addParachuteListener`, or pass Ember's `sendEvent` to `installParachute({ sendEvent })`.
- `queryParamsDidChange`'s `event.changed` reads a query param without `deserialize` as the controller does (`{ page: 2 }`, was `{ page: '2' }`).
- The stage 1 `@queryParam` / `@withParachute` decorators are replaced by new ones on today's decorators: `@queryParam` fields are tracked, and `@withParachute` is required.

### Deprecated

- `QueryParams#Mixin` (Ember 7.4 deprecates mixins): use `mixInto(Controller)`.

### Added

- `QueryParams#mixInto(Base)`: a native, typed subclass.
- `QueryParams#forLink`, `#serialize`, `#deserialize`: links, `urlFor` and addresses read without a route.
- `prysmex-ember-parachute/adapters`: `integer`, `number`, `boolean`, `json`, `list`, `oneOf`, `date`.
- `queryParamsWithDefaults`, `addParachuteListener`, `uninstallParachute`, `isParachuteInstalled`, `QueryParamValues`.
- `prysmex-ember-parachute/test-support`: `RecordingLocation`, `recordParachuteEvents`.
- `installParachute({ readValue })`, for routers that keep values in a shape of their own (ember-rison-qs).
- TypeScript declarations, values inferred from each `defaultValue`.
- A site with guides and live examples.

### Fixed

- The route's `deserialize` waits only while a route of the transition is still loading, and on the router's own promises: a transition whose routes have loaded no longer shows a loading substate.
- Routes whose class has an `@action` (its own copy of Route's actions, made before the hooks were installed) get `queryParamsDidChange`.
- A link to a route without a controller of its own no longer fails.
- An app's own `queryParamsDidChange` action calling `super` doesn't schedule the event twice.

## v1.0.2

### Pull Requests

- [#79](https://github.com/offirgolan/ember-parachute/pull/79) fix: Handle multiple queryParams created by applying multiple mixins _by [Offir Golan](https://github.com/offirgolan)_

## v1.0.1

### Pull Requests

- [#75](https://github.com/offirgolan/ember-parachute/pull/75) Remove NAME*KEY usage \_by [efx](https://github.com/efx)*

## v1.0.0

### Pull Requests

- [#68](https://github.com/offirgolan/ember-parachute/pull/68) chore: Upgrade to 3.6 _by [Offir Golan](https://github.com/offirgolan)_
- [#69](https://github.com/offirgolan/ember-parachute/pull/69) feat: `queryParam` & `withParachute` decorators _by [Offir Golan](https://github.com/offirgolan)_
- [#71](https://github.com/offirgolan/ember-parachute/pull/71) fix: Use `RouteInfo` api over `HandlerInfo` when possible _by [Offir Golan](https://github.com/offirgolan)_

## v0.3.8

### Pull Requests

- [#60](https://github.com/offirgolan/ember-parachute/pull/60) Typescript and Engines support _by [chrisseto](https://github.com/chrisseto)_

## v0.3.7

### Pull Requests

- [#50](https://github.com/offirgolan/ember-parachute/pull/50) feat: pass controller to serialize / deserialize _by [buschtoens](https://github.com/buschtoens)_

## v0.3.6

### Pull Requests

- [#47](https://github.com/offirgolan/ember-parachute/pull/47) Add serialized information to queryParamsState _by [anehx](https://github.com/anehx)_

## v0.3.5

### Pull Requests

- [#45](https://github.com/offirgolan/ember-parachute/pull/45) Prevent multiple initializations _by [anehx](https://github.com/anehx)_

## v0.3.4

### Pull Requests

- [#44](https://github.com/offirgolan/ember-parachute/pull/44) Adds transition from setupController to the setup hook _by [jasonmit](https://github.com/jasonmit)_

## v0.3.3

### Pull Requests

- [#37](https://github.com/offirgolan/ember-parachute/pull/37) Bump ember-getowner-polyfill to v2.0.1 _by [HeroicEric](https://github.com/HeroicEric)_
- [#42](https://github.com/offirgolan/ember-parachute/pull/42) Remove obsolete service import _by [anehx](https://github.com/anehx)_

## v0.3.2

### Pull Requests

- [#34](https://github.com/offirgolan/ember-parachute/pull/34) Fix for setting controllerName in route _by [abhilashlr](https://github.com/abhilashlr)_

## v0.3.1

### Pull Requests

- [#33](https://github.com/offirgolan/ember-parachute/pull/33) Replace use of Array.p.includes to fix IE support _by [Jason Mitchell](https://github.com/jasonmit)_

## v0.3.0

### Pull Requests

- [#30](https://github.com/offirgolan/ember-parachute/pull/30) Add `setup` and `reset` lifecycle hooks + `replace` support _by [Offir Golan](https://github.com/offirgolan)_
- [#31](https://github.com/offirgolan/ember-parachute/pull/31) Use keys to determine if there is a change or not _by [Offir Golan](https://github.com/offirgolan)_

## v0.2.0

### Pull Requests

- [#16](https://github.com/offirgolan/ember-parachute/pull/16) [FEATURE] Serialize / deserialize QPs _by [Lauren Tan](https://github.com/poteto)_

## 0.1.0

- Initial Release

## 0.0.0

- Hold Your Horses,
- Pack Your Parachutes,
- We're Coming,
- But we haven't released anything yet.
