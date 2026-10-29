import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';
import { get } from '@ember/object';
import { g, i } from 'decorator-transforms/runtime-esm';

/**
 * One query param definition, normalized: the controller property `key`,
 * read from and written to the address as `as`.
 */
class QueryParam {
  key;
  as;
  scope;
  // tracked: setDefaultQueryParamValue updates queryParamsState
  static {
    g(this.prototype, "defaultValue", [tracked]);
  }
  #defaultValue = (i(this, "defaultValue"), void 0);
  refresh;
  replace;
  serialize;
  deserialize;
  constructor(key, options = {}) {
    assert(`[ember-parachute] You must specify a key to the QueryParam Class`, typeof key === 'string' && key.length > 0);
    this.key = key;
    this.as = options.as || key;
    this.scope = options.scope;
    this.defaultValue = options.defaultValue;
    this.refresh = Boolean(options.refresh);
    this.replace = Boolean(options.replace);
    // called as qp.serialize(...): `this` is the definition, as in 1.x
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.serialize = options.serialize;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.deserialize = options.deserialize;
  }

  /** The controller's current value. */
  value(controller) {
    return get(controller, this.key);
  }

  /** The controller's current value, through `serialize` when it has one. */
  serializedValue(controller) {
    const value = this.value(controller);
    return typeof this.serialize === 'function' ? this.serialize(value, controller) : value;
  }
  toString() {
    return `QueryParam<${this.key}>`;
  }
}

export { QueryParam as default };
//# sourceMappingURL=query-param.js.map
