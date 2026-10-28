---
order: 9
---

# Testing

`installParachute()` runs in the app's initializer, so an application test (`setupApplicationTest`) has the hooks already. For a router of the test's own, see the package's own tests (`tests/helpers`): they register a `router:main` on a map of their own.

## `ember-parachute/test-support`

### `RecordingLocation`

A `location: 'none'` that keeps every address the router wrote, and how: `'push'` or `'replace'`. To assert `replace`:

```ts
import EmberRouter from '@ember/routing/router';
import { RecordingLocation } from 'ember-parachute/test-support';

class TestRouter extends EmberRouter {
  location = 'recording';
  rootURL = '/';
}

// in beforeEach
this.owner.register('location:recording', RecordingLocation);
this.owner.register('router:main', TestRouter);

// in a test
await visit('/posts');
controller.set('search', 'ember');
await settled();

assert.deepEqual(this.owner.lookup('router:main').location.history, [
  ['replace', '/posts?q=ember'],
]);
```

### `recordParachuteEvents(controller)`

Every hook a controller is called with, in order, until `stop()`:

```ts
import { recordParachuteEvents } from 'ember-parachute/test-support';

const recorder = recordParachuteEvents(this.owner.lookup('controller:posts'));

await visit('/posts?page=2');
await visit('/other');

assert.deepEqual(recorder.hooks, ['setup', 'reset']);
assert.deepEqual(recorder.last('setup')?.queryParams, { page: 2 });
assert.true(recorder.events[1].extra); // reset's isExiting

recorder.stop();
```

`events` holds `{ hook, event, extra }` (`extra` is `setup`'s transition, `reset`'s `isExiting`); `clear()` empties it.

## Tips

- `queryParamsDidChange` runs after render: `await settled()` after a change.
- Assert the address with `currentURL()`, and push or replace with `RecordingLocation`.
- `visit(url)` is an address: it never restores [sticky values](/guides/sticky-values). Use `router.transitionTo('route')` to test them.
- A test that turns the hooks off can call `uninstallParachute()`, which puts back the very functions it replaced, then `installParachute()` again.
- Pin behavior you rely on with snapshots of whole logs (as the package does): an Ember upgrade that changes it shows up as a diff, not a vague failure.
