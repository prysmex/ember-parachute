import { computed } from '@ember/object';
import Mixin from '@ember/object/mixin';
import ParachuteMeta, { PARACHUTE_META, HAS_PARACHUTE } from './meta.js';
import { setDefaultValue, resetParamsFor, stateFor, queryParamsFor } from './state.js';

// The Mixin is 1.x's API (`Controller.extend(queryParams.Mixin)`), kept as it
// was; the native class is the rest of this file
/* eslint-disable ember/no-computed-properties-in-native-classes, ember/no-new-mixins */
const asArray = value => value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * `Base`, set up with a definition set, as a native subclass: no mixin, no
 * `extend()`.
 *
 * @param defineDefaults put the default values on the prototype (the
 *   decorators leave them to the class's own fields)
 */
function parachuteClass(Base, definitions, defineDefaults = true) {
  const {
    defaultValues,
    qpMapForController
  } = new ParachuteMeta(definitions);
  // a meta of its own for each controller (and for the prototype, read
  // before the controller exists): defaults can change per controller
  const metas = new WeakMap();
  class Parachute extends Base {
    // the controller side of Ember's query params: concatenated onto the
    // base's, as Ember's `queryParams` is a concatenated property
    queryParams = [...asArray(this.queryParams), qpMapForController];
    get [HAS_PARACHUTE]() {
      return true;
    }
    get [PARACHUTE_META]() {
      let meta = metas.get(this);
      if (!meta) {
        meta = new ParachuteMeta(definitions);
        metas.set(this, meta);
      }
      return meta;
    }
    get allQueryParams() {
      return queryParamsFor(this);
    }
    get queryParamsState() {
      return stateFor(this);
    }
    resetQueryParams(params = []) {
      resetParamsFor(this, params);
    }
    setDefaultQueryParamValue(key, defaultValue) {
      setDefaultValue(this, key, defaultValue);
    }
  }
  if (defineDefaults) {
    // on the prototype, as a mixin would put them: the class's own fields
    // (and its subclasses') win
    for (const [key, value] of Object.entries(defaultValues)) {
      Object.defineProperty(Parachute.prototype, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    }
  }
  return Parachute;
}

/**
 * The same, as an Ember Mixin (`Controller.extend(queryParams.Mixin)`), as
 * ember-parachute 1.x made it. Ember deprecates mixins from 7.4.
 */
function parachuteMixin(definitions) {
  const {
    queryParams,
    defaultValues,
    qpMapForController
  } = new ParachuteMeta(definitions);
  const keys = Object.keys(queryParams);
  return Mixin.create(defaultValues, {
    [HAS_PARACHUTE]: true,
    [PARACHUTE_META]: computed(function () {
      return new ParachuteMeta(definitions);
    }).readOnly(),
    queryParams: qpMapForController,
    allQueryParams: computed(...keys, function () {
      return queryParamsFor(this);
    }).readOnly(),
    queryParamsState: computed(...keys, `${PARACHUTE_META}.queryParamsArray.@each.defaultValue`, function () {
      return stateFor(this);
    }).readOnly(),
    resetQueryParams(params = []) {
      resetParamsFor(this, params);
    },
    setDefaultQueryParamValue(key, defaultValue) {
      setDefaultValue(this, key, defaultValue);
    }
  });
}

export { parachuteClass, parachuteMixin };
//# sourceMappingURL=controller.js.map
