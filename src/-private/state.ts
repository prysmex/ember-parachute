import { assert } from '@ember/debug';
import { get, set, setProperties } from '@ember/object';

import ParachuteMeta, { HAS_PARACHUTE, PARACHUTE_META } from './meta.ts';

/** Where one query param stands on a controller. */
export interface QueryParamState<V = unknown> {
  value: V;
  serializedValue: unknown;
  as: string;
  defaultValue: V;
  /** Differs from its default (compared as JSON, so key order counts). */
  changed: boolean;
}

export type QueryParamsState<T = Record<string, unknown>> = {
  [K in keyof T]: QueryParamState<T[K]>;
};

export function hasParachute(controller: unknown): boolean {
  return Boolean(
    controller &&
    typeof controller === 'object' &&
    get(controller, HAS_PARACHUTE),
  );
}

export function metaFor(controller: object): ParachuteMeta {
  assert(
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- Ember objects say who they are
    `[ember-parachute] The controller '${String(controller)}' is not set up with ember-parachute.`,
    hasParachute(controller),
  );

  return get(controller, PARACHUTE_META) as ParachuteMeta;
}

/** Equal as the address would see them: compared as JSON. */
export function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function queryParamsFor(controller: object): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const qp of metaFor(controller).queryParamsArray) {
    values[qp.key] = qp.value(controller);
  }

  return values;
}

export function stateFor(controller: object): QueryParamsState {
  assert(
    '[ember-parachute] Cannot construct query params state object without a controller',
    Boolean(controller),
  );

  const state: QueryParamsState = {};

  for (const qp of metaFor(controller).queryParamsArray) {
    const value: unknown = qp.value(controller);

    state[qp.key] = {
      value,
      serializedValue: qp.serializedValue(controller),
      as: qp.as,
      defaultValue: qp.defaultValue,
      changed: !isSameValue(value, qp.defaultValue),
    };
  }

  return state;
}

/**
 * Back to the defaults: every query param, or the given keys. The default
 * itself is set, not a copy.
 */
export function resetParamsFor(controller: object, params: string[] = []) {
  const defaults: Record<string, unknown> = {};

  for (const qp of metaFor(controller).queryParamsArray) {
    if (params.length === 0 || params.includes(qp.key)) {
      defaults[qp.key] = qp.defaultValue;
    }
  }

  setProperties(controller, defaults);
}

/** A new default for one query param of one controller. */
export function setDefaultValue(
  controller: object,
  param: string,
  defaultValue: unknown,
) {
  const { queryParams } = metaFor(controller);

  const queryParam = queryParams[param];

  assert(
    `[ember-parachute] The query parameter '${param}' does not exist.`,
    queryParam,
  );

  // without assertions (production): nothing to set
  if (queryParam) {
    set(queryParam, 'defaultValue', defaultValue);
  }
}
