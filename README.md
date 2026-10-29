# prysmex-ember-parachute

ember-parachute 2, published as `prysmex-ember-parachute`.


Query params for Ember, declared once: each one's default, its name in the address, how it is written and read, and whether a change refreshes data or replaces the history entry. Then `setup`, `queryParamsDidChange` and `reset` hooks on the controller, with what changed, typed. Links and deep links built from the same definitions.

**[Guides and live examples](https://ember-parachute.vercel.app)** · [Getting started](https://ember-parachute.vercel.app/guides/getting-started) · [Upgrading from 1.x](https://ember-parachute.vercel.app/guides/upgrading)

## Why

Ember's query params are spread over the controller (`queryParams`, the values), the route (`refreshModel`, `replace`, `serializeQueryParam`) and whatever reacts to a change (observers, `resetController`). ember-parachute puts a query param's whole definition in one place, and tells the controller when its query params are set up, change, or are left behind, with the values already read.

## Install

```sh
pnpm add prysmex-ember-parachute
```

Then install the route hooks, once, before the first route is made:

```js
// app/initializers/ember-parachute.js
export { default } from 'prysmex-ember-parachute/initializer';
```

(or call `installParachute()` from `prysmex-ember-parachute` yourself: in an initializer, or `app.ts`).

## Quick start

```ts
import Controller from '@ember/controller';
import QueryParams, { type ParachuteEvent, type QueryParamValues } from 'prysmex-ember-parachute';
import { integer, list } from 'prysmex-ember-parachute/adapters';

export const postsQueryParams = new QueryParams({
  search: { as: 'q', defaultValue: '', refresh: true, replace: true },
  page: { defaultValue: 1, refresh: true, ...integer(1) },
  tags: { defaultValue: [] as string[], ...list() },
});

type Values = QueryParamValues<typeof postsQueryParams>;

export default class PostsController extends postsQueryParams.mixInto(Controller) {
  setup({ queryParams }: ParachuteEvent<Values>) {
    this.fetch(queryParams);
  }

  queryParamsDidChange({ shouldRefresh, queryParams }: ParachuteEvent<Values>) {
    if (shouldRefresh) this.fetch(queryParams);
  }

  reset(_event: ParachuteEvent<Values>, isExiting: boolean) {
    if (isExiting) this.resetQueryParams();
  }

  fetch(values: Values) {
    // ...
  }
}
```

Or on the fields, tracked, where a plain assignment is a query param change:

```ts
import { queryParam, withParachute } from 'prysmex-ember-parachute';

@withParachute
export default class PostsController extends Controller {
  @queryParam({ as: 'q', refresh: true, replace: true }) search = '';
  @queryParam({ ...integer(1), refresh: true }) page = 1;
  @queryParam({ ...list() }) tags: string[] = [];

  next = () => this.page++;
}
```

Links and deep links, from the same definitions:

```ts
// <LinkTo @route="posts" @query={{forLink}}>, transitionTo, replaceWith
const forLink = postsQueryParams.forLink({ search: 'ember', page: 2 }); // { q: 'ember', page: 2 }

// router.urlFor (it runs no serializer), an email, a push notification
router.urlFor('posts', { queryParams: postsQueryParams.serialize(values) });

// an address read without its route
postsQueryParams.deserialize(router.recognize(url).queryParams);
```

## Features

- **One definition per query param**: `defaultValue`, `as`, `refresh`, `replace`, `scope`, `serialize` / `deserialize`; sets that merge and `extend()`, and `queryParamsWithDefaults()` for an app's conventions.
- **Hooks with typed events**: `setup`, `queryParamsDidChange`, `reset`, with `changed`, `changes`, `queryParams`, `shouldRefresh`; `addParachuteListener` for anyone else.
- **Controller API**: `allQueryParams`, `queryParamsState`, `resetQueryParams()`, `setDefaultQueryParamValue()`.
- **Decorators**: `@queryParam` fields (tracked) with `@withParachute`; subclasses merge.
- **Adapters**: `integer`, `number`, `boolean`, `json`, `list`, `oneOf`, `date`, each with a fallback for hand-edited addresses, each taking its own output back.
- **Links & deep links**: `forLink()`, `serialize()`, `deserialize()`; links into split routes (`@embroider/router`) that haven't loaded yet.
- **Test support**: `RecordingLocation` (push or replace?), `recordParachuteEvents()`.
- **TypeScript**: values inferred from each `defaultValue`, through `mixInto`, the events and the link helpers.
- **Ready for Ember 8**: native classes, no mixins, no `reopen`, no `@ember/object/events` (deprecated in Ember 7.4), no `@ember/utils` (7.5). The test suite runs with every Ember deprecation enabled, and an Ember contract suite names what parachute needs Ember to keep doing.
- **Works with [ember-rison-qs](https://github.com/betocantu93/ember-rison-qs)**: `installParachute({ readValue })`.

## Compatibility

- Ember 5.8 or later; tested on 5.8, 5.12, 6.4, 6.8, 6.12, 7.3, the latest (7.4) and the beta. The alpha (7.5) runs in CI too, as an early warning: its new route managers change `transition.routeInfos` (see [How it works](https://ember-parachute.vercel.app/guides/how-it-works#ready-for-ember-8))
- TypeScript 5.4 or later, for its types
- Node 20 or later
- Embroider (Vite) and classic builds: a v2 addon, with no app re-exports or build hooks

## Upgrading from 1.x

`Controller.extend(qp.Mixin)` becomes `qp.mixInto(Controller)`, the hooks are installed by your own initializer, and Ember events become `addParachuteListener`. The rest of the API is 1.x's. All of it, with what changed in behavior: [Upgrading from 1.x](https://ember-parachute.vercel.app/guides/upgrading).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

ember-parachute was created by [Offir Golan](https://github.com/offirgolan) and [Lauren Tan](https://github.com/poteto). Version 2 by [Alberto Cantú Gómez](https://github.com/betocantu93), at [Prysmex](https://github.com/prysmex).

## License

MIT, see [LICENSE.md](LICENSE.md).
