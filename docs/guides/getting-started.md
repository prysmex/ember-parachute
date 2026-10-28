---
order: 1
---

# Getting started

ember-parachute lets a controller declare its query params once: each one's default, its name in the address, how it is written to and read from the address, and whether a change refreshes data or replaces the history entry. The route then calls three hooks on the controller, `setup`, `queryParamsDidChange` and `reset`, with what changed, already deserialized.

## Install

```sh
pnpm add prysmex-ember-parachute
```

It needs Ember 5.8 or later (it is tested up to Ember's alpha), and, for its types, TypeScript 5.4 or later.

## Install the route hooks, once

Routes call the controller's hooks only once `installParachute()` has run. Call it before the first route is made: in an initializer, or in `app.ts`.

```ts
// app/initializers/ember-parachute.ts
import { installParachute } from 'prysmex-ember-parachute';

export function initialize() {
  installParachute();
}

export default { initialize };
```

Or re-export the one the package ships:

```js
// app/initializers/ember-parachute.js
export { default } from 'prysmex-ember-parachute/initializer';
```

Nothing is installed behind your back: ember-parachute 2 has no app re-exports and no build hooks.

## A first controller

```ts
// app/controllers/posts.ts
import Controller from '@ember/controller';
import QueryParams, {
  type ParachuteEvent,
  type QueryParamValues,
} from 'prysmex-ember-parachute';
import { integer } from 'prysmex-ember-parachute/adapters';

const queryParams = new QueryParams({
  search: { as: 'q', defaultValue: '', refresh: true, replace: true },
  page: { defaultValue: 1, refresh: true, ...integer(1) },
});

type Values = QueryParamValues<typeof queryParams>;

export default class PostsController extends queryParams.mixInto(Controller) {
  // the route set the controller up: entered, or a new model
  setup({ queryParams }: ParachuteEvent<Values>) {
    this.fetch(queryParams);
  }

  // a query param changed while on the route
  queryParamsDidChange({ shouldRefresh, queryParams }: ParachuteEvent<Values>) {
    if (shouldRefresh) {
      this.fetch(queryParams);
    }
  }

  // the route is being left (isExiting), or moves to another model
  reset(_event: ParachuteEvent<Values>, isExiting: boolean) {
    if (isExiting) {
      this.resetQueryParams();
    }
  }

  fetch(values: Values) {
    // ...
  }
}
```

`mixInto(Controller)` gives back a native subclass of `Controller` with `search` and `page` on it, typed (`this.page` is a `number`), plus `allQueryParams`, `queryParamsState`, `resetQueryParams()` and `setDefaultQueryParamValue()`.

Change a query param by setting the controller property, `set(this, 'page', 2)`, and the address follows. Visit `/posts?q=ember&page=3` and `setup` gets `{ search: 'ember', page: 3 }`.

Prefer fields? The same controller with decorators is in [Decorators](/guides/decorators).

## Next

- [Defining query params](/guides/defining-query-params): every option.
- [Hooks and events](/guides/hooks-and-events): when each hook runs, with what.
- [Links & deep links](/guides/links-and-deep-links): building links from the same definitions.
- The [examples](/examples): each one live, with its address and hooks beside it.
