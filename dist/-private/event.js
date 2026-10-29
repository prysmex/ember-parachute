import { config } from './config.js';
import { emberDeserialize } from './ember-values.js';
import { metaFor, stateFor, queryParamsFor } from './state.js';

/**
 * What the `setup`, `queryParamsDidChange` and `reset` hooks receive.
 *
 * - `changed`: the query params this transition changed, by property name,
 *   deserialized. (On `queryParamsDidChange`, a key going back to its
 *   default holds the value it had. On `setup`, it is `changes`.)
 * - `changes`: every query param that differs from its default now.
 * - `queryParams`: every query param's current value.
 * - `shouldRefresh`: a changed key has `refresh: true` (always true on
 *   `setup`, false on `reset`).
 */
class ParachuteEvent {
  /** The route the event was fired from */
  routeName;
  changed;
  changes;
  queryParams;
  shouldRefresh;

  /**
   * @param routeName the route firing it
   * @param controller its controller
   * @param changed what the router says changed, by name in the address, as
   *   the router keeps it (serialized)
   */
  constructor(routeName, controller, changed = {}) {
    const {
      queryParams,
      queryParamsArray
    } = metaFor(controller);
    const state = stateFor(controller);
    const changedKeys = Object.keys(changed);
    const changedParams = {};
    const changes = {};
    for (const qp of queryParamsArray) {
      if (changedKeys.includes(qp.as)) {
        const value = config.readValue(changed[qp.as]);

        // as the route read it into the controller
        changedParams[qp.key] = typeof qp.deserialize === 'function' ? qp.deserialize(value, controller) : emberDeserialize(value, qp.defaultValue);
      }
    }
    for (const key of Object.keys(state)) {
      if (state[key].changed) {
        changes[key] = state[key].value;
      }
    }
    this.routeName = routeName;
    this.changed = changedParams;
    this.queryParams = queryParamsFor(controller);
    this.shouldRefresh = Object.keys(changedParams).some(key => queryParams[key].refresh);
    this.changes = changes;
  }
}

export { ParachuteEvent as default };
//# sourceMappingURL=event.js.map
