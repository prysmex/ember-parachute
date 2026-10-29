import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import QueryParams from '#src/index.ts';

import { register, routerWarnings, setupApp } from '../helpers/index.ts';

// When Ember's router stops doing what ember-parachute needs, it says so
// (a warning, once, in development) instead of silently doing nothing. Each
// test breaks one thing by hand; every other test of the suite fails on any
// of these warnings, so a new Ember that breaks one fails the CI.

const queryParams = new QueryParams({
  search: { as: 'q', defaultValue: '' },
  page: { defaultValue: 1 },
});

class ListController extends queryParams.mixInto(Controller) {}

// what the warnings say, not the whole message
const warned = () => {
  const what = routerWarnings.map((message) =>
    message
      .replace("[ember-parachute] Ember's router changed: ", '')
      .replace(/\. Please report it.*$/, ''),
  );

  // expected: the test passes
  routerWarnings.length = 0;

  return what;
};

module('Acceptance | router contract warnings', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    setupApp(this.owner, function () {
      this.route('list');
    });
    register(this.owner, 'controller:list', ListController);
  });

  test('a router doing what parachute needs: no warning', async function (assert) {
    await visit('/list?q=pumps&page=2');
    (this.owner.lookup('controller:list') as ListController).set('page', 3);
    await visit('/list');

    assert.deepEqual(routerWarnings, []);
  });

  test('transition.routeInfos without routePromise or managementPromise', async function (assert) {
    await visit('/list');

    const route = this.owner.lookup('route:list') as any;

    // (Ember's own deserialize then fails on the hand-made transition)
    const deserialize = (transition: object) => {
      try {
        route.deserialize({}, transition);
      } catch {
        // not a real transition
      }
    };

    deserialize({ routeInfos: [{ name: 'list', isResolved: true }] });
    // once
    deserialize({ routeInfos: [{ name: 'list' }] });

    assert.deepEqual(warned(), [
      "transition.routeInfos have neither routePromise nor managementPromise, so a route's deserialize doesn't wait for split routes still loading (a parent's paramsFor them is {} on a deep link)",
    ]);
  });

  test('serializeQueryParam / deserializeQueryParam given the property name', async function (assert) {
    await visit('/list');

    const route = this.owner.lookup('route:list') as any;

    // by the name in the address: as Ember does
    route.serializeQueryParam('pumps', 'q', 'string');
    route.deserializeQueryParam('pumps', 'q', 'string');
    // `page` is its own name in the address
    route.serializeQueryParam(2, 'page', 'number');

    assert.deepEqual(warned(), [], 'the name in the address: no warning');

    route.serializeQueryParam('pumps', 'search', 'string');

    assert.deepEqual(warned(), [
      "a route's serializeQueryParam / deserializeQueryParam get the property name, not the name in the address, so query params with `as` skip their serialize / deserialize",
    ]);
  });

  test("Route's queryParamsDidChange action without what changed", async function (assert) {
    await visit('/list');

    const route = this.owner.lookup('route:list') as any;

    try {
      route.actions.queryParamsDidChange.call(route, undefined, {}, undefined);
    } catch {
      // Ember's own action, on what it no longer gets
    }

    assert.deepEqual(warned(), [
      "Route's queryParamsDidChange action no longer gets what changed first, so the controller's queryParamsDidChange gets no changes",
    ]);
  });

  test('a route without a queryParamsDidChange action', async function (assert) {
    register(
      this.owner,
      'route:list',
      class extends Route {
        actions = {};
      },
    );

    await visit('/list');

    assert.deepEqual(warned(), [
      "a route has no queryParamsDidChange action, so the controller's queryParamsDidChange is never called",
    ]);
  });

  test('a route without an owner', function (assert) {
    // a link to a route not entered yet: its controller from the owner
    const route = { routeName: 'list' };

    try {
      (Route.prototype as any).serializeQueryParam.call(
        route,
        'x',
        'q',
        'string',
      );
    } catch {
      // Ember's own serializeQueryParam, on something that isn't a route
    }

    assert.deepEqual(warned(), [
      "a route has no owner, so a link to a route not entered yet doesn't run its query params' serialize",
    ]);
  });
});
