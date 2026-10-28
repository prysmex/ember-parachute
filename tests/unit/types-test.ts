import Controller from '@ember/controller';
import { module, test } from 'qunit';

import QueryParams, {
  addParachuteListener,
  queryParamsWithDefaults,
  type ParachuteEvent,
  type QueryParamsState,
  type QueryParamValues,
} from '#src/index.ts';
import { integer, list, oneOf } from '#src/adapters.ts';

// The public types, checked by `pnpm lint:types` (ember-tsc): a wrong one
// fails the type check, each @ts-expect-error says what must not compile.
// At run time, nothing to see.

const expectType = <T>(value: T) => value;

const queryParams = new QueryParams({
  page: { defaultValue: 1, ...integer(1) },
  search: { as: 'q', defaultValue: '' },
  tags: { defaultValue: [] as string[], ...list() },
  sort: {
    defaultValue: 'name' as 'name' | 'date',
    ...oneOf(['name', 'date'], 'name'),
  },
});

class TypedController extends queryParams.mixInto(Controller) {
  setup(event: ParachuteEvent<QueryParamValues<typeof queryParams>>) {
    expectType<number | undefined>(event.changed.page);
    expectType<'name' | 'date'>(event.queryParams.sort);
    expectType<boolean>(event.shouldRefresh);
  }

  check() {
    expectType<number>(this.page);
    expectType<string>(this.search);
    expectType<string[]>(this.tags);
    expectType<'name' | 'date'>(this.sort);
    expectType<number>(this.allQueryParams.page);
    expectType<QueryParamsState<{ page: number }>['page']['changed']>(
      this.queryParamsState.page.changed,
    );

    this.resetQueryParams(['page', 'search']);
    // @ts-expect-error not one of its query params
    this.resetQueryParams(['nope']);

    this.setDefaultQueryParamValue('page', 2);
    // @ts-expect-error a page is a number
    this.setDefaultQueryParamValue('page', 'two');
  }
}

function values() {
  expectType<Record<string, unknown>>(queryParams.serialize({ page: 2 }));
  expectType<Record<string, unknown>>(queryParams.forLink({ search: 'x' }));
  expectType<number>(queryParams.deserialize({ page: '2' }).page);

  // @ts-expect-error a page is a number
  queryParams.serialize({ page: 'two' });

  const extended = queryParams.extend<{ extra: boolean }>({
    extra: { defaultValue: false },
  });

  expectType<boolean>(extended.deserialize().extra);
  expectType<number>(extended.deserialize().page);
}

function listeners(controller: TypedController) {
  const stop = addParachuteListener<{ page: number }, 'reset'>(
    controller,
    'reset',
    (event, isExiting) => {
      expectType<boolean>(isExiting);
      expectType<number>(event.queryParams.page);
    },
  );

  expectType<() => void>(stop);
}

function defaults() {
  const appQueryParams = queryParamsWithDefaults({
    refresh: true,
    replace: true,
  });

  // @ts-expect-error defaults are for options every definition shares
  queryParamsWithDefaults({ defaultValue: 1 });

  return appQueryParams<{ page: number }>({ page: { defaultValue: 1 } });
}

module('Unit | types', function () {
  test('are checked by lint:types', function (assert) {
    assert.ok([TypedController, values, listeners, defaults]);
  });
});
