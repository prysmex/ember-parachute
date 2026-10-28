---
order: 2
---

# Defining query params

A `QueryParams` is a set of definitions, keyed by controller property:

```ts
import QueryParams from 'prysmex-ember-parachute';
import { integer, list, oneOf } from 'prysmex-ember-parachute/adapters';

export const searchQueryParams = new QueryParams({
  search: { as: 'q', defaultValue: '', refresh: true, replace: true },
  page: { defaultValue: 1, refresh: true, ...integer(1) },
  sort: {
    defaultValue: 'name' as 'name' | 'price',
    ...oneOf(['name', 'price'], 'name'),
  },
  tags: { defaultValue: [] as string[], ...list() },
  dense: { defaultValue: false },
});
```

Live: the [search example](/examples/search).

## The options

| Option                            | What it does                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defaultValue`                    | The value when the address doesn't mention it. A value equal to its default leaves the address. Its type is the property's type.                                                                 |
| `as`                              | Its name in the address (`?q=`). Defaults to the property's name. Ember takes query params in links and transitions **by this name** ([Links & deep links](/guides/links-and-deep-links)).       |
| `refresh`                         | A change sets `event.shouldRefresh` in `queryParamsDidChange`. Your hook decides what to do; nothing reloads by itself. (Ember's own `refreshModel`, on the route, is separate and still works.) |
| `replace`                         | A change replaces the current history entry instead of pushing one (Back skips it). For values that change often, like a search box.                                                             |
| `scope`                           | `'controller'`: one value for every model of the route. Without it, Ember keeps a value per model ([Sticky values](/guides/sticky-values)).                                                      |
| `serialize(value, controller?)`   | The value, as the address holds it.                                                                                                                                                              |
| `deserialize(value, controller?)` | What the address holds, as the controller holds it.                                                                                                                                              |

Without `serialize` / `deserialize`, Ember's own rules apply, by the type of the default: numbers and booleans are read from their text, lists as JSON, everything else as text. An object without a `serialize` is written `[object Object]` (that's Ember's): give objects one, `json()` for instance. See [Adapters](/guides/adapters).

### `serialize` and `deserialize` must be exact inverses

Ember doesn't call them once. A transition serializes the value into the address, the controller gets it back through `deserialize`, and the value written to the address is serialized again from the controller. A pair that isn't an exact inverse (one that adds a `!`, say) drifts a little on every round trip. And for links, `serialize` may be handed its own output: it should give it back unchanged. The adapters do both.

### One `replace: false` makes the whole update a push

Changes made together are one transition. If any of them doesn't replace, Ember pushes a new entry for all of them.

## Several sets, and extending one

The constructor merges any number of objects, later keys winning, and a key given as `undefined` or `null` drops the definition:

```ts
const paginate = {
  page: { defaultValue: 1, ...integer(1) },
  per: { defaultValue: 20, ...integer(20) },
};
const searchable = { search: { as: 'q', defaultValue: '' } };

const queryParams = new QueryParams(paginate, searchable, { per: undefined });
```

`extend()` gives a new set from this one's definitions and more, leaving the original as it was:

```ts
const archived = queryParams.extend({ archived: { defaultValue: false } });
```

Extend a set rather than mixing a second set into a subclass of a parachute controller: Ember concatenates both sets' query params, but parachute only knows the subclass's set ([Ember quirks](/guides/ember-quirks)).

## An app's conventions: `queryParamsWithDefaults`

When every query param of an app should refresh and replace unless it says otherwise, declare it once:

```ts
// app/utils/query-params.ts
import { queryParamsWithDefaults } from 'prysmex-ember-parachute';

export const appQueryParams = queryParamsWithDefaults({
  refresh: true,
  replace: true,
});

// a controller
const queryParams = appQueryParams({
  search: { defaultValue: '' },
  print: { defaultValue: false, replace: false }, // its own option wins
});
```

It takes the options every definition can share (not `as` or `defaultValue`), and returns a function that works like `new QueryParams(...)`.

## TypeScript

A property's type is inferred from its `defaultValue` only (`serialize` / `deserialize` don't widen it). When the default doesn't say it all, say it:

```ts
tags: { defaultValue: [] as string[] },     // [] alone is never[]
limit: { defaultValue: null as number | null },
sort: { defaultValue: 'name' as 'name' | 'price' },
```

More in [TypeScript](/guides/typescript).
