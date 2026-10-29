import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';
import { decoratedQueryParamsOf, declareQueryParam } from './-private/decorated.js';
import { parachuteClass } from './-private/controller.js';

// Legacy decorators hand descriptors around untyped (TypeScript wants a
// field decorator to return `any`)
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */

// A field as legacy decorators (Ember's, decorator-transforms') describe it

/** Options of a `@queryParam` field: its value is the default. */

function decorate(options, target, key, descriptor = {}) {
  const {
    initializer
  } = descriptor;
  assert(`[ember-parachute] @queryParam '${key}' has both a value and a defaultValue: give it one or the other.`, !(initializer && 'defaultValue' in options));
  const defaultValue = initializer ? initializer() : options.defaultValue;
  declareQueryParam(target, key, {
    options: {
      ...options,
      defaultValue
    }
  });

  // tracked, so `this.page = 2` is a query param change like set() is
  return tracked(target, key, {
    ...descriptor,
    initializer: initializer ?? (() => defaultValue)
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

function queryParam(...args) {
  // bare `@queryParam`
  if (typeof args[1] === 'string') {
    const [target, key, descriptor] = args;
    return decorate({}, target, key, descriptor);
  }
  const options = args[0] ?? {};
  return (target, key, descriptor) => decorate(options, target, key, descriptor);
}
/**
 * Sets a controller class up with ember-parachute: its `@queryParam`
 * fields (its parents' included), the `setup` / `queryParamsDidChange` /
 * `reset` hooks, `allQueryParams`, `queryParamsState`, `resetQueryParams`.
 * With no `@queryParam` field, the hooks alone.
 */
function withParachute(Klass) {
  const fields = decoratedQueryParamsOf(Klass.prototype);
  const definitions = {};
  for (const [key, {
    options
  }] of Object.entries(fields)) {
    definitions[key] = options;
  }

  // the fields hold the values (tracked): no defaults on the prototype
  const Decorated = parachuteClass(Klass, definitions, false);
  Object.defineProperty(Decorated, 'name', {
    value: Klass.name
  });
  return Decorated;
}

export { queryParam, withParachute };
//# sourceMappingURL=decorators.js.map
