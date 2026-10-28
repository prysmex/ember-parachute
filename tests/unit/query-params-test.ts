import Controller from '@ember/controller';
import { set } from '@ember/object';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import QueryParams, { withParachute } from '#src/index.ts';

import { snapshot } from '../helpers/index.ts';

import type Owner from '@ember/owner';

// The class API, as every query-param controller uses it: the QueryParams
// class (a set of query param definitions), its Mixin (what controllers
// extend) and the static helpers the route side calls. The route side is
// in tests/acceptance.
for (const style of ['mixInto', 'Mixin'] as const) {
  // A controller class with a definition set, in either style
  const withQP = (queryParams: QueryParams<any>): typeof Controller =>
    (style === 'Mixin'
      ? Controller.extend(queryParams.Mixin)
      : queryParams.mixInto(Controller)) as typeof Controller;

  module(`Unit | QueryParams (${style})`, function (hooks) {
    setupTest(hooks);

    const upper = (value: unknown) => String(value).toUpperCase();
    const lower = (value: unknown) => String(value).toLowerCase();

    function definitions() {
      return new QueryParams<{
        page: number;
        search: string;
        tags: string[];
        filter: { status: string };
      }>(
        {
          page: { defaultValue: 1, refresh: true },
          search: {
            as: 'q',
            defaultValue: '',
            replace: true,
            serialize: upper,
            deserialize: lower,
          },
        },
        {
          tags: { defaultValue: [], scope: 'controller' },
          filter: { defaultValue: { status: 'open' } },
        },
      );
    }

    function controllerFor(
      owner: Owner,
      Klass: unknown,
      name = 'subject',
    ): any {
      owner.register(`controller:${name}`, Klass as never);

      return owner.lookup(`controller:${name}`);
    }

    test('a definition set: merged, empty entries dropped', function (assert) {
      const qp = new QueryParams(
        { a: { defaultValue: 1 }, b: { defaultValue: 2 } },
        { b: undefined, c: null, d: { as: 'dee' } },
        { a: { defaultValue: 3 } },
      );

      assert.deepEqual(snapshot(qp.queryParams), {
        a: { defaultValue: 3 },
        d: { as: 'dee' },
      });
      if (style === 'Mixin') {
        assert.ok(qp.Mixin, 'has a Mixin');
      }
    });

    test('no definitions at all', function (assert) {
      const controller = controllerFor(this.owner, withQP(new QueryParams()));

      assert.deepEqual(
        snapshot({
          all: controller.allQueryParams,
          state: controller.queryParamsState,
          has: QueryParams.hasParachute(controller),
        }),
        { all: {}, state: {}, has: true },
      );
    });

    test('extend() returns a new set; undefined removes a definition', function (assert) {
      const base = definitions();
      const extended = base.extend(
        { extra: { defaultValue: 'x' } },
        { search: undefined },
      );

      assert.deepEqual(
        snapshot({
          base: Object.keys(base.queryParams),
          extended: Object.keys(extended.queryParams),
          distinct: base !== extended,
          sameMixin: style === 'Mixin' && base.Mixin === extended.Mixin,
        }),
        {
          base: ['page', 'search', 'tags', 'filter'],
          extended: ['page', 'tags', 'filter', 'extra'],
          distinct: true,
          sameMixin: false,
        },
      );
    });

    test('extend() can override a definition', function (assert) {
      const extended = definitions().extend({
        page: { defaultValue: 5, as: 'p' },
      });

      assert.deepEqual(snapshot(extended.queryParams.page), {
        defaultValue: 5,
        as: 'p',
      });
    });

    test('the Mixin: controller query params, defaults and meta', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));
      const meta = QueryParams.metaFor(controller);

      assert.deepEqual(
        snapshot({
          hasParachute: QueryParams.hasParachute(controller),
          controllerQueryParams: controller.queryParams,
          values: {
            page: controller.page,
            search: controller.search,
            tags: controller.tags,
            filter: controller.filter,
          },
          meta: {
            qpMapForController: meta.qpMapForController,
            qpMapForRoute: meta.qpMapForRoute,
            defaultValues: meta.defaultValues,
            queryParamsArray: meta.queryParamsArray.map((qp) => ({
              key: qp.key,
              as: qp.as,
              scope: qp.scope,
              refresh: qp.refresh,
              replace: qp.replace,
              defaultValue: qp.defaultValue,
              serialize: typeof qp.serialize,
              deserialize: typeof qp.deserialize,
              toString: `${String(qp)}`,
            })),
          },
        }),
        {
          hasParachute: true,
          controllerQueryParams: [
            {
              page: { as: 'page', scope: '<undefined>' },
              search: { as: 'q', scope: '<undefined>' },
              tags: { as: 'tags', scope: 'controller' },
              filter: { as: 'filter', scope: '<undefined>' },
            },
          ],
          values: { page: 1, search: '', tags: [], filter: { status: 'open' } },
          meta: {
            qpMapForController: {
              page: { as: 'page', scope: '<undefined>' },
              search: { as: 'q', scope: '<undefined>' },
              tags: { as: 'tags', scope: 'controller' },
              filter: { as: 'filter', scope: '<undefined>' },
            },
            qpMapForRoute: {
              page: { replace: false },
              search: { replace: true },
              tags: { replace: false },
              filter: { replace: false },
            },
            defaultValues: {
              page: 1,
              search: '',
              tags: [],
              filter: { status: 'open' },
            },
            queryParamsArray: [
              {
                key: 'page',
                as: 'page',
                scope: '<undefined>',
                refresh: true,
                replace: false,
                defaultValue: 1,
                serialize: 'undefined',
                deserialize: 'undefined',
                toString: 'QueryParam<page>',
              },
              {
                key: 'search',
                as: 'q',
                scope: '<undefined>',
                refresh: false,
                replace: true,
                defaultValue: '',
                serialize: 'function',
                deserialize: 'function',
                toString: 'QueryParam<search>',
              },
              {
                key: 'tags',
                as: 'tags',
                scope: 'controller',
                refresh: false,
                replace: false,
                defaultValue: [],
                serialize: 'undefined',
                deserialize: 'undefined',
                toString: 'QueryParam<tags>',
              },
              {
                key: 'filter',
                as: 'filter',
                scope: '<undefined>',
                refresh: false,
                replace: false,
                defaultValue: { status: 'open' },
                serialize: 'undefined',
                deserialize: 'undefined',
                toString: 'QueryParam<filter>',
              },
            ],
          },
        },
      );
    });

    test('allQueryParams and queryParamsState follow the values', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));
      const before = {
        all: snapshot(controller.allQueryParams),
        state: snapshot(controller.queryParamsState),
      };

      set(controller, 'page', 4);
      set(controller, 'search', 'Hello');
      // a new array/object equal to the default is not a change
      set(controller, 'tags', []);
      set(controller, 'filter', { status: 'closed' });

      assert.deepEqual(
        snapshot({
          before,
          after: {
            all: controller.allQueryParams,
            state: controller.queryParamsState,
          },
        }),
        {
          before: {
            all: { page: 1, search: '', tags: [], filter: { status: 'open' } },
            state: {
              page: {
                value: 1,
                serializedValue: 1,
                as: 'page',
                defaultValue: 1,
                changed: false,
              },
              search: {
                value: '',
                serializedValue: '',
                as: 'q',
                defaultValue: '',
                changed: false,
              },
              tags: {
                value: [],
                serializedValue: [],
                as: 'tags',
                defaultValue: [],
                changed: false,
              },
              filter: {
                value: { status: 'open' },
                serializedValue: { status: 'open' },
                as: 'filter',
                defaultValue: { status: 'open' },
                changed: false,
              },
            },
          },
          after: {
            all: {
              page: 4,
              search: 'Hello',
              tags: [],
              filter: { status: 'closed' },
            },
            state: {
              page: {
                value: 4,
                serializedValue: 4,
                as: 'page',
                defaultValue: 1,
                changed: true,
              },
              search: {
                value: 'Hello',
                serializedValue: 'HELLO',
                as: 'q',
                defaultValue: '',
                changed: true,
              },
              tags: {
                value: [],
                serializedValue: [],
                as: 'tags',
                defaultValue: [],
                changed: false,
              },
              filter: {
                value: { status: 'closed' },
                serializedValue: { status: 'closed' },
                as: 'filter',
                defaultValue: { status: 'open' },
                changed: true,
              },
            },
          },
        },
      );
    });

    test('state compares as JSON: key order counts', function (assert) {
      const controller = controllerFor(
        this.owner,
        withQP(
          new QueryParams({ range: { defaultValue: { from: 1, to: 2 } } }),
        ),
      );

      set(controller, 'range', { from: 1, to: 2 });
      const sameOrder = controller.queryParamsState.range.changed as boolean;

      set(controller, 'range', { to: 2, from: 1 });
      const otherOrder = controller.queryParamsState.range.changed as boolean;

      assert.deepEqual(
        { sameOrder, otherOrder },
        {
          sameOrder: false,
          otherOrder: true,
        },
      );
    });

    test('resetQueryParams: every key, some keys, unknown keys', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));
      const dirty = () => {
        set(controller, 'page', 9);
        set(controller, 'search', 'x');
        set(controller, 'tags', ['a']);
      };
      const values = () =>
        snapshot({
          page: controller.page,
          search: controller.search,
          tags: controller.tags,
        });
      const result: Record<string, unknown> = {};

      dirty();
      controller.resetQueryParams();
      result.all = values();

      dirty();
      controller.resetQueryParams(['page', 'tags']);
      result.some = values();

      dirty();
      controller.resetQueryParams(['nope']);
      result.unknown = values();

      dirty();
      controller.resetQueryParams([]);
      result.emptyList = values();

      assert.deepEqual(snapshot(result), {
        all: { page: 1, search: '', tags: [] },
        some: { page: 1, search: 'x', tags: [] },
        unknown: { page: 9, search: 'x', tags: ['a'] },
        emptyList: { page: 1, search: '', tags: [] },
      });
    });

    test('resetQueryParams hands back the default itself, not a copy', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));
      const { defaultValues } = QueryParams.metaFor(controller);

      set(controller, 'tags', ['a']);
      controller.resetQueryParams(['tags']);

      assert.strictEqual(controller.tags, defaultValues.tags);
    });

    test('setDefaultQueryParamValue moves the default for state and reset', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));

      controller.setDefaultQueryParamValue('page', 2);

      const afterSet = snapshot(controller.queryParamsState.page);

      set(controller, 'page', 5);
      controller.resetQueryParams(['page']);

      assert.deepEqual(
        snapshot({
          afterSet,
          afterReset: controller.page,
          stateAfterReset: controller.queryParamsState.page,
        }),
        {
          afterSet: {
            value: 1,
            serializedValue: 1,
            as: 'page',
            defaultValue: 2,
            changed: true,
          },
          afterReset: 2,
          stateAfterReset: {
            value: 2,
            serializedValue: 2,
            as: 'page',
            defaultValue: 2,
            changed: false,
          },
        },
      );
      assert.throws(
        () => controller.setDefaultQueryParamValue('nope', 1),
        /The query parameter 'nope' does not exist/,
      );
    });

    test('each controller instance has its own meta', function (assert) {
      const Klass = withQP(definitions());

      this.owner.register('controller:one', Klass);
      this.owner.register('controller:two', Klass);

      const one: any = this.owner.lookup('controller:one');
      const two: any = this.owner.lookup('controller:two');

      one.setDefaultQueryParamValue('page', 7);

      assert.deepEqual(
        {
          sameMeta: QueryParams.metaFor(one) === QueryParams.metaFor(two),
          one: QueryParams.metaFor(one).queryParams.page!.defaultValue,
          two: QueryParams.metaFor(two).queryParams.page!.defaultValue,
        },
        { sameMeta: false, one: 7, two: 1 },
      );
    });

    test('statics: lookupQueryParam, queryParamsFor, stateFor, hasParachute, metaFor', function (assert) {
      const controller = controllerFor(this.owner, withQP(definitions()));
      const plain = controllerFor(this.owner, Controller, 'plain');

      set(controller, 'search', 'abc');

      assert.deepEqual(
        snapshot({
          byUrlKey: `${String(QueryParams.lookupQueryParam(controller, 'q'))}`,
          byPropertyName: `${String(QueryParams.lookupQueryParam(controller, 'search'))}`,
          queryParamsFor: QueryParams.queryParamsFor(controller),
          stateFor: QueryParams.stateFor(controller).search,
          plainHasParachute: QueryParams.hasParachute(plain),
          undefinedHasParachute: QueryParams.hasParachute(undefined),
          nullHasParachute: QueryParams.hasParachute(null),
          stringHasParachute: QueryParams.hasParachute('controller'),
        }),
        {
          byUrlKey: 'QueryParam<search>',
          byPropertyName: 'undefined',
          queryParamsFor: {
            page: 1,
            search: 'abc',
            tags: [],
            filter: { status: 'open' },
          },
          stateFor: {
            value: 'abc',
            serializedValue: 'ABC',
            as: 'q',
            defaultValue: '',
            changed: true,
          },
          plainHasParachute: false,
          undefinedHasParachute: false,
          nullHasParachute: false,
          stringHasParachute: false,
        },
      );
      assert.throws(
        () => QueryParams.metaFor(plain),
        /is not set up with ember-parachute/,
      );
      assert.throws(
        () => QueryParams.resetParamsFor(plain),
        /is not set up with ember-parachute/,
      );
    });

    test('mixInto(Base): the Mixin, typed, on a native class', function (assert) {
      const queryParams = definitions();

      class Typed extends queryParams.mixInto(Controller) {
        get doubled() {
          // typed: `page` is a number here
          return this.page * 2;
        }
      }

      const controller = controllerFor(this.owner, Typed) as Typed;

      set(controller, 'page', 3);

      assert.deepEqual(
        snapshot({
          doubled: controller.doubled,
          all: controller.allQueryParams,
          isController: controller instanceof Controller,
        }),
        {
          doubled: 6,
          all: { page: 3, search: '', tags: [], filter: { status: 'open' } },
          isController: true,
        },
      );
    });

    test('@withParachute: the hooks without any query param', function (assert) {
      @withParachute
      class Decorated extends Controller {}

      const controller = controllerFor(this.owner, Decorated);

      assert.deepEqual(
        snapshot({
          hasParachute: QueryParams.hasParachute(controller),
          queryParams: controller.queryParams,
          all: controller.allQueryParams,
          state: controller.queryParamsState,
          subclass: controller instanceof Decorated,
          name: Decorated.name,
        }),
        {
          hasParachute: true,
          queryParams: [{}],
          all: {},
          state: {},
          subclass: true,
          name: 'Decorated',
        },
      );
    });

    test('a subclass with a second set: query params concatenate, the meta is the latest set', function (assert) {
      // QUIRK (as 1.x): Ember concatenates both query param maps, so every key
      // still binds to the address, but the parachute meta is the subclass's
      // set only: the base set's keys drop out of allQueryParams,
      // resetQueryParams, the events and the (de)serialization hooks. Extend
      // the set instead (`base.extend({...})`), or use @queryParam fields,
      // which merge.
      const Base = withQP(definitions());
      const second = new QueryParams({
        extra: { defaultValue: 'e' },
        page: { defaultValue: 2 },
      });
      const Child =
        style === 'Mixin' ? Base.extend(second.Mixin) : second.mixInto(Base);
      const controller = controllerFor(this.owner, Child);

      assert.deepEqual(
        snapshot({
          controllerQueryParams: controller.queryParams,
          metaKeys: Object.keys(QueryParams.metaFor(controller).queryParams),
          values: {
            page: controller.page,
            extra: controller.extra,
            search: controller.search,
          },
          all: controller.allQueryParams,
        }),
        {
          controllerQueryParams: [
            {
              page: { as: 'page', scope: '<undefined>' },
              search: { as: 'q', scope: '<undefined>' },
              tags: { as: 'tags', scope: 'controller' },
              filter: { as: 'filter', scope: '<undefined>' },
            },
            {
              extra: { as: 'extra', scope: '<undefined>' },
              page: { as: 'page', scope: '<undefined>' },
            },
          ],
          metaKeys: ['extra', 'page'],
          values: { page: 2, extra: 'e', search: '' },
          all: { extra: 'e', page: 2 },
        },
      );
    });

    test('values set on the class body win over the defaults', function (assert) {
      class Overriding extends withQP(definitions()) {
        page = 3;
      }

      const controller = controllerFor(this.owner, Overriding);

      assert.deepEqual(
        snapshot({
          page: controller.page,
          state: controller.queryParamsState.page,
        }),
        {
          page: 3,
          state: {
            value: 3,
            serializedValue: 3,
            as: 'page',
            defaultValue: 1,
            changed: true,
          },
        },
      );
    });

    module(
      'serialize() / deserialize(): addresses without a controller',
      function () {
        test('serialize: by name in the address, defaults left out', function (assert) {
          const qp = definitions();

          assert.deepEqual(
            snapshot({
              some: qp.serialize({
                search: 'Pumps',
                page: 1,
                tags: ['a', 'b'],
              }),
              keepDefaults: qp.serialize(
                { search: '', page: 1 },
                { keepDefaults: true },
              ),
              unknownKeysIgnored: qp.serialize({ nope: 1 } as never),
              nothing: qp.serialize({}),
            }),
            {
              // search through its serialize, tags as Ember would write a list
              some: { q: 'PUMPS', tags: '["a","b"]' },
              keepDefaults: { q: '', page: '1' },
              unknownKeysIgnored: {},
              nothing: {},
            },
          );
        });

        test('serialize writes as Ember would, by the type of the default', function (assert) {
          const qp = new QueryParams({
            count: { defaultValue: 0 },
            flag: { defaultValue: false },
            list: { defaultValue: [] as unknown[] },
            text: { defaultValue: '' },
            blank: { defaultValue: 'x' as string | null },
            object: { defaultValue: {} as Record<string, unknown> },
          });

          assert.deepEqual(
            snapshot(
              qp.serialize({
                count: 3,
                flag: true,
                list: [1, 'a'],
                text: 'hi',
                blank: null,
                // QUIRK (Ember's own): an object without `serialize`
                object: { a: 1 },
              }),
            ),
            {
              count: '3',
              flag: 'true',
              list: '[1,"a"]',
              text: 'hi',
              blank: null,
              object: '[object Object]',
            },
          );
        });

        test('deserialize: every value, defaults for what is missing', function (assert) {
          const qp = definitions();

          assert.deepEqual(
            snapshot({
              byUrlKey: qp.deserialize({ q: 'PUMPS', page: '3' }),
              byPropertyName: qp.deserialize({ search: 'VALVES' }),
              urlKeyWins: qp.deserialize({ q: 'A', search: 'B' }),
              lists: qp.deserialize({ tags: '["x"]' }),
              nothing: qp.deserialize(),
            }),
            {
              byUrlKey: {
                page: 3,
                search: 'pumps',
                tags: [],
                filter: { status: 'open' },
              },
              byPropertyName: {
                page: 1,
                search: 'valves',
                tags: [],
                filter: { status: 'open' },
              },
              urlKeyWins: {
                page: 1,
                search: 'a',
                tags: [],
                filter: { status: 'open' },
              },
              lists: {
                page: 1,
                search: '',
                tags: ['x'],
                filter: { status: 'open' },
              },
              nothing: {
                page: 1,
                search: '',
                tags: [],
                filter: { status: 'open' },
              },
            },
          );
        });

        test('deserialize reads as Ember would, and leaves typed values alone', function (assert) {
          const qp = new QueryParams({
            count: { defaultValue: 0 },
            flag: { defaultValue: false },
            list: { defaultValue: [] },
          });

          assert.deepEqual(
            snapshot({
              strings: qp.deserialize({
                count: '4',
                flag: 'true',
                list: '[1]',
              }),
              typed: qp.deserialize({ count: 4, flag: true, list: [1] }),
            }),
            {
              strings: { count: 4, flag: true, list: [1] },
              typed: { count: 4, flag: true, list: [1] },
            },
          );
        });

        test('serialize then deserialize gives the values back', function (assert) {
          const qp = definitions();
          const values = {
            page: 2,
            search: 'pumps',
            tags: ['a'],
            filter: { status: 'open' },
          };

          assert.deepEqual(qp.deserialize(qp.serialize(values)), values);
        });
      },
    );
  });
}
