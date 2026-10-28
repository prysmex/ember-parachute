---
order: 13
---

# Upgrading from 1.x

2.0 keeps 1.x's API, `QueryParams`, its static helpers and the three hooks, and moves off what Ember is deprecating. It's a v2 addon in TypeScript.

## A new package name

2.0 is published as `prysmex-ember-parachute`. Swap the package, then the imports:

```sh
pnpm remove ember-parachute
pnpm add prysmex-ember-parachute
```

```diff
- import QueryParams from 'ember-parachute';
+ import QueryParams from 'prysmex-ember-parachute';
```

## Requirements

Ember 5.8 or later, Node 20 or later, TypeScript 5.4 or later for its types.

## Install the hooks yourself

1.x installed its route hooks from an initializer of its own. 2.0 has no app re-exports: add one line ([Getting started](/guides/getting-started)).

```js
// app/initializers/ember-parachute.js
export { default } from 'prysmex-ember-parachute/initializer';
```

## `Controller.extend(qp.Mixin)` → `qp.mixInto(Controller)`

```ts
// 1.x
export default class PostsController extends Controller.extend(
  queryParams.Mixin,
) {}

// 2.0
export default class PostsController extends queryParams.mixInto(Controller) {}
```

`mixInto` makes a native subclass, typed. Ember 7.4 deprecates mixins (to be removed in Ember 8); `queryParams.Mixin` still works, made the first time it's read, and is deprecated.

## Ember events → `addParachuteListener`

1.x also sent each hook as an Ember event (`addListener(controller, 'setup', ...)`). Ember 7.4 deprecates `@ember/object/events`. 2.0 sends them only with `installParachute({ sendEvent })` (Ember's `sendEvent`); use [`addParachuteListener`](/guides/hooks-and-events#listening-from-elsewhere-addparachutelistener) instead.

## The decorators

1.x's `@queryParam` / `@withParachute` were written for the stage 1 decorators proposal, gone from today's builds. 2.0's are new, on today's (legacy) decorators: `@queryParam` fields are tracked, a subclass's merge with its parents', and `@withParachute` is required ([Decorators](/guides/decorators)).

## What changed in behavior

- **`queryParamsDidChange`'s `changed` is typed.** For a query param without `deserialize`, 1.x gave the router's text (`{ page: '2' }`); 2.0 reads it as the controller does (`{ page: 2 }`).
- **No loading substate on every transition.** The route's `deserialize` waits only while a route of the transition is still loading, on the router's own promises. A copy of 1.x waiting with native promises made every transition async, so a `loading` route showed on each one, and the route was exited and entered for it: `reset` with `isExiting: true` before the `model` hook. Now a refresh is `model`, `reset` (`isExiting: false`), `setup`.
- **Routes with an `@action` hear changes.** A route class with an `@action` copies Route's actions when it's defined: before the hooks were installed, so 1.x's `queryParamsDidChange` never reached it. 2.0 catches up when such a route sets its controller up.
- **A route without a controller of its own** (Ember generates one) no longer fails on a link to it.

## New

`forLink`, `serialize` and `deserialize` for links and addresses ([Links & deep links](/guides/links-and-deep-links)), [adapters](/guides/adapters), `queryParamsWithDefaults`, [test-support](/guides/testing), `uninstallParachute`, types throughout.
