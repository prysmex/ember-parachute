---
order: 11
---

# With ember-rison-qs

[ember-rison-qs](https://github.com/betocantu93/ember-rison-qs) puts every query param in one readable `?qs=(...)`, typed: numbers stay numbers, lists stay lists. ember-parachute works on top of it, with one option.

## Set up

```ts
// app/router.ts
import EmberRouter from '@embroider/router';
import { useRisonQueryParams } from 'ember-rison-qs';

export default class Router extends EmberRouter {
  setupRouter() {
    const didSetUp = super.setupRouter();

    if (didSetUp) {
      useRisonQueryParams(this);
    }

    return didSetUp;
  }
}
```

```ts
// app/initializers/ember-parachute.ts
import { installParachute } from 'ember-parachute';
import { readValue } from 'ember-rison-qs';

export function initialize() {
  installParachute({ readValue });
}

export default { initialize };
```

## What `readValue` is for

The router keeps query params in a shape of its own and hands those to Ember's `queryParamsDidChange`, which parachute builds its event's `changed` from. `readValue` turns them back into values. Without it, `setup`, the controller and `event.queryParams` are right, but `queryParamsDidChange`'s `changed` holds the router's own values.

## Values as they are

Rison keeps values typed, so the definitions don't need to turn them into text. An app's convention can say it once, with serializers that return values as they are:

```ts
import { queryParamsWithDefaults } from 'ember-parachute';
import { integer } from 'ember-parachute/adapters';

const identity = (value: unknown) => value;

export const appQueryParams = queryParamsWithDefaults({
  refresh: true,
  replace: true,
  scope: 'controller',
  serialize: identity,
  deserialize: identity,
});

const listQueryParams = appQueryParams(
  { page: { defaultValue: 1, ...integer(1) } },
  {
    status: { defaultValue: 'open' },
    filters: { defaultValue: { status: ['open'] } },
    ids: { defaultValue: [] as number[] },
  },
);
```

Then `/list?qs=(filters:(status:!(closed)),ids:!(1,2),page:3,status:'in review')` gives the controller, `model(params)` and `setup` `{ filters: { status: ['closed'] }, ids: [1, 2], page: 3, status: 'in review' }`, and changes are written as rison. A plain `?page=2` still works, through `integer()`.

Adapters still help: `integer()` reads a typed `3` and a plain `'3'` alike.

Without rison, identity serializers mean the controller gets the address's text: `?project.id=7` is `'7'`, not `[7]`.
