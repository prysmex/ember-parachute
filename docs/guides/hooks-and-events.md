---
order: 4
---

# Hooks and events

Once [installed](/guides/getting-started), every route calls three hooks on its controller, when the controller is set up with ember-parachute. Each gets a `ParachuteEvent`.

```ts
class PostsController extends queryParams.mixInto(Controller) {
  setup(event, transition) {}
  queryParamsDidChange(event) {}
  reset(event, isExiting) {}
}
```

Live, with every event logged: the [examples](/examples).

## The event

| Field           |                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `routeName`     | The route that called the hook.                                                                                         |
| `queryParams`   | Every query param's current value, by property name.                                                                    |
| `changes`       | Every query param that differs from its default now. Compared as JSON, so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` differ. |
| `changed`       | What this change changed, by property name, deserialized.                                                               |
| `shouldRefresh` | A changed key has `refresh: true`.                                                                                      |

## `setup(event, transition)`

The route set the controller up: on entering the route, and on moving to another model of it. `changed` is `changes` (everything that differs from its default), `shouldRefresh` is always `true`, and the second argument is the transition.

Visiting `/detail/1?tab=files&open=true&tags=%5B%22a%22%5D&loud=HEY`:

```js
{
  routeName: 'detail',
  changed: { tab: 'files', open: true, tags: ['a'], shout: 'hey' },
  changes: { tab: 'files', open: true, tags: ['a'], shout: 'hey' },
  queryParams: { tab: 'files', open: true, tags: ['a'], shout: 'hey' },
  shouldRefresh: true,
}
```

(`shout` is `as: 'loud'` with a `deserialize` that lowercases.)

## `queryParamsDidChange(event)`

A query param changed while the controller was set up. It runs after render, once per change, however many query params changed together. `changed` holds the keys that changed, typed as the controller reads them: through `deserialize`, or Ember's own rules by the type of the default (`{ page: 2 }`, not `{ page: '2' }`).

Two changes made together are one event:

```js
set(controller, 'page', 2);
set(controller, 'search', 'Valve');
// → changed: { page: 2, search: 'Valve' }, shouldRefresh: true (page refreshes)
```

A key going back to its default is in `changed` too, with **the value it had**, not the default: after `resetQueryParams()` from `page: 2, search: 'Valve'`, `changed` is `{ page: 2, search: 'Valve', ... }` and `changes` is `{}`.

## `reset(event, isExiting)`

The route is being left (`isExiting: true`), or is moving to another model (`isExiting: false`). `shouldRefresh` is always `false`, `changed` is `{}`. The usual use: forget the values when leaving ([Sticky values](/guides/sticky-values)).

```ts
reset(_event, isExiting) {
  if (isExiting) this.resetQueryParams();
}
```

## In what order

These are pinned by the test suite, as Ember runs them.

**Entering** `/list`: the route's `model`, then `setup`.

**A change** (no `refreshModel` on the route): `queryParamsDidChange`, after render.

**A change to a key the route has `refreshModel: true` for**: the route refreshes. In order: `model`, `reset` (`isExiting: false`), `setup` (its `changed` is every non-default value), then `queryParamsDidChange` **twice** (Ember sends the change again while refreshing). A refresh whose model doesn't change (the same object, or `undefined` both times) doesn't set the controller up again: just the two `queryParamsDidChange`.

**A new model on the same route** (`/detail/1?tab=files` → `/detail/2`): `model`, `reset` (`isExiting: false`), `setup` with the new model's values, then one more `queryParamsDidChange` whose `changed` is the **old** value (`{ tab: 'files' }`).

**Leaving**: `reset` with `isExiting: true`.

**Coming back** to a route whose controller was set up before, with different values: `setup`, then a `queryParamsDidChange` with the change from its last values.

**Nested routes**: every parachute controller in the route hierarchy gets `queryParamsDidChange` for any change. `changed` is empty unless the key is its own:

```js
// /parent/child?p=b&c=y, then the child's c changes to z
['didChange', 'child',  { changed: { c: 'z' }, ... }]
['didChange', 'parent', { changed: {},          ... }]
```

## Listening from elsewhere: `addParachuteListener`

The hooks are methods on the controller. Anything else (a service, a test) can listen too:

```ts
import { addParachuteListener } from 'prysmex-ember-parachute';

const stop = addParachuteListener(
  controller,
  'queryParamsDidChange',
  (event) => {
    analytics.track('filters', event.changed);
  },
);

stop(); // no more
```

Listeners run after the controller's own hook, with the same arguments (`setup`'s transition, `reset`'s `isExiting`). The [examples](/examples)' event logs are fed this way.

### Ember's events, as 1.x sent them

ember-parachute 1.x also sent each hook as an Ember event, for `addListener` from `@ember/object/events`. Ember 7.4 deprecates that module (to be removed in Ember 8), so 2.0 doesn't, unless you pass it Ember's `sendEvent`:

```ts
import { sendEvent } from '@ember/object/events';

installParachute({ sendEvent }); // deprecated: prefer addParachuteListener
```
