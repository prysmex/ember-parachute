import Controller from '@ember/controller';
import { set } from '@ember/object';
import Route from '@ember/routing/route';
import { currentURL, settled, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import QueryParams, {
  addParachuteListener,
  queryParamsWithDefaults,
  withParachute,
  type ParachuteEvent,
} from '#src/index.ts';
import { integer } from '#src/adapters.ts';

import {
  deferred,
  outlet,
  register,
  setupApp,
  snapshot,
} from '../helpers/index.ts';

import type Owner from '@ember/owner';
import type Transition from '@ember/routing/transition';

// The route side, on a router of its own: the setup / reset /
// queryParamsDidChange hooks and their events, address (de)serialization
// through the definitions, the route's queryParams map, and how all of it
// behaves across transitions. Pinned whole: a change in what Ember does
// shows here as a diff of the log.

type Log = unknown[][];
let log: Log = [];

const eventShape = (event: ParachuteEvent) =>
  snapshot({
    routeName: event.routeName,
    changed: event.changed,
    changes: event.changes,
    queryParams: event.queryParams,
    shouldRefresh: event.shouldRefresh,
  });

// controller hooks, recorded in order
const logging = <B extends abstract new (...args: any[]) => object>(
  Base: B,
  name: string,
) => {
  abstract class Logging extends Base {
    setup(event: ParachuteEvent, transition: Transition) {
      log.push(['setup', name, eventShape(event), transition?.to?.name]);
    }

    reset(event: ParachuteEvent, isExiting: boolean) {
      log.push(['reset', name, eventShape(event), isExiting]);
    }

    queryParamsDidChange(event: ParachuteEvent) {
      log.push(['didChange', name, eventShape(event)]);
    }
  }

  return Logging;
};

const identity = (value: unknown) => value;

// an app's own conventions (refresh and replace, values as they are), as
// Prysmex declares them
const appQueryParams = queryParamsWithDefaults({
  refresh: true,
  replace: true,
  scope: 'controller',
  serialize: identity,
  deserialize: identity,
});

const listQueryParams = appQueryParams(
  { page: { defaultValue: 1, ...integer(1) } },
  { search: { defaultValue: '' } },
  { project: { as: 'project.id', defaultValue: [] } },
  { printMode: { defaultValue: false, replace: false } },
  { status: { defaultValue: 'open', refresh: false } },
);

// parachute's own defaults: no refresh, no replace, no (de)serializers
const detailQueryParams = new QueryParams({
  tab: { defaultValue: 'info', refresh: true },
  open: { defaultValue: false },
  tags: { defaultValue: [] },
  shout: {
    as: 'loud',
    defaultValue: '',
    serialize: (value: unknown) => String(value).toUpperCase(),
    deserialize: (value: unknown) => String(value).toLowerCase(),
  },
});

type Style = 'mixInto' | 'Mixin';

// A controller class with a definition set, in either style
function controllerWith(
  style: Style,
  queryParams: QueryParams<any>,
): typeof Controller {
  return (
    style === 'Mixin'
      ? Controller.extend(queryParams.Mixin)
      : queryParams.mixInto(Controller)
  ) as typeof Controller;
}

function fixtures(style: Style) {
  const withQP = (queryParams: QueryParams<any>) =>
    controllerWith(style, queryParams);

  class ListController extends logging(withQP(listQueryParams), 'list') {
    constructor(owner: Owner) {
      super(owner);
      addParachuteListener(this, 'setup', (event) => {
        log.push(['listener:setup', 'list', snapshot(event.changes)]);
      });
    }
  }

  class DetailController extends logging(withQP(detailQueryParams), 'detail') {}

  class ParentController extends logging(
    withQP(new QueryParams({ p: { defaultValue: 'a' } })),
    'parent',
  ) {}

  class ChildController extends logging(
    withQP(new QueryParams({ c: { defaultValue: 'x' } })),
    'child',
  ) {}

  @withParachute
  class BareBase extends Controller {}

  class BareController extends logging(BareBase, 'bare') {}

  class PlainController extends Controller {
    queryParams = ['plainQp'];
    plainQp = 'z';
  }

  class ListRoute extends Route {
    queryParams = { status: { refreshModel: true } };

    model(params: Record<string, unknown>) {
      log.push(['model', 'list', snapshot(params)]);

      return {};
    }
  }

  class DetailRoute extends Route {
    model({ id }: { id: string }) {
      log.push(['model', 'detail', id]);

      return { id };
    }
  }

  return {
    ListController,
    DetailController,
    ParentController,
    ChildController,
    BareController,
    PlainController,
    ListRoute,
    DetailRoute,
  };
}

for (const style of ['mixInto', 'Mixin'] as const) {
  const {
    ListController,
    DetailController,
    ParentController,
    ChildController,
    BareController,
    PlainController,
    ListRoute,
    DetailRoute,
  } = fixtures(style);

  module(`Acceptance | hooks (${style})`, function (hooks) {
    setupApplicationTest(hooks);

    let app: ReturnType<typeof setupApp>;

    hooks.beforeEach(function () {
      log = [];
      app = setupApp(this.owner, function () {
        this.route('list');
        this.route('detail', { path: '/detail/:id' });
        this.route('parent', function () {
          this.route('child');
        });
        this.route('bare');
        this.route('plain');
      });

      register(this.owner, 'template:parent', outlet);
      register(this.owner, 'controller:list', ListController);
      register(this.owner, 'route:list', ListRoute);
      register(this.owner, 'controller:detail', DetailController);
      register(this.owner, 'route:detail', DetailRoute);
      register(this.owner, 'controller:parent', ParentController);
      register(this.owner, 'controller:parent.child', ChildController);
      register(this.owner, 'controller:bare', BareController);
      register(this.owner, 'controller:plain', PlainController);
    });

    // what the location wrote since the last call, in the log
    function logHistory() {
      for (const [kind, url] of app.history) {
        log.push([kind, url]);
      }

      app.clearHistory();
    }

    const LIST_DEFAULTS = {
      page: 1,
      search: '',
      project: [],
      printMode: false,
      status: 'open',
    };

    test('entering with defaults: setup, its event and the route map', async function (assert) {
      await visit('/list');

      const route: any = this.owner.lookup('route:list');

      assert.deepEqual(
        snapshot({
          url: currentURL(),
          log,
          routeQueryParams: route.queryParams,
        }),
        {
          url: '/list',
          log: [
            ['model', 'list', LIST_DEFAULTS],
            [
              'setup',
              'list',
              {
                routeName: 'list',
                changed: {},
                changes: {},
                queryParams: LIST_DEFAULTS,
                shouldRefresh: true,
              },
              'list',
            ],
            ['listener:setup', 'list', {}],
          ],
          // the definitions' replace flags, under the route's own options
          routeQueryParams: {
            page: { replace: true },
            search: { replace: true },
            project: { replace: true },
            printMode: { replace: false },
            status: { replace: true, refreshModel: true },
          },
        },
      );
    });

    test('entering with values: setup has them as changed, typed', async function (assert) {
      // (project: values as they are, so the address's string)
      await visit('/list?page=3&search=Pump&project.id=7');

      assert.deepEqual(snapshot(log.slice(1, 2)), [
        [
          'setup',
          'list',
          {
            routeName: 'list',
            changed: { page: 3, search: 'Pump', project: '7' },
            changes: { page: 3, search: 'Pump', project: '7' },
            queryParams: {
              ...LIST_DEFAULTS,
              page: 3,
              search: 'Pump',
              project: '7',
            },
            shouldRefresh: true,
          },
          'list',
        ],
      ]);
    });

    test('changing values: address, replace or push, didChange, model refresh', async function (assert) {
      // QUIRK (status, a refreshModel key on the route): the route refreshes:
      // model, reset (isExiting = false), setup, then didChange twice.
      // QUIRK (resetAll): for keys going back to their default, event.changed
      // holds the value they had, not the default; and one replace: false key
      // (printMode) makes the whole update a push.
      await visit('/list');
      app.clearHistory();
      log = [];

      const controller: any = this.owner.lookup('controller:list');
      const steps: Record<string, Log> = {};
      const step = async (name: string, change: () => void) => {
        change();
        await settled();
        logHistory();
        steps[name] = log;
        log = [];
      };

      await step('search', () => set(controller, 'search', 'Pump'));
      // printMode is replace: false
      await step('printMode', () => set(controller, 'printMode', true));
      // the route asks for refreshModel on status (parachute: refresh: false)
      await step('status', () => set(controller, 'status', 'closed'));
      await step('twoAtOnce', () => {
        set(controller, 'page', 2);
        set(controller, 'search', 'Valve');
      });
      await step('resetAll', () => controller.resetQueryParams());

      const pump = { ...LIST_DEFAULTS, search: 'Pump' };
      const printing = { ...pump, printMode: true };
      const closed = { ...printing, status: 'closed' };
      const valve = { ...closed, page: 2, search: 'Valve' };

      assert.deepEqual(snapshot(steps), {
        search: [
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: { search: 'Pump' },
              changes: { search: 'Pump' },
              queryParams: pump,
              shouldRefresh: true,
            },
          ],
          ['replace', '/list?search=Pump'],
        ],
        printMode: [
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: { printMode: true },
              changes: { search: 'Pump', printMode: true },
              queryParams: printing,
              shouldRefresh: true,
            },
          ],
          ['push', '/list?printMode=true&search=Pump'],
        ],
        status: [
          ['model', 'list', closed],
          [
            'reset',
            'list',
            {
              routeName: 'list',
              changed: {},
              changes: { search: 'Pump', printMode: true, status: 'closed' },
              queryParams: closed,
              shouldRefresh: false,
            },
            false,
          ],
          [
            'setup',
            'list',
            {
              routeName: 'list',
              changed: { search: 'Pump', printMode: true, status: 'closed' },
              changes: { search: 'Pump', printMode: true, status: 'closed' },
              queryParams: closed,
              shouldRefresh: true,
            },
            'list',
          ],
          [
            'listener:setup',
            'list',
            { search: 'Pump', printMode: true, status: 'closed' },
          ],
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: { status: 'closed' },
              changes: { search: 'Pump', printMode: true, status: 'closed' },
              queryParams: closed,
              shouldRefresh: false,
            },
          ],
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: { status: 'closed' },
              changes: { search: 'Pump', printMode: true, status: 'closed' },
              queryParams: closed,
              shouldRefresh: false,
            },
          ],
          ['replace', '/list?printMode=true&search=Pump&status=closed'],
        ],
        twoAtOnce: [
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: { page: 2, search: 'Valve' },
              changes: {
                page: 2,
                search: 'Valve',
                printMode: true,
                status: 'closed',
              },
              queryParams: valve,
              shouldRefresh: true,
            },
          ],
          ['replace', '/list?page=2&printMode=true&search=Valve&status=closed'],
        ],
        resetAll: [
          ['model', 'list', LIST_DEFAULTS],
          [
            'reset',
            'list',
            {
              routeName: 'list',
              changed: {},
              changes: {},
              queryParams: LIST_DEFAULTS,
              shouldRefresh: false,
            },
            false,
          ],
          [
            'setup',
            'list',
            {
              routeName: 'list',
              changed: {},
              changes: {},
              queryParams: LIST_DEFAULTS,
              shouldRefresh: true,
            },
            'list',
          ],
          ['listener:setup', 'list', {}],
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: {
                page: 2,
                search: 'Valve',
                printMode: true,
                status: 'closed',
              },
              changes: {},
              queryParams: LIST_DEFAULTS,
              shouldRefresh: true,
            },
          ],
          [
            'didChange',
            'list',
            {
              routeName: 'list',
              changed: {
                page: 2,
                search: 'Valve',
                printMode: true,
                status: 'closed',
              },
              changes: {},
              queryParams: LIST_DEFAULTS,
              shouldRefresh: true,
            },
          ],
          ['push', '/list'],
        ],
      });
    });

    test('parachute defaults: no refresh, push, values typed by Ember', async function (assert) {
      await visit('/detail/1?tab=files&open=true&tags=%5B%22a%22%5D&loud=HEY');

      const controller: any = this.owner.lookup('controller:detail');
      const entered = {
        url: currentURL(),
        log,
        values: {
          tab: controller.tab,
          open: controller.open,
          tags: controller.tags,
          shout: controller.shout,
        },
      };

      app.clearHistory();
      log = [];
      set(controller, 'shout', 'Again');
      set(controller, 'tab', 'notes');
      await settled();
      logHistory();

      assert.deepEqual(snapshot({ entered, changed: log }), {
        entered: {
          url: '/detail/1?tab=files&open=true&tags=%5B%22a%22%5D&loud=HEY',
          log: [
            ['model', 'detail', '1'],
            [
              'setup',
              'detail',
              {
                routeName: 'detail',
                changed: {
                  tab: 'files',
                  open: true,
                  tags: ['a'],
                  shout: 'hey',
                },
                changes: {
                  tab: 'files',
                  open: true,
                  tags: ['a'],
                  shout: 'hey',
                },
                queryParams: {
                  tab: 'files',
                  open: true,
                  tags: ['a'],
                  shout: 'hey',
                },
                shouldRefresh: true,
              },
              'detail',
            ],
          ],
          values: { tab: 'files', open: true, tags: ['a'], shout: 'hey' },
        },
        changed: [
          [
            'didChange',
            'detail',
            {
              routeName: 'detail',
              changed: { tab: 'notes', shout: 'again' },
              changes: {
                tab: 'notes',
                open: true,
                tags: ['a'],
                shout: 'again',
              },
              queryParams: {
                tab: 'notes',
                open: true,
                tags: ['a'],
                shout: 'again',
              },
              shouldRefresh: true,
            },
          ],
          [
            'push',
            '/detail/1?loud=AGAIN&open=true&tab=notes&tags=%5B%22a%22%5D',
          ],
        ],
      });
    });

    test('transitions: same route new model, leave, come back (sticky values)', async function (assert) {
      // QUIRK: a new model on the same route runs model, then reset
      // (isExiting = false), setup, and one more didChange (changed: the old
      // value).
      const steps: Record<string, unknown> = {};

      await visit('/detail/1?tab=files');
      log = [];

      await visit('/detail/2');
      steps.otherModel = { url: currentURL(), log };
      log = [];

      await visit('/plain');
      steps.leave = { url: currentURL(), log };
      log = [];

      await visit('/detail/2');
      steps.back = {
        url: currentURL(),
        log,
        tab: (this.owner.lookup('controller:detail') as any).tab,
      };

      const defaults = { tab: 'info', open: false, tags: [], shout: '' };

      assert.deepEqual(snapshot(steps), {
        otherModel: {
          url: '/detail/2',
          log: [
            ['model', 'detail', '2'],
            [
              'reset',
              'detail',
              {
                routeName: 'detail',
                changed: {},
                changes: { tab: 'files' },
                queryParams: { ...defaults, tab: 'files' },
                shouldRefresh: false,
              },
              false,
            ],
            [
              'setup',
              'detail',
              {
                routeName: 'detail',
                changed: {},
                changes: {},
                queryParams: defaults,
                shouldRefresh: true,
              },
              'detail',
            ],
            [
              'didChange',
              'detail',
              {
                routeName: 'detail',
                changed: { tab: 'files' },
                changes: {},
                queryParams: defaults,
                shouldRefresh: true,
              },
            ],
          ],
        },
        leave: {
          url: '/plain',
          log: [
            [
              'reset',
              'detail',
              {
                routeName: 'detail',
                changed: {},
                changes: {},
                queryParams: defaults,
                shouldRefresh: false,
              },
              true,
            ],
          ],
        },
        back: {
          url: '/detail/2',
          log: [
            ['model', 'detail', '2'],
            [
              'setup',
              'detail',
              {
                routeName: 'detail',
                changed: {},
                changes: {},
                queryParams: defaults,
                shouldRefresh: true,
              },
              'detail',
            ],
          ],
          tab: 'info',
        },
      });
    });

    test('sticky values: model-scoped by default, kept per model', async function (assert) {
      // Ember's own stickiness: a query param without `scope: 'controller'`
      // keeps a value per model (detail/1 and detail/2 each have theirs).
      // The detail definitions have no scope.
      // (stickiness is for transitions by name: an address says what it has)
      const controller: any = this.owner.lookup('controller:detail');
      const router: any = this.owner.lookup('service:router');

      await visit('/detail/1?tab=files');
      await visit('/detail/2?tab=notes');
      await visit('/plain');
      await router.transitionTo('detail', '1');

      const one = { url: currentURL(), tab: controller.tab };

      await visit('/plain');
      await router.transitionTo('detail', '2');

      assert.deepEqual(
        { one, two: { url: currentURL(), tab: controller.tab } },
        {
          one: { url: '/detail/1?tab=files', tab: 'files' },
          two: { url: '/detail/2?tab=notes', tab: 'notes' },
        },
      );
    });

    test("sticky values: scope: 'controller' shares one value across models", async function (assert) {
      register(
        this.owner,
        'controller:detail',
        class extends controllerWith(
          style,
          new QueryParams({
            tab: { defaultValue: 'info', scope: 'controller' },
          }),
        ) {},
      );

      await visit('/detail/1?tab=files');
      await (this.owner.lookup('service:router') as any).transitionTo(
        'detail',
        '2',
      );

      assert.strictEqual(currentURL(), '/detail/2?tab=files');
    });

    test('the app pattern: resetQueryParams in reset clears sticky values', async function (assert) {
      class Resetting extends ListController {
        reset(event: ParachuteEvent, isExiting: boolean) {
          super.reset(event, isExiting);

          if (isExiting) {
            (this as any).resetQueryParams();
          }
        }
      }

      register(this.owner, 'controller:list', Resetting);

      await visit('/list?search=pump&page=4');
      await visit('/plain');
      log = [];
      await visit('/list');

      assert.deepEqual(
        snapshot({
          url: currentURL(),
          search: (this.owner.lookup('controller:list') as any).search,
          log,
        }),
        {
          url: '/list',
          search: '',
          log: [
            ['model', 'list', LIST_DEFAULTS],
            [
              'setup',
              'list',
              {
                routeName: 'list',
                changed: {},
                changes: {},
                queryParams: LIST_DEFAULTS,
                shouldRefresh: true,
              },
              'list',
            ],
            ['listener:setup', 'list', {}],
          ],
        },
      );
    });

    test('nested routes: each controller hears about every change', async function (assert) {
      // QUIRK: every parachute controller in the route hierarchy gets
      // queryParamsDidChange for any change; `changed` is empty unless it is
      // its own key.
      await visit('/parent/child?p=b&c=y');

      const steps: Record<string, unknown> = {
        entered: { url: currentURL(), log },
      };

      log = [];
      set(this.owner.lookup('controller:parent.child') as object, 'c', 'z');
      await settled();
      steps.child = { url: currentURL(), log };

      log = [];
      set(this.owner.lookup('controller:parent') as object, 'p', 'c');
      await settled();
      steps.parent = { url: currentURL(), log };

      assert.deepEqual(snapshot(steps), {
        entered: {
          url: '/parent/child?p=b&c=y',
          log: [
            [
              'setup',
              'parent',
              {
                routeName: 'parent',
                changed: { p: 'b' },
                changes: { p: 'b' },
                queryParams: { p: 'b' },
                shouldRefresh: true,
              },
              'parent.child',
            ],
            [
              'setup',
              'child',
              {
                routeName: 'parent.child',
                changed: { c: 'y' },
                changes: { c: 'y' },
                queryParams: { c: 'y' },
                shouldRefresh: true,
              },
              'parent.child',
            ],
          ],
        },
        child: {
          url: '/parent/child?c=z&p=b',
          log: [
            [
              'didChange',
              'child',
              {
                routeName: 'parent.child',
                changed: { c: 'z' },
                changes: { c: 'z' },
                queryParams: { c: 'z' },
                shouldRefresh: false,
              },
            ],
            [
              'didChange',
              'parent',
              {
                routeName: 'parent',
                changed: {},
                changes: { p: 'b' },
                queryParams: { p: 'b' },
                shouldRefresh: false,
              },
            ],
          ],
        },
        parent: {
          url: '/parent/child?c=z&p=c',
          log: [
            [
              'didChange',
              'child',
              {
                routeName: 'parent.child',
                changed: {},
                changes: { c: 'z' },
                queryParams: { c: 'z' },
                shouldRefresh: false,
              },
            ],
            [
              'didChange',
              'parent',
              {
                routeName: 'parent',
                changed: { p: 'c' },
                changes: { p: 'c' },
                queryParams: { p: 'c' },
                shouldRefresh: false,
              },
            ],
          ],
        },
      });
    });

    test('@withParachute and plain controllers', async function (assert) {
      await visit('/bare');
      await visit('/plain?plainQp=y');

      assert.deepEqual(
        snapshot({
          url: currentURL(),
          log,
          plainQp: (this.owner.lookup('controller:plain') as any).plainQp,
        }),
        {
          url: '/plain?plainQp=y',
          log: [
            [
              'setup',
              'bare',
              {
                routeName: 'bare',
                changed: {},
                changes: {},
                queryParams: {},
                shouldRefresh: true,
              },
              'bare',
            ],
            [
              'reset',
              'bare',
              {
                routeName: 'bare',
                changed: {},
                changes: {},
                queryParams: {},
                shouldRefresh: false,
              },
              true,
            ],
          ],
          plainQp: 'y',
        },
      );
    });

    test('a route without a controller of its own', async function (assert) {
      // Ember generates one; no factory to look a definition up on
      register(this.owner, 'route:bare', class extends Route {});
      (this.owner as any).unregister('controller:bare');

      await visit('/bare?x=1');

      assert.strictEqual(currentURL(), '/bare?x=1');
    });

    test('serializeQueryParam / deserializeQueryParam on the route', async function (assert) {
      await visit('/detail/1');
      await visit('/plain');

      const detail: any = this.owner.lookup('route:detail');
      const plain: any = this.owner.lookup('route:plain');

      assert.deepEqual(
        snapshot({
          customSerialize: detail.serializeQueryParam('hey', 'loud', 'string'),
          customDeserialize: detail.deserializeQueryParam(
            'HEY',
            'loud',
            'string',
          ),
          emberSerialize: detail.serializeQueryParam(['a'], 'tags', 'array'),
          emberDeserialize: detail.deserializeQueryParam(
            '["a"]',
            'tags',
            'array',
          ),
          emberBoolean: detail.deserializeQueryParam('true', 'open', 'boolean'),
          plainSerialize: plain.serializeQueryParam(['a'], 'plainQp', 'array'),
          plainDeserialize: plain.deserializeQueryParam(
            '7',
            'plainQp',
            'number',
          ),
        }),
        {
          customSerialize: 'HEY',
          customDeserialize: 'hey',
          emberSerialize: '["a"]',
          emberDeserialize: ['a'],
          emberBoolean: true,
          plainSerialize: '["a"]',
          plainDeserialize: 7,
        },
      );
    });

    test('deserialize waits for routes that are still loading', async function (assert) {
      await visit('/detail/1');

      const route: any = this.owner.lookup('route:detail');
      const order: string[] = [];
      const loading = deferred();
      const loaded = { route: {}, routePromise: Promise.resolve() };

      const ready = route.deserialize({ id: '5' }, { routeInfos: [loaded] });
      const noInfos = route.deserialize({ id: '4' }, {});
      const waiting = route.deserialize(
        { id: '6' },
        {
          routeInfos: [
            loaded,
            // a split route whose bundle is loading
            {
              isResolved: false,
              route: undefined,
              routePromise: loading.promise.then(() => order.push('loaded')),
            },
          ],
        },
      );

      order.push(waiting instanceof Promise ? 'promise' : 'value');
      loading.resolve();

      const model = await waiting;

      order.push(`model ${model.id}`);

      // Ember 7.5's route managers: the route's management in place of the
      // route
      const managed = deferred();
      const managedReady = route.deserialize(
        { id: '7' },
        {
          routeInfos: [
            {
              managementPromise: Promise.resolve(),
              hasResolvedManagement: true,
            },
          ],
        },
      );
      const managedWaiting = route.deserialize(
        { id: '8' },
        {
          routeInfos: [
            {
              managementPromise: Promise.resolve(),
              hasResolvedManagement: true,
            },
            {
              isResolved: false,
              hasResolvedManagement: false,
              managementPromise: managed.promise.then(() =>
                order.push('managed loaded'),
              ),
            },
          ],
        },
      );

      order.push(managedWaiting instanceof Promise ? 'promise' : 'value');
      managed.resolve();
      order.push(`model ${(await managedWaiting).id}`);

      assert.deepEqual(
        snapshot({
          ready,
          readyIsPromise: ready instanceof Promise,
          noInfos,
          managedReady,
          order,
          models: log.filter(([kind]) => kind === 'model'),
        }),
        {
          ready: { id: '5' },
          readyIsPromise: false,
          noInfos: { id: '4' },
          managedReady: { id: '7' },
          order: [
            'promise',
            'loaded',
            'model 6',
            'promise',
            'managed loaded',
            'model 8',
          ],
          models: [
            ['model', 'detail', '1'],
            ['model', 'detail', '5'],
            ['model', 'detail', '4'],
            ['model', 'detail', '6'],
            ['model', 'detail', '7'],
            ['model', 'detail', '8'],
          ],
        },
      );
    });

    test('no loading substate: entering, a new model, a refresh', async function (assert) {
      // a transition whose routes are all loaded stays synchronous, so a
      // loading route never shows (and the route isn't exited for it)
      const entered: string[] = [];

      register(
        this.owner,
        'route:loading',
        class extends Route {
          activate() {
            entered.push('loading');
          }
        },
      );
      register(this.owner, 'template:loading', outlet);

      await visit('/list');
      set(this.owner.lookup('controller:list') as object, 'status', 'closed');
      await settled();
      await visit('/detail/1');
      await visit('/detail/2');

      assert.deepEqual(entered, []);
    });
  });
}
