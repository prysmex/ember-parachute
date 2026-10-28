import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import {
  currentRouteName,
  currentURL,
  settled,
  visit,
} from '@ember/test-helpers';
import { module, skip, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { dependencySatisfies, macroCondition } from '@embroider/macros';
import EmbroiderRouter from '@embroider/router';

import QueryParams, { type ParachuteEvent } from '#src/index.ts';
import { json } from '#src/adapters.ts';

import { deferred, register, setupApp, snapshot } from '../helpers/index.ts';

import type Owner from '@ember/owner';
import type RouterService from '@ember/routing/router-service';

// Split routes (@embroider/router): a route, its controller and its query
// param definitions arrive with a bundle loaded on the first transition
// into it. Until then Ember knows nothing of its query params -- the case
// of a deep link on a cold start (a push notification, a link in an email).

const INTENT = { action: 'open', payload: { to: 'report', id: 42 } };

const intentsQueryParams = new QueryParams({
  intent: { defaultValue: {} as Record<string, unknown>, ...json({}) },
  // without a serializer of its own
  raw: { defaultValue: null as unknown },
  tab: { defaultValue: 'info' },
});

let log: unknown[] = [];

class IntentsController extends intentsQueryParams.mixInto(Controller) {
  setup(event: ParachuteEvent) {
    log.push(['setup', snapshot(event.queryParams)]);
  }
}

class IntentsRoute extends Route {
  model(params: Record<string, unknown>) {
    log.push(['model', snapshot(params)]);

    return {};
  }
}

// Ember < 7 fails a transition that supersedes one into a split route still
// loading (router_js reads the unloaded route's inaccessibleByURL), with or
// without ember-parachute
const onEmber7 = macroCondition(dependencySatisfies('ember-source', '>=7.0.0'))
  ? test
  : skip;

module('Acceptance | split routes (@embroider/router)', function (hooks) {
  setupApplicationTest(hooks);

  let gate: { promise: Promise<void>; resolve: () => void };
  let loads: number;
  let router: RouterService;

  hooks.beforeEach(function () {
    log = [];
    loads = 0;
    gate = deferred();

    const owner = this.owner as Owner;
    // the bundle, as Embroider emits one: loading it is what makes its
    // modules resolvable
    const bundle = {
      names: ['auth.intents'],
      load: async () => {
        loads++;
        log.push('load');
        await gate.promise;
        register(owner, 'route:auth.intents', IntentsRoute);
        register(owner, 'controller:auth.intents', IntentsController);
        log.push('loaded');

        return { default: {} };
      },
    };

    class SplitRouter extends EmbroiderRouter {
      lazyRoute(name: string) {
        return bundle.names.includes(name) ? bundle : undefined;
      }
    }

    setupApp(
      owner,
      function () {
        this.route('auth', function () {
          this.route('intents');
          this.route('home');
        });
      },
      SplitRouter,
    );

    register(
      owner,
      'route:auth',
      class extends Route {
        model() {
          log.push('auth:model');
        }
      },
    );
    // what @embroider/router needs to add a bundle's modules
    (owner as any).unregister('resolver:current');
    owner.register(
      'resolver:current',
      { addModules() {} },
      {
        instantiate: false,
      },
    );
    router = owner.lookup('service:router') as RouterService;
  });

  test('a deep link into the unloaded route: the values, typed, once it loads', async function (assert) {
    const address = `/auth/intents?intent=${encodeURIComponent(JSON.stringify(INTENT))}&tab=files`;
    const visiting = visit(address);

    await Promise.resolve();
    gate.resolve();
    await visiting;

    assert.deepEqual(snapshot({ url: currentURL(), log, loads }), {
      url: address,
      log: [
        'load',
        // the parent waits for the bundle: its query params are known
        // before the first model hook
        'loaded',
        'auth:model',
        ['model', { intent: INTENT, raw: null, tab: 'files' }],
        ['setup', { intent: INTENT, raw: null, tab: 'files' }],
      ],
      loads: 1,
    });
  });

  test('a transition into the unloaded route with forLink(): the object intact', async function (assert) {
    await visit('/auth/home');
    log = [];

    const transition = router.transitionTo('auth.intents', {
      queryParams: intentsQueryParams.forLink({ intent: INTENT }),
    });

    gate.resolve();
    await transition;
    await settled();

    assert.deepEqual(
      snapshot({
        url: currentURL(),
        intent: (this.owner.lookup('controller:auth.intents') as any).intent,
      }),
      {
        url: `/auth/intents?intent=${encodeURIComponent(JSON.stringify(INTENT))}`,
        intent: INTENT,
      },
    );
  });

  test('without a serializer: "[object Object]", and the definition reads its fallback', async function (assert) {
    // QUIRK (Ember's own, through @embroider/router): the route hasn't
    // loaded, so Ember writes the value with `${value}`
    await visit('/auth/home');

    const transition = router.transitionTo('auth.intents', {
      queryParams: { intent: INTENT, raw: { a: 1 } },
    });

    gate.resolve();
    await transition;
    await settled();

    const controller: any = this.owner.lookup('controller:auth.intents');

    assert.deepEqual(
      snapshot({
        url: currentURL(),
        intent: controller.intent,
        raw: controller.raw,
      }),
      {
        // json() can't read it: its fallback, the default, so out of the
        // address
        url: '/auth/intents?raw=%5Bobject%20Object%5D',
        intent: {},
        raw: '[object Object]',
      },
    );
  });

  onEmber7(
    'two transitions while the bundle loads: one load, the last one wins',
    async function (assert) {
      await visit('/auth/home');

      const first = router.transitionTo('auth.intents', {
        queryParams: intentsQueryParams.forLink({ tab: 'first' }),
      });

      // superseded by the next one: aborted
      first.catch(() => {});

      const last = router.transitionTo('auth.intents', {
        queryParams: intentsQueryParams.forLink({ tab: 'second' }),
      });

      gate.resolve();
      await last;
      await settled();

      assert.deepEqual(
        { url: currentURL(), loads, route: currentRouteName() },
        { url: '/auth/intents?tab=second', loads: 1, route: 'auth.intents' },
      );
    },
  );

  test('once loaded, links go through serialize as for any route', async function (assert) {
    gate.resolve();
    await visit('/auth/intents');
    await visit('/auth/home');

    assert.deepEqual(
      {
        typed: router.urlFor('auth.intents', {
          queryParams: intentsQueryParams.serialize({ intent: INTENT }),
        }),
      },
      {
        typed: `/auth/intents?intent=${encodeURIComponent(JSON.stringify(INTENT))}`,
      },
    );
  });
});
