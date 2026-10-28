// Legacy decorators hand descriptors around untyped (TypeScript wants a
// field decorator to return `any`)
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';

import {
  declareQueryParam,
  decoratedQueryParamsOf,
} from './-private/decorated.ts';
import { parachuteClass } from './-private/controller.ts';

import type { QueryParamOption } from './-private/query-param.ts';

// A field as legacy decorators (Ember's, decorator-transforms') describe it
interface FieldDescriptor {
  configurable?: boolean;
  enumerable?: boolean;
  writable?: boolean;
  initializer?: (() => unknown) | null;
}

type FieldDecorator = (
  target: object,
  key: string,
  descriptor?: FieldDescriptor,
) => any;

/** Options of a `@queryParam` field: its value is the default. */
export type QueryParamFieldOptions<T = any> = Omit<
  QueryParamOption<T>,
  'defaultValue'
> & {
  /** For a field without an initializer. */
  defaultValue?: T;
};

function decorate(
  options: QueryParamFieldOptions,
  target: object,
  key: string,
  descriptor: FieldDescriptor = {},
) {
  const { initializer } = descriptor;

  assert(
    `[ember-parachute] @queryParam '${key}' has both a value and a defaultValue: give it one or the other.`,
    !(initializer && 'defaultValue' in options),
  );

  const defaultValue = initializer ? initializer() : options.defaultValue;

  declareQueryParam(target, key, {
    options: { ...options, defaultValue },
  });

  // tracked, so `this.page = 2` is a query param change like set() is
  return (tracked as unknown as FieldDecorator)(target, key, {
    ...descriptor,
    initializer: initializer ?? (() => defaultValue),
  });
}

/**
 * A query param, declared on its controller field: the field's value is its
 * default, and the field is tracked. The class needs `@withParachute`.
 *
 * ```ts
 * @withParachute
 * class SearchController extends Controller {
 *   @queryParam({ as: 'q', refresh: true }) search = '';
 *   @queryParam({ ...integer(), refresh: true }) page = 1;
 *   @queryParam tags: string[] = [];
 * }
 * ```
 */
export function queryParam(options?: QueryParamFieldOptions): FieldDecorator;
export function queryParam(
  target: object,
  key: string,
  descriptor?: FieldDescriptor,
): any;
export function queryParam(
  ...args: [QueryParamFieldOptions?] | [object, string, FieldDescriptor?]
): any {
  // bare `@queryParam`
  if (typeof args[1] === 'string') {
    const [target, key, descriptor] = args as [
      object,
      string,
      FieldDescriptor?,
    ];

    return decorate({}, target, key, descriptor);
  }

  const options = (args[0] ?? {}) as QueryParamFieldOptions;

  return (target: object, key: string, descriptor?: FieldDescriptor) =>
    decorate(options, target, key, descriptor);
}

type ControllerClass = abstract new (...args: any[]) => object;

/**
 * Sets a controller class up with ember-parachute: its `@queryParam`
 * fields (its parents' included), the `setup` / `queryParamsDidChange` /
 * `reset` hooks, `allQueryParams`, `queryParamsState`, `resetQueryParams`.
 * With no `@queryParam` field, the hooks alone.
 */
export function withParachute<T extends ControllerClass>(Klass: T): T {
  const fields = decoratedQueryParamsOf(Klass.prototype as object);
  const definitions: Record<string, QueryParamOption> = {};

  for (const [key, { options }] of Object.entries(fields)) {
    definitions[key] = options;
  }

  // the fields hold the values (tracked): no defaults on the prototype
  const Decorated = parachuteClass(Klass, definitions, false);

  Object.defineProperty(Decorated, 'name', { value: Klass.name });

  return Decorated;
}
