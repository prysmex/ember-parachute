import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { currentURL, settled, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import QueryParams, {
  uninstallParachute,
  installParachute,
} from '#src/index.ts';

import { register, setupApp, snapshot } from '../helpers/index.ts';

import type Owner from '@ember/owner';
import type RouterService from '@ember/routing/router-service';

// What ember-parachute needs Ember to keep doing, one test per thing,
// named after it: run on every Ember upgrade (and on Ember's betas, see
// .try.mjs). The route side runs here without parachute, on Ember alone,
// so a failure is Ember's change, not parachute's.

module('Acceptance | Ember contract', function (hooks) {
  setupApplicationTest(hooks);

  let seen: unknown[][] = [];
  let app: ReturnType<typeof setupApp>;

  hooks.beforeEach(function () {
    seen = [];
    app = setupApp(this.owner, function () {
      this.route('list');
      this.route('detail', { path: '/detail/:id' });
      this.route('other');
    });
  });

  // Ember alone, for each test that says so
  function withoutParachute(hooks: NestedHooks) {
    hooks.beforeEach(() => uninstallParachute());
    hooks.afterEach(() => installParachute());
  }

  module('Route.prototype, as installParachute patches it', function () {
    test('has setupController, resetController, deserialize, serializeQueryParam, deserializeQueryParam', function (assert) {
      const proto = Route.prototype as unknown as Record<string, unknown>;

      for (const name of [
        'setupController',
        'resetController',
        'deserialize',
        'serializeQueryParam',
        'deserializeQueryParam',
      ]) {
        assert.strictEqual(typeof proto[name], 'function', name);
      }
    });

    test('has actions.queryParamsDidChange, after Route.proto()', function (assert) {
      (Route as unknown as { proto(): object }).proto();

      const actions = (
        Route.prototype as unknown as { actions?: Record<string, unknown> }
      ).actions;

      assert.strictEqual(typeof actions?.queryParamsDidChange, 'function');
    });
  });

  module('on Ember alone', function (hooks) {
    withoutParachute(hooks);

    class ListController extends Controller {
      // (Ember's types don't know the object form)
      queryParams = [{ search: { as: 'q' } }, 'page', 'tags'] as never;
      search = '';
      page = 1;
      tags: string[] = [];
    }

    hooks.beforeEach(function () {
      register(this.owner, 'controller:list', ListController);
    });

    test('the queryParamsDidChange action: (changed, present, removed), by name in the address, serialized', async function (assert) {
      register(
        this.owner,
        'route:list',
        Route.extend({
          actions: {
            queryParamsDidChange(
              this: any,
              changed: unknown,
              present: unknown,
              removed: unknown,
            ) {
              seen.push(snapshot([changed, present, removed]));

              return this._super(...arguments);
            },
          },
        }),
      );

      await visit('/list?q=a&page=2');
      seen = [];

      const controller: any = this.owner.lookup('controller:list');

      controller.set('search', 'b');
      controller.set('tags', ['x']);
      await settled();
      controller.set('page', 1);
      await settled();

      assert.deepEqual(seen, [
        [{ q: 'b', tags: '["x"]' }, { q: 'b', page: '2', tags: '["x"]' }, {}],
        [{}, { q: 'b', tags: '["x"]' }, { page: '2' }],
      ]);
    });

    test('setupController(controller, model, transition) and resetController(controller, isExiting, transition)', async function (assert) {
      register(
        this.owner,
        'route:detail',
        class extends Route {
          model({ id }: { id: string }) {
            return { id };
          }

          setupController(
            controller: Controller,
            model: unknown,
            transition: any,
          ) {
            super.setupController(controller, model, transition);
            seen.push(['setup', snapshot(model), transition.to.name]);
          }

          resetController(
            controller: Controller,
            isExiting: boolean,
            transition: any,
          ) {
            super.resetController(controller, isExiting, transition);
            seen.push(['reset', isExiting, transition.to.name]);
          }
        },
      );

      await visit('/detail/1');
      await visit('/detail/2');
      await visit('/other');

      assert.deepEqual(seen, [
        ['setup', { id: '1' }, 'detail'],
        // a new model: model first, then reset with isExiting = false
        ['reset', false, 'detail'],
        ['setup', { id: '2' }, 'detail'],
        ['reset', true, 'other'],
      ]);
    });

    test("transition.routeInfos: isResolved, route, routePromise (deserialize's wait)", async function (assert) {
      register(
        this.owner,
        'route:detail',
        class extends Route {
          deserialize(params: Record<string, unknown>, transition: any) {
            seen.push(
              transition.routeInfos.map((routeInfo: any) => [
                routeInfo.name,
                typeof routeInfo.isResolved,
                typeof routeInfo.route,
                typeof routeInfo.routePromise?.then,
              ]),
            );

            return super.deserialize(params, transition);
          }
        },
      );

      await visit('/detail/1');

      assert.deepEqual(seen, [
        [
          ['application', 'boolean', 'object', 'function'],
          ['detail', 'boolean', 'object', 'function'],
        ],
      ]);
    });

    test("a controller's queryParams class field is read off the instance", async function (assert) {
      await visit('/list?q=hi');

      assert.strictEqual(
        (this.owner.lookup('controller:list') as any).search,
        'hi',
      );
    });

    test('serializeQueryParam / deserializeQueryParam: (value, urlKey, defaultValueType)', async function (assert) {
      register(
        this.owner,
        'route:list',
        class extends Route {
          serializeQueryParam(value: unknown, urlKey: string, type: string) {
            seen.push(['serialize', snapshot(value), urlKey, type]);

            return super.serializeQueryParam(value, urlKey, type);
          }

          deserializeQueryParam(value: unknown, urlKey: string, type: string) {
            seen.push(['deserialize', snapshot(value), urlKey, type]);

            return super.deserializeQueryParam(value, urlKey, type);
          }
        },
      );

      await visit('/list?q=a&tags=%5B%22x%22%5D');
      seen = [];
      (this.owner.lookup('controller:list') as any).set('page', 3);
      await settled();

      assert.deepEqual(
        seen.filter(
          ([kind, , urlKey]) => kind === 'serialize' && urlKey === 'page',
        ),
        [['serialize', 3, 'page', 'number']],
      );
    });

    test("a route's queryParams[key].replace is read when the value changes", async function (assert) {
      const route = class extends Route {
        queryParams: Record<string, object> = {};
      };

      register(this.owner, 'route:list', route);

      await visit('/list');

      // as installParachute does, once the route is set up
      (this.owner.lookup('route:list') as any).set('queryParams', {
        page: { replace: true },
      });
      app.clearHistory();
      (this.owner.lookup('controller:list') as any).set('page', 2);
      await settled();

      assert.deepEqual(app.history, [['replace', '/list?page=2']]);
    });

    test("owner.factoryFor('controller:x').class: a class with a prototype", function (assert) {
      const factory = (this.owner as Owner).factoryFor(
        'controller:list',
      ) as any;

      assert.strictEqual(typeof factory.class.prototype, 'object');
    });
  });

  module('with parachute', function () {
    test('tracked values are query params: an assignment updates the address', async function (assert) {
      const { tracked } = await import('@glimmer/tracking');

      class Tracked extends Controller {
        queryParams = ['page'];
        @tracked page = 1;
      }

      register(this.owner, 'controller:list', Tracked);
      await visit('/list');

      (this.owner.lookup('controller:list') as Tracked).page = 2;
      await settled();

      assert.strictEqual(currentURL(), '/list?page=2');
    });

    test('the router service: transitionTo / replaceWith / urlFor / recognize / isActive exist', function (assert) {
      const router = this.owner.lookup('service:router') as RouterService;

      for (const name of [
        'transitionTo',
        'replaceWith',
        'urlFor',
        'recognize',
        'isActive',
      ]) {
        assert.strictEqual(typeof (router as any)[name], 'function', name);
      }
    });

    test('a native controller class made by mixInto is a Controller', function (assert) {
      const Klass = new QueryParams({ a: { defaultValue: 1 } }).mixInto(
        Controller,
      );

      register(this.owner, 'controller:list', Klass);

      assert.true(this.owner.lookup('controller:list') instanceof Controller);
    });
  });
});
