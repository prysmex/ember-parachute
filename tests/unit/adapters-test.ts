import { module, test } from 'qunit';

import {
  boolean,
  date,
  integer,
  json,
  list,
  number,
  oneOf,
  type Adapter,
} from '#src/adapters.ts';

import { snapshot } from '../helpers/index.ts';

// Each adapter, both ways: what it writes, what it reads (strings from the
// address, typed values from a typed router, garbage from a hand-edited
// address), and that it takes its own output back (links run serialize
// twice).
module('Unit | adapters', function () {
  const read = (adapter: Adapter<any>, values: unknown[]) =>
    snapshot(values.map((value) => adapter.deserialize(value)));
  const write = (adapter: Adapter<any>, values: unknown[]) =>
    snapshot(values.map((value) => adapter.serialize(value)));
  const isIdempotent = (adapter: Adapter<any>, values: unknown[]) =>
    values.every(
      (value) =>
        JSON.stringify(adapter.serialize(adapter.serialize(value))) ===
        JSON.stringify(adapter.serialize(value)),
    );

  test('integer', function (assert) {
    assert.deepEqual(write(integer(), [3, 3.9, -2, '4', null, NaN, 'x']), [
      3,
      3,
      -2,
      4,
      null,
      null,
      null,
    ]);
    assert.deepEqual(
      read(integer(), ['3', 3, '-2', '3.5', '', null, undefined, 'x', true]),
      [3, 3, -2, null, null, null, null, null, null],
    );
    assert.deepEqual(read(integer(1), ['x', '']), [1, 1], 'a fallback');
    assert.true(isIdempotent(integer(), [3, 3.9, '4', null]));
  });

  test('number', function (assert) {
    assert.deepEqual(write(number(), [1.5, '2.25', Infinity, null]), [
      1.5,
      2.25,
      null,
      null,
    ]);
    assert.deepEqual(read(number(), ['1.5', 2, '1e3', 'x', '']), [
      1.5,
      2,
      1000,
      null,
      null,
    ]);
    assert.deepEqual(read(number(0), ['x']), [0]);
    assert.true(isIdempotent(number(), [1.5, '2', null]));
  });

  test('boolean', function (assert) {
    assert.deepEqual(write(boolean(), [true, false, 'yes', 'nope', null]), [
      'true',
      'false',
      'true',
      null,
      null,
    ]);
    assert.deepEqual(
      read(boolean(), [
        'true',
        'TRUE',
        '1',
        'yes',
        'on',
        true,
        'false',
        '0',
        'no',
        'off',
        false,
      ]),
      [true, true, true, true, true, true, false, false, false, false, false],
    );
    assert.deepEqual(read(boolean(), ['maybe', '', null]), [
      false,
      false,
      false,
    ]);
    assert.deepEqual(read(boolean(null), ['maybe']), [null], 'a fallback');
    assert.true(isIdempotent(boolean(), [true, false, 'yes']));
  });

  test('json', function (assert) {
    assert.deepEqual(
      write(json(), [{ a: [1, { b: 2 }] }, [1, 2], null, undefined]),
      ['{"a":[1,{"b":2}]}', '[1,2]', null, null],
    );
    assert.deepEqual(
      read(json(), [
        '{"a":1}',
        '[1]',
        { typed: true },
        [2],
        '[object Object]',
        '',
        null,
      ]),
      [{ a: 1 }, [1], { typed: true }, [2], null, null, null],
    );
    assert.deepEqual(read(json({}), ['[object Object]']), [{}], 'a fallback');
    assert.true(isIdempotent(json(), [{ a: 1 }, [1], null]));
  });

  test('list', function (assert) {
    assert.deepEqual(write(list(), [['a', 'b'], [], 'a,b', null]), [
      'a,b',
      '',
      'a,b',
      '',
    ]);
    assert.deepEqual(read(list(), ['a,b', '', null, ['typed']]), [
      ['a', 'b'],
      [],
      [],
      ['typed'],
    ]);

    const ids = list({ separator: '-', item: integer() });

    assert.deepEqual(write(ids, [[1, 2]]), ['1-2']);
    assert.deepEqual(read(ids, ['1-2-x', [3, '4']]), [
      [1, 2, null],
      [3, 4],
    ]);
    assert.true(isIdempotent(list(), [['a', 'b'], []]));
  });

  test('oneOf', function (assert) {
    const sort = oneOf(['name', 'date'], 'name');

    assert.deepEqual(write(sort, ['date', 'nope']), ['date', null]);
    assert.deepEqual(read(sort, ['date', 'name', 'DROP TABLE', '', null]), [
      'date',
      'name',
      'name',
      'name',
      'name',
    ]);
    assert.true(isIdempotent(sort, ['date']));
  });

  test('date', function (assert) {
    const day = new Date('2026-10-28T15:30:00.000Z');

    assert.deepEqual(
      write(date(), [day, '2026-10-28', new Date('nope'), 'nope', null]),
      ['2026-10-28', '2026-10-28', null, null, null],
    );
    assert.deepEqual(write(date({ time: true }), [day]), [
      '2026-10-28T15:30:00.000Z',
    ]);
    assert.strictEqual(
      (date().deserialize('2026-10-28') as Date).toISOString(),
      '2026-10-28T00:00:00.000Z',
    );
    assert.strictEqual(date().deserialize(day), day, 'a Date as it is');
    assert.deepEqual(read(date(), ['nope', '', null]), [null, null, null]);
    assert.deepEqual(
      snapshot(date({ fallback: 'none' }).deserialize('nope')),
      'none',
    );
    assert.true(isIdempotent(date(), [day, '2026-10-28']));
  });

  test('spread into a definition', function (assert) {
    const definition = { defaultValue: 1, refresh: true, ...integer(1) };

    assert.deepEqual(Object.keys(definition), [
      'defaultValue',
      'refresh',
      'serialize',
      'deserialize',
    ]);
  });
});
