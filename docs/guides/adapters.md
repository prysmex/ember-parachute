---
order: 6
---

# Adapters

`ember-parachute/adapters` has ready-made `serialize` / `deserialize` pairs. Spread one into a definition:

```ts
import {
  boolean,
  date,
  integer,
  json,
  list,
  number,
  oneOf,
} from 'ember-parachute/adapters';

new QueryParams({
  page: { defaultValue: 1, ...integer(1) },
  filters: { defaultValue: {} as Filters, ...json({}) },
  tags: { defaultValue: [] as string[], ...list() },
  sort: { defaultValue: 'name' as Sort, ...oneOf(['name', 'date'], 'name') },
});
```

Live: the [adapters playground](/examples/adapters).

Every adapter:

- **reads what it wrote**, and values that are already typed (from a router that keeps them typed, like [ember-rison-qs](/guides/ember-rison-qs));
- **reads anything it can't as its `fallback`** instead of failing: a hand-edited address can't put the controller in a state it doesn't know;
- **takes its own output back** in `serialize`, unchanged. Ember runs `serialize` on what a link gives it, which may already be serialized ([Links & deep links](/guides/links-and-deep-links)).

## `integer(fallback = null)`

Whole numbers. `'3'` and `3` read as `3`; `'3.5'`, `''`, `'x'`, `true` read as the fallback. Writes `Math.trunc` of a number (`3.9` → `3`), or of a numeric string; anything else is `null`.

## `number(fallback = null)`

Any finite number: `'1.5'`, `'1e3'` (→ `1000`). `Infinity` and garbage are the fallback (written as `null`).

## `boolean(fallback = false)`

`'true'`, `'1'`, `'yes'`, `'on'` (any case) read as `true`; `'false'`, `'0'`, `'no'`, `'off'` as `false`; anything else is the fallback. Writes `'true'` / `'false'`. For a flag whose default isn't a boolean (`null`, say): with a boolean default, Ember reads `'true'` already.

## `json(fallback = null)`

Objects and nested lists, as JSON. What doesn't parse, `"[object Object]"` from a link built without a serializer included, reads as the fallback: `json({})` reads it as `{}`.

A string is taken as **JSON already written** (that's how `serialize` takes its own output). So `json()` is for objects and lists, not for strings.

## `list({ separator = ',', item? })`

A list as `a,b,c`, shorter than Ember's JSON for lists. An empty list is an empty value (`?tags=`); a missing value reads as `[]`. `item` is an adapter for each item:

```ts
ids: { defaultValue: [] as number[], ...list({ separator: '-', item: integer() }) },
// ?ids=1-2 → [1, 2]; '1-2-x' → [1, 2, null]
// [1, null, 2] is written 1-2: an item its adapter can't write is left out
```

## `oneOf(values, fallback)`

One of a fixed set (a sort, a tab). `?sort=nope` reads as the fallback; writing a value that isn't one is `null`.

## `date({ time = false, fallback = null })`

A `Date`, as `YYYY-MM-DD`, or the full ISO time with `{ time: true }`. Dates are written **in UTC** (`toISOString()`): `2026-10-28T23:30:00-06:00` is `2026-10-29`. A `YYYY-MM-DD` reads as UTC midnight. Only ISO dates read (`2026-10-28`, `2026-10-28T15:30:00Z`, `2026-10-28T15:30:00+02:00`); anything else (`'42'`, `'10/28/2026'`) is the fallback.

## Your own

An adapter is any `{ serialize, deserialize }`. Keep the two exact inverses, let `serialize` take its own output, and give `deserialize` a fallback:

```ts
const csvOfIds = {
  serialize: (ids: number[] | string) =>
    typeof ids === 'string' ? ids : ids.join(','),
  deserialize: (value: unknown) =>
    String(value ?? '')
      .split(',')
      .filter((id) => id !== '')
      .map(Number)
      .filter(Number.isInteger),
};
```
