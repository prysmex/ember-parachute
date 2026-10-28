---
order: 12
---

# Ember quirks

What Ember (and 1.x, kept as it was) does that may surprise you. Each one is pinned by a test, marked `QUIRK` in the package's `tests/`: an Ember that changes it fails that test.

### A refresh sends the change twice

A change to a key with `refreshModel: true` on the route refreshes it: `model`, `reset` (`isExiting: false`), `setup`, then `queryParamsDidChange` twice: Ember sends the change again while refreshing. _Do:_ fetch in one place (`setup`, or `queryParamsDidChange` with `shouldRefresh`), not both, or guard against a repeated request (the [search example](/examples/search) keeps only the last answer).

### A refresh whose model didn't change doesn't set the controller up again

Same object (or `undefined`) from `model` both times: no `reset` / `setup`, only the two `queryParamsDidChange`.

### A new model sends one more change, with the old value

`/detail/1?tab=files` → `/detail/2`: `model`, `reset` (`isExiting: false`), `setup`, then `queryParamsDidChange` with `changed: { tab: 'files' }`, the value it had.

### A key going back to its default holds the value it had

In `queryParamsDidChange`, `changed` has the old value for a key reset to its default. _Do:_ read current values from `event.queryParams`; use `changed` for _which_ keys changed.

### One `replace: false` makes the whole update a push

Changes made together are one transition: if one of them doesn't replace, it's a push.

### Nested routes hear every change

Every parachute controller in the route hierarchy gets `queryParamsDidChange` for any change; `changed` is empty unless the key is its own. _Do:_ check `changed` before reacting.

### Coming back sends the change from the last values

Re-entering a route whose controller was set up before, with other values: `setup`, then a `queryParamsDidChange` from its last values.

### Links take names in the address; `urlFor` runs no serializer

`transitionTo` asserts on a property name (_please update to q_); `router.urlFor` writes values as they are (`tags[]=a`). _Do:_ `forLink()` for links and transitions, `serialize()` for `urlFor` ([Links & deep links](/guides/links-and-deep-links)).

### An object without a serializer is `[object Object]`

Ember writes values with `` `${value}` `` by default, and always for a split route that hasn't loaded. _Do:_ give objects `json()`, lists `list()` or `json()`.

### Sticky values come back only by name

An address (`visit`, a bookmark) means the defaults; a transition by route name restores the kept values ([Sticky values](/guides/sticky-values)).

### A second set in a subclass doesn't merge

```ts
const Base = baseQueryParams.mixInto(Controller);
const Child = otherQueryParams.mixInto(Base); // or Base.extend(other.Mixin)
```

Ember concatenates both sets' query params, so every key still binds to the address, but parachute only knows the subclass's set: the base set's keys drop out of `allQueryParams`, `resetQueryParams`, the events and the serializers. _Do:_ `baseQueryParams.extend({...})`, or `@queryParam` fields, which merge.

### State compares as JSON

`queryParamsState[key].changed` (and `event.changes`, and leaving defaults out in `serialize`) compare as JSON: a new equal array isn't a change; the same object with keys in another order is.
