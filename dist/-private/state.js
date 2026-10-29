import { assert } from '@ember/debug';
import { get, setProperties, set } from '@ember/object';
import { PARACHUTE_META, HAS_PARACHUTE } from './meta.js';

/** Where one query param stands on a controller. */

function hasParachute(controller) {
  return Boolean(controller && typeof controller === 'object' && get(controller, HAS_PARACHUTE));
}
function metaFor(controller) {
  assert(
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- Ember objects say who they are
  `[ember-parachute] The controller '${String(controller)}' is not set up with ember-parachute.`, hasParachute(controller));
  return get(controller, PARACHUTE_META);
}

/** Equal as the address would see them: compared as JSON. */
function isSameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function queryParamsFor(controller) {
  const values = {};
  for (const qp of metaFor(controller).queryParamsArray) {
    values[qp.key] = qp.value(controller);
  }
  return values;
}
function stateFor(controller) {
  assert('[ember-parachute] Cannot construct query params state object without a controller', Boolean(controller));
  const state = {};
  for (const qp of metaFor(controller).queryParamsArray) {
    const value = qp.value(controller);
    state[qp.key] = {
      value,
      serializedValue: qp.serializedValue(controller),
      as: qp.as,
      defaultValue: qp.defaultValue,
      changed: !isSameValue(value, qp.defaultValue)
    };
  }
  return state;
}

/**
 * Back to the defaults: every query param, or the given keys. The default
 * itself is set, not a copy.
 */
function resetParamsFor(controller, params = []) {
  const defaults = {};
  for (const qp of metaFor(controller).queryParamsArray) {
    if (params.length === 0 || params.includes(qp.key)) {
      defaults[qp.key] = qp.defaultValue;
    }
  }
  setProperties(controller, defaults);
}

/** A new default for one query param of one controller. */
function setDefaultValue(controller, param, defaultValue) {
  const {
    queryParams
  } = metaFor(controller);
  const queryParam = queryParams[param];
  assert(`[ember-parachute] The query parameter '${param}' does not exist.`, queryParam);

  // without assertions (production): nothing to set
  if (queryParam) {
    set(queryParam, 'defaultValue', defaultValue);
  }
}

export { hasParachute, isSameValue, metaFor, queryParamsFor, resetParamsFor, setDefaultValue, stateFor };
//# sourceMappingURL=state.js.map
