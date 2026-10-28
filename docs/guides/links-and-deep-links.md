---
order: 7
---

# Links & deep links

A query param's definition knows its name in the address and how its value is written. Ember, for its part, builds links in two different ways. This page is which to use where. Live: the [deep-link builder](/examples/deep-links).

## Ember takes query params by their name in the address

In `<LinkTo @query>`, `transitionTo`, `replaceWith` and `urlFor`, a query param is named as the address names it, `as`, **not** by its controller property:

```ts
const queryParams = new QueryParams({ search: { as: 'q', defaultValue: '' } });

router.transitionTo('list', { queryParams: { q: 'pumps' } }); // ✓
router.transitionTo('list', { queryParams: { search: 'pumps' } }); // ✗
```

The second fails, in development, with Ember's own assertion: _You passed the `search` query parameter during a transition into list, please update to q._ With `urlFor`, a property name is written as it is (`?search=pumps`).

## The matrix

|                                                  | names          | values                                                  | use                                                          |
| ------------------------------------------------ | -------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `<LinkTo @query>`, `transitionTo`, `replaceWith` | in the address | typed: Ember runs the route's serializer                | `queryParams.forLink(values)`                                |
| `router.urlFor`                                  | in the address | as the address holds them: **Ember runs no serializer** | `queryParams.serialize(values)`                              |
| an address read back                             | in the address | as the address holds them                               | `queryParams.deserialize(router.recognize(url).queryParams)` |

### `forLink(values)`: for links and transitions

Names in the address, each value through its definition's own `serialize`, the rest as they are (Ember writes those):

```ts
queryParams.forLink({
  search: 'pumps',
  page: 2,
  tags: ['a', 'b'],
  filters: { status: 'open' },
  ids: [7],
});
// { q: 'PUMPS', page: 2, tags: 'a,b', filters: '{"status":"open"}', ids: [7] }
```

```hbs
<LinkTo @route='list' @query={{this.forLink}}>Pumps</LinkTo>
```

It keeps values equal to their default (a link can put a query param back to its default); `{ keepDefaults: false }` leaves them out.

Ember runs `serialize` again on what `forLink` already serialized, once the route has loaded: that's why serializers must take their own output back (the [adapters](/guides/adapters) do). With them, the link is the same whether the route has loaded or not:

```
<LinkTo @query={{hash q="pumps" page=2 tags=tags}}> → /list?ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb
<LinkTo @query={{forLink}}>                         → /list?ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb
```

### `serialize(values)`: for `urlFor` and addresses you write

`router.urlFor` writes the query params it is given **as they are**, without any serializer, even for the route you're on:

```js
router.urlFor('list', { queryParams: { q: 'pumps', tags: ['a'] } });
// '/list?q=pumps&tags[]=a'   ← no serializer ran
router.urlFor('list', { queryParams: queryParams.serialize(values) });
// '/list?filters=%7B%22status%22%3A%22open%22%7D&ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb'
```

`serialize` gives each value as the address holds it, by name in the address, through the definition's `serialize` or as Ember would write it (lists as JSON). Values equal to their default are left out, as Ember does; `{ keepDefaults: true }` keeps them. Use it for `urlFor`, a link in an email, a push notification's payload.

Don't hand `serialize`'s output to `transitionTo` or `<LinkTo>`: for a query param without a serializer of its own, Ember would serialize its JSON a second time.

### `deserialize(params)`: an address read back

Every value, from what an address holds (by name in the address, or by property name), each through its definition's `deserialize` or as Ember would read it. What the address doesn't mention is its default:

```ts
const { queryParams: params } = router.recognize(
  '/list?page=2&q=PUMPS&tags=a%2Cb',
);
// { page: '2', q: 'PUMPS', tags: 'a,b' }
queryParams.deserialize(params);
// { search: 'pumps', page: 2, tags: ['a', 'b'], filters: {}, ids: [], print: false }
```

No route, no controller: for a push notification on a cold start, a link in an email, deciding where to go before going.

`router.currentRoute.queryParams` and `recognize` give the address's text (`{ page: '3' }`), not the controller's values.

## Hand-edited addresses

With adapters, an address someone typed can't break the page:

```
/list?page=two&filters=%5Bobject%20Object%5D&q=Hi
→ { search: 'hi', page: 1, filters: {}, ... }  (each its fallback)
```

## Split routes and cold starts

With route splitting (`@embroider/router`), a route, its controller and its definitions come with a bundle that loads on the first transition into it. **Until then, Ember knows nothing of its query params**: it writes each value with `` `${value}` ``. An object becomes `[object Object]`.

So, for links into a route that may not have loaded (a tapped push notification on a cold start):

- use `forLink`: values with a serializer of their own reach the address serialized either way;
- give objects and lists a serializer (`json()`, `list()`): without one, the route reads `[object Object]`;
- and a reader with a fallback: `json({})` reads a stray `[object Object]` as `{}` (equal to the default, so it leaves the address).

```ts
router.transitionTo('auth.intents', {
  queryParams: intents.forLink({ intent }),
});
// the bundle loads; the address: /auth/intents?intent=%7B%22action%22%3A...
```

Visiting such an address directly works too: the transition waits for the bundle before the first `model` hook, so the parent routes' hooks and the controller see the values typed.

### No loading substate for loaded routes

ember-parachute's route hook waits for a transition's routes only while one of them is still loading, and on the router's own promises, which settle inside the run loop. A transition whose routes have all loaded stays synchronous: no `loading` route flashes. (A copy of 1.x that waited with native promises made every transition async, so a `loading` route showed on each one.)
