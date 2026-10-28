import Controller from '@ember/controller';
import { action } from '@ember/object';
import { addListener, sendEvent } from '@ember/object/events';
import Route from '@ember/routing/route';
import { currentURL, settled, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import QueryParams, {
  addParachuteListener,
  installParachute,
  isParachuteInstalled,
  uninstallParachute,
  type ParachuteEvent,
} from '#src/index.ts';
import { recordParachuteEvents } from '#src/test-support.ts';

import { register, setupApp, snapshot } from '../helpers/index.ts';

// installParachute: what it puts on Route, that it takes it all back, and
// the routes it reaches -- those defined before it ran included.

const queryParams = new QueryParams({ page: { defaultValue: 1 } });

class PageController extends queryParams.mixInto(Controller) {
  calls: string[] = [];

  setup(event: ParachuteEvent) {
    this.calls.push(`setup ${JSON.stringify(event.changed)}`);
  }

  queryParamsDidChange(event: ParachuteEvent) {
    this.calls.push(`didChange ${JSON.stringify(event.changed)}`);
  }

  reset(_event: ParachuteEvent, isExiting: boolean) {
    this.calls.push(`reset ${isExiting}`);
  }
}

// Defined (as an app's modules are) before installParachute runs: an
// @action gives the class `actions` of its own, copied from Route's then,
// without parachute's queryParamsDidChange
class RouteWithAction extends Route {
  @action
  somethingHappened() {}
}

module('Acceptance | installParachute', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    setupApp(this.owner, function () {
      this.route('page');
      this.route('other');
    });
    register(this.owner, 'controller:page', PageController);
  });

  const calls = (owner: any) =>
    owner.lookup('controller:page').calls as string[];

  test('a route class with its own actions, defined before installing', async function (assert) {
    register(this.owner, 'route:page', RouteWithAction);

    await visit('/page');
    (this.owner.lookup('controller:page') as any).set('page', 2);
    await settled();

    assert.deepEqual(calls(this.owner), ['setup {}', 'didChange {"page":2}']);
  });

  test('a route with an actions hash and its own queryParamsDidChange', async function (assert) {
    // the app's own action runs too, and Ember's (refreshModel) after it.
    // QUIRK (Ember's own): the refresh sends the change a second time; a
    // model that didn't change doesn't set the controller up again
    let models = 0;
    const seen: unknown[] = [];

    register(
      this.owner,
      'route:page',
      Route.extend({
        queryParams: { page: { refreshModel: true } },
        model() {
          models++;
        },
        actions: {
          queryParamsDidChange(this: any, changed: unknown) {
            seen.push(snapshot(changed));

            return this._super(...arguments);
          },
        },
      }),
    );

    await visit('/page');
    (this.owner.lookup('controller:page') as any).set('page', 3);
    await settled();

    assert.deepEqual(
      { models, seen, calls: calls(this.owner) },
      {
        models: 2,
        seen: [{ page: '3' }, { page: '3' }],
        calls: ['setup {}', 'didChange {"page":3}', 'didChange {"page":3}'],
      },
    );
  });

  test('uninstall puts Route back as it was; install again', async function (assert) {
    const installed = Route.prototype.setupController;

    uninstallParachute();

    const uninstalled = {
      flag: isParachuteInstalled(),
      sameHook: Route.prototype.setupController === installed,
    };

    await visit('/page');

    const without = [...calls(this.owner)];

    await visit('/other');
    installParachute();
    await visit('/page?page=4');

    assert.deepEqual(
      {
        uninstalled,
        without,
        reinstalled: isParachuteInstalled(),
        withIt: calls(this.owner),
        url: currentURL(),
      },
      {
        uninstalled: { flag: false, sameHook: false },
        without: [],
        reinstalled: true,
        // QUIRK (as 1.x): the controller was set up before, so the change
        // from its last values is sent too
        withIt: ['setup {"page":4}', 'didChange {"page":4}'],
        url: '/page?page=4',
      },
    );
  });

  test('installing twice installs once', async function (assert) {
    const hook = Route.prototype.setupController;

    installParachute();
    installParachute();

    await visit('/page');

    assert.deepEqual(
      {
        sameHook: Route.prototype.setupController === hook,
        calls: calls(this.owner),
      },
      { sameHook: true, calls: ['setup {}'] },
    );
  });

  test('a controller with @queryParam fields but no @withParachute', async function (assert) {
    const { queryParam } = await import('#src/index.ts');

    class Forgot extends Controller {
      @queryParam page = 1;
    }

    register(this.owner, 'controller:page', Forgot);

    await assert.rejects(
      visit('/page'),
      /The controller of 'page' has @queryParam fields but no @withParachute/,
    );
  });
});

module('Acceptance | listening to the hooks', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    setupApp(this.owner, function () {
      this.route('page');
      this.route('other');
    });
    register(this.owner, 'controller:page', PageController);
  });

  test('addParachuteListener: after the hook, until stopped', async function (assert) {
    const controller: any = this.owner.lookup('controller:page');
    const heard: string[] = [];
    const stops = [
      addParachuteListener(controller, 'setup', (event, transition: any) =>
        heard.push(
          `setup ${JSON.stringify(event.changed)} ${transition.to.name}`,
        ),
      ),
      addParachuteListener(controller, 'queryParamsDidChange', (event) =>
        heard.push(`didChange ${JSON.stringify(event.changed)}`),
      ),
      addParachuteListener(controller, 'reset', (_event, isExiting) =>
        heard.push(`reset ${isExiting}`),
      ),
    ];

    await visit('/page?page=2');
    controller.set('page', 3);
    await settled();
    await visit('/other');

    stops.forEach((stop) => stop());
    await visit('/page');

    assert.deepEqual(heard, [
      'setup {"page":2} page',
      'didChange {"page":3}',
      'reset true',
    ]);
    assert.deepEqual(controller.calls.slice(0, 2), [
      'setup {"page":2}',
      'didChange {"page":3}',
    ]);
  });

  test('recordParachuteEvents (test-support)', async function (assert) {
    const recorder = recordParachuteEvents(
      this.owner.lookup('controller:page') as object,
    );

    await visit('/page?page=2');
    await visit('/other');

    const hooksRun = recorder.hooks;
    const setup = snapshot(recorder.last('setup')?.queryParams);

    recorder.stop();
    await visit('/page');

    assert.deepEqual(
      {
        hooksRun,
        setup,
        after: recorder.hooks,
        extra: recorder.events[1]?.extra,
      },
      {
        hooksRun: ['setup', 'reset'],
        setup: { page: 2 },
        after: ['setup', 'reset'],
        extra: true,
      },
    );
  });

  test("sendEvent: Ember's events too, for addListener (1.x) [deprecated]", async function (assert) {
    installParachute({ sendEvent });

    const controller: any = this.owner.lookup('controller:page');
    const heard: string[] = [];

    addListener(controller, 'setup', (event: ParachuteEvent) =>
      heard.push(`setup ${JSON.stringify(event.changed)}`),
    );

    try {
      await visit('/page?page=5');
    } finally {
      installParachute();
    }

    await visit('/other');
    await visit('/page?page=6');

    assert.deepEqual(heard, ['setup {"page":5}']);
  });
});
