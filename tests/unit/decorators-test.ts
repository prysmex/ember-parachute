import Controller from '@ember/controller';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import QueryParams, { queryParam, withParachute } from '#src/index.ts';
import { integer, list } from '#src/adapters.ts';

import { snapshot } from '../helpers/index.ts';

import type Owner from '@ember/owner';

// @queryParam fields and @withParachute: the definitions they make, and
// the controller they give. Their route side is in
// tests/acceptance/decorators-test.ts.
module('Unit | decorators', function (hooks) {
  setupTest(hooks);

  function controllerFor<T>(owner: Owner, Klass: new (...args: any[]) => T): T {
    owner.register('controller:subject', Klass);

    return owner.lookup('controller:subject') as T;
  }

  @withParachute
  class SearchController extends Controller {
    @queryParam({ as: 'q', refresh: true }) search = '';
    @queryParam({ ...integer(1), replace: true }) page = 1;
    @queryParam tags: string[] = [];
    @queryParam({ defaultValue: 'name' }) sort!: string;
  }

  test('the definitions: the field value is the default', function (assert) {
    const controller = controllerFor(this.owner, SearchController);
    const meta = QueryParams.metaFor(controller);

    assert.deepEqual(
      snapshot({
        controllerQueryParams: (controller as any).queryParams,
        definitions: meta.queryParamsArray.map((qp) => ({
          key: qp.key,
          as: qp.as,
          refresh: qp.refresh,
          replace: qp.replace,
          defaultValue: qp.defaultValue,
          serialize: typeof qp.serialize,
        })),
      }),
      {
        controllerQueryParams: [
          {
            search: { as: 'q', scope: '<undefined>' },
            page: { as: 'page', scope: '<undefined>' },
            tags: { as: 'tags', scope: '<undefined>' },
            sort: { as: 'sort', scope: '<undefined>' },
          },
        ],
        definitions: [
          {
            key: 'search',
            as: 'q',
            refresh: true,
            replace: false,
            defaultValue: '',
            serialize: 'undefined',
          },
          {
            key: 'page',
            as: 'page',
            refresh: false,
            replace: true,
            defaultValue: 1,
            serialize: 'function',
          },
          {
            key: 'tags',
            as: 'tags',
            refresh: false,
            replace: false,
            defaultValue: [],
            serialize: 'undefined',
          },
          {
            key: 'sort',
            as: 'sort',
            refresh: false,
            replace: false,
            defaultValue: 'name',
            serialize: 'undefined',
          },
        ],
      },
    );
  });

  test('values: tracked fields, each instance its own', function (assert) {
    this.owner.register('controller:one', SearchController);
    this.owner.register('controller:two', SearchController);

    const one = this.owner.lookup('controller:one') as SearchController;
    const two = this.owner.lookup('controller:two') as SearchController;

    one.search = 'pumps';
    one.tags.push('mutated');

    assert.deepEqual(
      snapshot({
        one: { search: one.search, tags: one.tags, sort: one.sort },
        two: { search: two.search, tags: two.tags, sort: two.sort },
        state: (one as any).queryParamsState.search,
      }),
      {
        one: { search: 'pumps', tags: ['mutated'], sort: 'name' },
        // its own array, from the field's initializer
        two: { search: '', tags: [], sort: 'name' },
        state: {
          value: 'pumps',
          serializedValue: 'pumps',
          as: 'q',
          defaultValue: '',
          changed: true,
        },
      },
    );
  });

  test('resetQueryParams and the rest of the API', function (assert) {
    const controller = controllerFor(this.owner, SearchController) as any;

    controller.search = 'x';
    controller.page = 4;
    controller.resetQueryParams(['page']);

    const some = { search: controller.search, page: controller.page };

    controller.resetQueryParams();

    assert.deepEqual(
      snapshot({
        some,
        all: controller.allQueryParams,
        isController: controller instanceof Controller,
        isSearch: controller instanceof SearchController,
      }),
      {
        some: { search: 'x', page: 1 },
        all: { search: '', page: 1, tags: [], sort: 'name' },
        isController: true,
        isSearch: true,
      },
    );
  });

  test('subclasses: their fields and their parents, merged', function (assert) {
    @withParachute
    class FilteredController extends SearchController {
      @queryParam({ ...list() }) status: string[] = ['open'];
      // overrides the parent's definition
      @queryParam({ as: 'p' }) page = 2;
    }

    const controller = controllerFor(this.owner, FilteredController) as any;

    assert.deepEqual(
      snapshot({
        definitions: Object.fromEntries(
          QueryParams.metaFor(controller).queryParamsArray.map((qp) => [
            qp.key,
            [qp.as, qp.defaultValue],
          ]),
        ),
        all: controller.allQueryParams,
      }),
      {
        definitions: {
          search: ['q', ''],
          page: ['p', 2],
          tags: ['tags', []],
          sort: ['sort', 'name'],
          status: ['status', ['open']],
        },
        all: {
          search: '',
          page: 2,
          tags: [],
          sort: 'name',
          status: ['open'],
        },
      },
    );
  });

  test('a value and a defaultValue: one or the other', function (assert) {
    assert.throws(() => {
      class Both extends Controller {
        @queryParam({ defaultValue: 2 }) page = 1;
      }

      return Both;
    }, /has both a value and a defaultValue/);
  });

  test('@withParachute alone: the hooks, no query params', function (assert) {
    @withParachute
    class Bare extends Controller {}

    const controller = controllerFor(this.owner, Bare) as any;

    assert.deepEqual(
      snapshot({
        has: QueryParams.hasParachute(controller),
        all: controller.allQueryParams,
      }),
      { has: true, all: {} },
    );
  });
});
