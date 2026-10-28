import Controller from '@ember/controller';
import { hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import Route from '@ember/routing/route';
import { precompileTemplate } from '@ember/template-compilation';
import {
  click,
  currentURL,
  resetOnerror,
  settled,
  setupOnerror,
  visit,
} from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import QueryParams from '#src/index.ts';
import { integer, json, list } from '#src/adapters.ts';

import { register, setupApp, snapshot } from '../helpers/index.ts';

import type RouterService from '@ember/routing/router-service';

// Links and transitions into a parachute route, every way Ember builds
// them. Ember isn't consistent, and these pin how:
//
// - <LinkTo @query>, transitionTo, replaceWith: query params by their name
//   in the address (`as`; Ember asserts on a property name), typed values:
//   Ember runs the route's serializeQueryParam (parachute's `serialize`).
//   queryParams.forLink(values) gives exactly that.
// - router.urlFor: by name in the address too, but Ember runs no
//   serializer at all: values as the address holds them.
//   queryParams.serialize(values) gives exactly that.
// - an address (deep link) read back: router.recognize, then
//   queryParams.deserialize.

const queryParams = new QueryParams({
  search: {
    as: 'q',
    defaultValue: '',
    serialize: (value: unknown) => String(value).toUpperCase(),
    deserialize: (value: unknown) => String(value).toLowerCase(),
  },
  page: { defaultValue: 1, ...integer(1) },
  tags: { defaultValue: [] as string[], ...list() },
  filters: { defaultValue: {} as Record<string, unknown>, ...json({}) },
  // no serializer: Ember's own, by the type of the default
  ids: { defaultValue: [] as number[] },
  print: { defaultValue: false, replace: false },
});

class ListController extends queryParams.mixInto(Controller) {}

const VALUES = {
  search: 'pumps',
  page: 2,
  tags: ['a', 'b'],
  filters: { status: 'open' },
  ids: [7],
};

const ADDRESS =
  '/list?filters=%7B%22status%22%3A%22open%22%7D&ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb';

module('Acceptance | links', function (hooks) {
  setupApplicationTest(hooks);

  let app: ReturnType<typeof setupApp>;
  let router: RouterService;

  hooks.beforeEach(function () {
    app = setupApp(this.owner, function () {
      this.route('list');
      this.route('other');
    });
    register(this.owner, 'controller:list', ListController);
    register(this.owner, 'route:list', class extends Route {});
    router = this.owner.lookup('service:router') as RouterService;
  });

  const values = (owner: any) => {
    const controller = owner.lookup('controller:list');

    return snapshot({
      search: controller.search,
      page: controller.page,
      tags: controller.tags,
      filters: controller.filters,
      ids: controller.ids,
    });
  };

  test('transitionTo with forLink(): every value, typed, to the address and back', async function (assert) {
    await visit('/other');
    await router.transitionTo('list', {
      queryParams: queryParams.forLink(VALUES),
    });

    assert.strictEqual(currentURL(), ADDRESS);
    assert.deepEqual(values(this.owner), VALUES);
  });

  test("forLink(): names in the address, each definition's serialize", function (assert) {
    assert.deepEqual(
      snapshot(queryParams.forLink({ ...VALUES, print: false })),
      {
        q: 'PUMPS',
        page: 2,
        tags: 'a,b',
        filters: '{"status":"open"}',
        // left to Ember
        ids: [7],
        // kept: a link can put a value back to its default
        print: false,
      },
    );
    assert.deepEqual(
      snapshot(
        queryParams.forLink({ page: 1, search: 'x' }, { keepDefaults: false }),
      ),
      { q: 'X' },
    );
  });

  test('a property name in a transition: Ember asserts', async function (assert) {
    await visit('/other');

    let caught: unknown;

    setupOnerror((error) => (caught = error));

    try {
      await router.transitionTo('list', { queryParams: { search: 'pumps' } });
    } catch (error) {
      caught ??= error;
    } finally {
      resetOnerror();
    }

    assert.true(
      /You passed the `search` query parameter during a transition into list, please update to q/.test(
        String(caught),
      ),
      String(caught),
    );
  });

  test('<LinkTo @query>: typed values by name in the address', async function (assert) {
    const tags = ['a', 'b'];
    const ids = [7];
    const forLink = queryParams.forLink({
      search: 'pumps',
      page: 2,
      tags,
      ids,
    });

    register(
      this.owner,
      'template:other',
      precompileTemplate(
        `<LinkTo @route="list" @query={{hash q="pumps" page=2 tags=tags ids=ids}} data-test-typed>typed</LinkTo>
         <LinkTo @route="list" @query={{forLink}} data-test-for-link>forLink</LinkTo>`,
        {
          strictMode: true,
          scope: () => ({ LinkTo, hash, tags, ids, forLink }),
        },
      ),
    );

    await visit('/other');

    const typed = document
      .querySelector('[data-test-typed]')!
      .getAttribute('href');
    const forLinkHref = document
      .querySelector('[data-test-for-link]')!
      .getAttribute('href');

    await click('[data-test-for-link]');

    assert.deepEqual(
      snapshot({
        typed,
        forLink: forLinkHref,
        url: currentURL(),
        values: values(this.owner),
      }),
      {
        typed: '/list?ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb',
        // the same: each serialize took its own output back
        forLink: '/list?ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb',
        url: '/list?ids=%5B7%5D&page=2&q=PUMPS&tags=a%2Cb',
        values: { ...VALUES, filters: {} },
      },
    );
  });

  test('router.urlFor: no serializer runs, serialize() gives the address', async function (assert) {
    await visit('/list');

    assert.deepEqual(
      {
        // QUIRK (Ember's own): urlFor writes what it is given as it is
        typed: router.urlFor('list', {
          queryParams: { q: 'pumps', tags: ['a'] },
        }),
        serialized: router.urlFor('list', {
          queryParams: queryParams.serialize(VALUES),
        }),
      },
      {
        typed: '/list?q=pumps&tags[]=a',
        serialized: ADDRESS,
      },
    );
  });

  test('serialize(): the address, defaults left out', function (assert) {
    assert.deepEqual(
      snapshot(queryParams.serialize({ ...VALUES, print: false })),
      {
        q: 'PUMPS',
        page: 2,
        tags: 'a,b',
        filters: '{"status":"open"}',
        ids: '[7]',
      },
    );
  });

  test('a deep link: visit it, and read it without a route', async function (assert) {
    await visit(ADDRESS);

    const recognized = router.recognize(ADDRESS);

    assert.deepEqual(
      snapshot({
        controller: values(this.owner),
        recognized: recognized?.queryParams,
        deserialized: queryParams.deserialize(recognized?.queryParams ?? {}),
      }),
      {
        controller: VALUES,
        // what the address holds, as Ember reads it without a controller
        recognized: {
          filters: '{"status":"open"}',
          ids: '[7]',
          page: '2',
          q: 'PUMPS',
          tags: 'a,b',
        },
        deserialized: { ...VALUES, print: false },
      },
    );
  });

  test('a hand-edited address: each value its fallback, not an error', async function (assert) {
    await visit('/list?page=two&filters=%5Bobject%20Object%5D&q=Hi');

    assert.deepEqual(values(this.owner), {
      search: 'hi',
      page: 1,
      tags: [],
      filters: {},
      ids: [],
    });
  });

  test('replaceWith replaces, transitionTo pushes; replace: false pushes', async function (assert) {
    await visit('/list');
    app.clearHistory();

    await router.replaceWith('list', { queryParams: { page: 3 } });
    await router.transitionTo('list', { queryParams: { page: 4 } });

    const controller: any = this.owner.lookup('controller:list');

    controller.set('search', 'x');
    await settled();
    controller.set('print', true);
    await settled();

    assert.deepEqual(app.history, [
      ['replace', '/list?page=3'],
      ['push', '/list?page=4'],
      // no replace on search: Ember pushes
      ['push', '/list?page=4&q=X'],
      ['push', '/list?page=4&print=true&q=X'],
    ]);
  });

  test('router.isActive compares query params by name in the address', async function (assert) {
    await visit('/list?page=3&q=PUMPS');

    assert.true(router.isActive('list', { queryParams: { page: 3 } }));
    assert.true(router.isActive('list', { queryParams: { q: 'pumps' } }));
    assert.false(router.isActive('list', { queryParams: { page: 4 } }));
  });

  test('currentRoute.queryParams: the address, as Ember keeps it', async function (assert) {
    await visit('/list?page=3&q=PUMPS&tags=a%2Cb');

    assert.deepEqual(snapshot(router.currentRoute?.queryParams), {
      page: '3',
      q: 'PUMPS',
      tags: 'a,b',
    });
  });
});
