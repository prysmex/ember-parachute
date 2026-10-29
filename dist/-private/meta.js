import QueryParam from './query-param.js';

// What a parachute controller exposes. Plain strings, not symbols: they are
// read with get() like any property, and two copies of this package (or the
// app copy it replaces) still recognize each other's controllers.
const HAS_PARACHUTE = '__has_parachute__';
const PARACHUTE_META = '__parachute_meta__';

/**
 * A definition set, in the shapes each side needs: the controller's
 * `queryParams` map, the route's, and the default values.
 */
class ParachuteMeta {
  queryParams;
  queryParamsArray;
  qpMapForController;
  qpMapForRoute;
  defaultValues;
  constructor(queryParams = {}) {
    this.queryParams = {};
    for (const key of Object.keys(queryParams)) {
      this.queryParams[key] = new QueryParam(key, queryParams[key]);
    }
    this.queryParamsArray = Object.values(this.queryParams);
    this.qpMapForController = {};
    this.qpMapForRoute = {};
    this.defaultValues = {};
    for (const {
      key,
      as,
      scope,
      replace,
      defaultValue
    } of this.queryParamsArray) {
      this.qpMapForController[key] = {
        as,
        scope
      };
      this.qpMapForRoute[key] = {
        replace
      };
      this.defaultValues[key] = defaultValue;
    }
  }
}

export { HAS_PARACHUTE, PARACHUTE_META, ParachuteMeta as default };
//# sourceMappingURL=meta.js.map
