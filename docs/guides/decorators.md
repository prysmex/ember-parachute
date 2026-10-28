---
order: 3
---

# Decorators

The same definitions, on the controller's fields:

```ts
import Controller from '@ember/controller';
import { queryParam, withParachute } from 'prysmex-ember-parachute';
import { integer, list, oneOf } from 'prysmex-ember-parachute/adapters';

@withParachute
export default class SearchController extends Controller {
  @queryParam({ as: 'q', refresh: true, replace: true }) search = '';
  @queryParam({ ...integer(1), refresh: true }) page = 1;
  @queryParam({ ...oneOf(['name', 'price'], 'name') }) sort: 'name' | 'price' =
    'name';
  @queryParam tags: string[] = [];

  next = () => {
    this.page++; // a query param change: the address follows
  };
}
```

Live: the [decorators example](/examples/decorators).

- **The field's value is the default.** Each instance gets its own (the field's initializer runs per instance), so a `[]` default isn't shared between controllers.
- **The fields are tracked.** A plain assignment, `this.page = 2`, is a query param change, like `set(this, 'page', 2)`.
- **A field without a value** takes `defaultValue` from the options: `@queryParam({ defaultValue: 'name' }) sort!: string;`. Giving both a value and a `defaultValue` fails (in development): give it one or the other.
- `@queryParam` takes every option of a definition ([Defining query params](/guides/defining-query-params)) but `defaultValue` is only for fields without a value. Bare `@queryParam` is fine.

## `@withParachute` is required

`@queryParam` only records the field. `@withParachute` reads every `@queryParam` field of the class (its parents' included) and sets the class up, as `mixInto` does: the hooks, `allQueryParams`, `queryParamsState`, `resetQueryParams`, `setDefaultQueryParamValue`.

Forget it and the route fails, in development, with: _The controller of 'search' has @queryParam fields but no @withParachute._

`@withParachute` alone, with no `@queryParam` field, gives a controller the hooks without any query param of its own.

## Subclasses merge

```ts
@withParachute
class FilteredSearchController extends SearchController {
  @queryParam({ ...list() }) status: string[] = ['open'];
  @queryParam({ as: 'p' }) page = 2; // overrides the parent's definition
}
```

The subclass knows its fields and its parents', so the hooks, `allQueryParams` and `resetQueryParams` cover all of them. (Mixing a second `QueryParams` set into a subclass doesn't merge: see [Ember quirks](/guides/ember-quirks).)

## Types

A decorator can't change a class's type, so tell TypeScript what `@withParachute` adds by merging an interface into the class:

```ts
import type { QueryParamMixin } from 'prysmex-ember-parachute';

interface Values {
  search: string;
  page: number;
}

@withParachute
export default class SearchController extends Controller {
  // ...
}

export default interface SearchController extends QueryParamMixin<Values> {}
```

Then `this.resetQueryParams(['page'])` and `this.queryParamsState.page.changed` are typed.
