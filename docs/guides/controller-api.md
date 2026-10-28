---
order: 5
---

# The controller API

What `mixInto(Controller)`, `@withParachute` (and 1.x's `Mixin`) add to a controller.

## `allQueryParams`

Every query param's current value, by property name:

```js
controller.allQueryParams; // { page: 1, search: '', tags: [], filter: { status: 'open' } }
```

## `queryParamsState`

Where each query param stands:

```js
controller.queryParamsState.search;
// { value: 'Hello', serializedValue: 'HELLO', as: 'q', defaultValue: '', changed: true }
```

`changed` compares the value with its default **as JSON**: a new `[]` equal to the default is not a change, but `{ to: 2, from: 1 }` differs from a default of `{ from: 1, to: 2 }` (key order counts). `serializedValue` is the value through the definition's `serialize`.

Both are getters that read each value through Ember's `get`, so a template showing them updates on any change.

## `resetQueryParams(keys?)`

Back to the defaults: every query param, or the given keys (unknown keys are ignored; an empty list means all).

```js
controller.resetQueryParams(); // all
controller.resetQueryParams(['page', 'tags']);
```

It sets **the default value itself**, not a copy: after resetting `tags`, `controller.tags` is the very array in the definition. Don't mutate it in place (`this.tags.push(...)`): set a new array.

## `setDefaultQueryParamValue(key, value)`

A new default for one query param, on this controller only (each controller instance has its own definitions): `queryParamsState` and `resetQueryParams` use it from then on. An unknown key throws: _The query parameter 'nope' does not exist._

```js
controller.setDefaultQueryParamValue('page', 2);
controller.queryParamsState.page; // { value: 1, defaultValue: 2, changed: true, ... }
```

## Values set on the class

A value given on the class body wins over the definition's default, and counts as a change:

```js
class Overriding extends queryParams.mixInto(Controller) {
  page = 3; // queryParamsState.page.changed is true
}
```

## The statics

`QueryParams` has helpers that work on any parachute controller:

|                                                       |                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `QueryParams.hasParachute(controller)`                | Whether it is set up with ember-parachute (`false` for `null`, `undefined`, a plain controller). |
| `QueryParams.metaFor(controller)`                     | Its definitions, normalized (asserts it has them).                                               |
| `QueryParams.lookupQueryParam(controller, urlKey)`    | The definition named `urlKey` **in the address** (`'q'`, not `'search'`).                        |
| `QueryParams.queryParamsFor(controller)`              | `allQueryParams`.                                                                                |
| `QueryParams.stateFor(controller)`                    | `queryParamsState`.                                                                              |
| `QueryParams.resetParamsFor(controller, keys?)`       | `resetQueryParams`.                                                                              |
| `QueryParams.setDefaultValue(controller, key, value)` | `setDefaultQueryParamValue`.                                                                     |

And on a set, without any controller: `serialize`, `forLink` and `deserialize` ([Links & deep links](/guides/links-and-deep-links)).
