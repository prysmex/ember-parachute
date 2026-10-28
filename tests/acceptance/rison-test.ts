import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { currentURL, settled, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import { readValue, useRisonQueryParams } from 'ember-rison-qs';

import {
  installParachute,
  queryParamsWithDefaults,
  type ParachuteEvent,
} from '#src/index.ts';
import { integer } from '#src/adapters.ts';

import { register, setupApp, snapshot } from '../helpers/index.ts';

import type RouterService from '@ember/routing/router-service';

// With ember-rison-qs: every query param in one `?qs=(...)`, typed. The
// router keeps values in a shape of its own, which installParachute's
// `readValue` turns back into values for the events. As Prysmex runs it.

class RisonRouter extends EmberRouter {
  setupRouter() {
    const didSetUp = super.setupRouter();

    if (didSetUp) {
      useRisonQueryParams(this);
    }

    return didSetUp;
  }
}

const identity = (value: unknown) => value;

// values as they are: rison keeps them typed
const appQueryParams = queryParamsWithDefaults({
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
    ids: { defaultValue: [] },
    limit: { defaultValue: null },
  },
);

let log: unknown[][] = [];

class ListController extends listQueryParams.mixInto(Controller) {
  setup(event: ParachuteEvent) {
    log.push(['setup', snapshot(event.changed)]);
  }

  queryParamsDidChange(event: ParachuteEvent) {
    log.push(['didChange', snapshot(event.changed), event.shouldRefresh]);
  }
}

class ListRoute extends Route {
  models = 0;
  queryParams = {
    page: { refreshModel: true },
    filters: { refreshModel: true },
  };

  model(params: Record<string, unknown>) {
    this.models++;
    log.push(['model', snapshot(params)]);

    return {};
  }
}

const ADDRESS =
  "/list?qs=(filters:(status:!(closed)),ids:!(1,2),limit:20,page:3,status:'in review')";

module('Acceptance | with ember-rison-qs', function (hooks) {
  setupApplicationTest(hooks);

  let router: RouterService;

  hooks.beforeEach(function () {
    log = [];
    installParachute({ readValue });
    setupApp(
      this.owner,
      function () {
        this.route('list');
        this.route('other');
      },
      RisonRouter,
    );
    register(this.owner, 'route:list', ListRoute);
    register(this.owner, 'controller:list', ListController);
    router = this.owner.lookup('service:router') as RouterService;
  });

  hooks.afterEach(function () {
    installParachute();
  });

  const list = (owner: any) => owner.lookup('controller:list');

  test('values reach the controller, setup and model(params) typed', async function (assert) {
    await visit(ADDRESS);

    const values = {
      filters: { status: ['closed'] },
      ids: [1, 2],
      limit: 20,
      page: 3,
      status: 'in review',
    };
    const controller = list(this.owner);

    assert.deepEqual(
      snapshot({
        controller: {
          filters: controller.filters,
          ids: controller.ids,
          limit: controller.limit,
          page: controller.page,
          status: controller.status,
        },
        log,
      }),
      {
        controller: values,
        log: [
          ['model', values],
          ['setup', values],
        ],
      },
    );
    assert.strictEqual(controller.page, 3, 'a number, not "3"');
  });

  test("queryParamsDidChange's event has the values typed (readValue)", async function (assert) {
    await visit(ADDRESS);
    log = [];

    const controller = list(this.owner);

    controller.set('ids', [3, 4]);
    controller.set('status', 'done');
    await settled();

    assert.deepEqual(log, [
      ['didChange', { ids: [3, 4], status: 'done' }, true],
    ]);
  });

  test('without readValue, the events get what the router keeps', async function (assert) {
    installParachute();
    await visit(ADDRESS);
    log = [];

    list(this.owner).set('ids', [3, 4]);
    await settled();

    const changed = log[0]?.[1] as Record<string, unknown>;

    assert.notDeepEqual(changed.ids, [3, 4], 'not the values');
  });

  test('changes are written as rison, through the definitions', async function (assert) {
    await visit('/list');

    const controller = list(this.owner);

    controller.set('page', 2);
    controller.set('ids', [7]);
    controller.set('filters', { status: ['closed'] });
    await settled();

    assert.strictEqual(
      currentURL(),
      '/list?qs=(filters:(status:!(closed)),ids:!(7),page:2)',
    );
  });

  test('values equal to their defaults leave the address', async function (assert) {
    await visit(ADDRESS);

    list(this.owner).setProperties({
      page: 1,
      limit: null,
      ids: [],
      status: 'open',
      filters: { status: ['open'] },
    });
    await settled();

    assert.strictEqual(currentURL(), '/list');
  });

  test('an equal value is no change: no model refresh', async function (assert) {
    await visit(ADDRESS);

    const route: any = this.owner.lookup('route:list');
    const models = route.models;

    await router.transitionTo({
      queryParams: { filters: { status: ['closed'] }, page: 3 },
    });

    assert.strictEqual(route.models, models);
  });

  test('a real change runs the refreshModel hook again', async function (assert) {
    await visit(ADDRESS);

    const route: any = this.owner.lookup('route:list');
    const models = route.models;

    await router.transitionTo({ queryParams: { page: 4 } });

    assert.strictEqual(route.models, models + 1);
    assert.strictEqual(list(this.owner).page, 4);
  });

  test('a plain ?page=2 goes through the integer adapter', async function (assert) {
    await visit('/list?page=2&status=closed');

    assert.strictEqual(list(this.owner).page, 2);
    assert.strictEqual(list(this.owner).status, 'closed');
  });

  test('leaving and coming back keeps the values, typed', async function (assert) {
    await visit(ADDRESS);
    await visit('/other');

    try {
      await router.transitionTo('list');
    } catch {
      // Ember < 7 aborts it for the one that puts the sticky values back
      await settled();
    }

    assert.deepEqual(
      snapshot({ page: list(this.owner).page, ids: list(this.owner).ids }),
      {
        page: 3,
        ids: [1, 2],
      },
    );
  });
});
