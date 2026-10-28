---
order: 8
---

# Sticky values

Ember keeps a route's query param values when you leave it, and puts them back when you come back. Live: the [lifecycle example](/examples/lifecycle/1).

## Per model, or per controller

By default, values are kept **per model**: `/projects/1?tab=files` and `/projects/2?tab=tasks` each keep their own `tab`.

```ts
const queryParams = new QueryParams({
  tab: { defaultValue: 'overview' }, // one per project
  view: { defaultValue: 'cards', scope: 'controller' }, // one for all
});
```

With `scope: 'controller'`, there is one value whatever the model: go from `/projects/1?view=table` to project 2 and the address is `/projects/2?view=table`.

Moving between models of the same route calls `reset` with `isExiting: false`, then `setup` with the new model's values ([Hooks and events](/guides/hooks-and-events)).

## Only transitions by name restore them

Ember restores sticky values for a transition **by route name** (`<LinkTo @route>`, `router.transitionTo('projects', 1)`). An address says everything it has: visiting `/projects/1` (typed, a bookmark, `visit()` in a test) means "the defaults".

## Forgetting them on exit

If coming back should start fresh, reset the values when the route is left:

```ts
reset(_event: ParachuteEvent, isExiting: boolean) {
  if (isExiting) {
    this.resetQueryParams();
  }
}
```

`isExiting` is `false` when only the model changes: then the values stay, model-scoped ones swapping per model as above.
