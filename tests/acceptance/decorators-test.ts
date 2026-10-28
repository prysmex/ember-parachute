import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { currentURL, settled, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import { queryParam, withParachute, type ParachuteEvent } from '#src/index.ts';
import { integer, list, oneOf } from '#src/adapters.ts';

import { register, setupApp, snapshot } from '../helpers/index.ts';

// @queryParam fields on a route: plain assignments are query param
// changes (the fields are tracked), and every hook runs.

const log: unknown[][] = [];

@withParachute
class SearchController extends Controller {
  @queryParam({ as: 'q', refresh: true }) search = '';
  @queryParam({ ...integer(1), refresh: true, replace: true }) page = 1;
  @queryParam({ ...list() }) tags: string[] = [];
  @queryParam({ ...oneOf(['name', 'date'], 'name') }) sort = 'name';

  setup(event: ParachuteEvent) {
    log.push(['setup', snapshot(event.changed)]);
  }

  queryParamsDidChange(event: ParachuteEvent) {
    log.push(['didChange', snapshot(event.changed), event.shouldRefresh]);
  }
}

@withParachute
class FilteredSearchController extends SearchController {
  @queryParam({ ...list() }) status: string[] = ['open'];
}

module('Acceptance | decorators', function (hooks) {
  setupApplicationTest(hooks);

  let app: ReturnType<typeof setupApp>;

  hooks.beforeEach(function () {
    log.length = 0;
    app = setupApp(this.owner, function () {
      this.route('search');
    });
    register(this.owner, 'route:search', class extends Route {});
    register(this.owner, 'controller:search', SearchController);
  });

  const controller = (owner: any) => owner.lookup('controller:search');

  test('entering: typed values, setup', async function (assert) {
    await visit('/search?q=pumps&page=3&tags=a%2Cb&sort=date');

    const c = controller(this.owner);

    assert.deepEqual(
      snapshot({
        values: { search: c.search, page: c.page, tags: c.tags, sort: c.sort },
        log,
      }),
      {
        values: { search: 'pumps', page: 3, tags: ['a', 'b'], sort: 'date' },
        log: [
          [
            'setup',
            { search: 'pumps', page: 3, tags: ['a', 'b'], sort: 'date' },
          ],
        ],
      },
    );
  });

  test('a plain assignment is a change: address, replace, didChange', async function (assert) {
    await visit('/search');
    app.clearHistory();
    log.length = 0;

    const c = controller(this.owner);

    c.page = 2;
    await settled();
    c.search = 'valves';
    await settled();
    c.tags = ['x'];
    await settled();

    assert.deepEqual(snapshot({ history: app.history, log }), {
      history: [
        ['replace', '/search?page=2'],
        ['push', '/search?page=2&q=valves'],
        ['push', '/search?page=2&q=valves&tags=x'],
      ],
      log: [
        ['didChange', { page: 2 }, true],
        ['didChange', { search: 'valves' }, true],
        ['didChange', { tags: ['x'] }, false],
      ],
    });
  });

  test('a hand-edited address: oneOf and integer read their fallback', async function (assert) {
    await visit('/search?sort=DROP&page=x');

    const c = controller(this.owner);

    assert.deepEqual({ sort: c.sort, page: c.page }, { sort: 'name', page: 1 });
  });

  test('resetQueryParams: back to the field values', async function (assert) {
    await visit('/search?q=pumps&page=3');
    controller(this.owner).resetQueryParams();
    await settled();

    assert.strictEqual(currentURL(), '/search');
  });

  test("a subclass: its fields and its parent's", async function (assert) {
    register(this.owner, 'controller:search', FilteredSearchController);

    await visit('/search?q=pumps&status=open%2Cclosed');

    const c = controller(this.owner);

    assert.deepEqual(snapshot({ search: c.search, status: c.status, log }), {
      search: 'pumps',
      status: ['open', 'closed'],
      log: [['setup', { search: 'pumps', status: ['open', 'closed'] }]],
    });
  });
});
