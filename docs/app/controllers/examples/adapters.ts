import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { action } from '@ember/object';

import {
  boolean,
  date,
  integer,
  json,
  list,
  number,
  oneOf,
  type Adapter,
} from 'ember-parachute/adapters';

const ADAPTERS: Array<{ name: string; adapter: Adapter<any> }> = [
  { name: 'integer()', adapter: integer() },
  { name: 'integer(1)', adapter: integer(1) },
  { name: 'number()', adapter: number() },
  { name: 'boolean()', adapter: boolean() },
  { name: 'json({})', adapter: json({}) },
  { name: 'list()', adapter: list() },
  { name: 'list({ item: integer() })', adapter: list({ item: integer() }) },
  {
    name: "oneOf(['name', 'price'], 'name')",
    adapter: oneOf(['name', 'price'], 'name'),
  },
  { name: 'date()', adapter: date() },
  { name: 'date({ time: true })', adapter: date({ time: true }) },
];

const show = (value: unknown) =>
  value instanceof Date
    ? `Date(${value.toISOString()})`
    : JSON.stringify(value);

export const SAMPLES = [
  '42',
  '3.7',
  'yes',
  'nope',
  '{"status":"open"}',
  '[object Object]',
  'a,b,3',
  'price',
  '2026-10-28',
  '',
];

// What each adapter reads from an address value, and writes back
export default class AdaptersController extends Controller {
  @tracked input = '42';

  get rows() {
    return ADAPTERS.map(({ name, adapter }) => {
      const read = adapter.deserialize(this.input);
      const written = adapter.serialize(read);

      return {
        name,
        read: show(read),
        written: show(written),
        // links run serialize again on its own output
        idempotent: show(adapter.serialize(written)) === show(written),
      };
    });
  }

  @action setInput(event: Event) {
    this.input = (event.target as HTMLInputElement).value;
  }

  @action pick(sample: string) {
    this.input = sample;
  }
}
