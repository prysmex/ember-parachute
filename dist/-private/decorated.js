/** A `@queryParam` field: its options, and the field's own initializer. */

// The @queryParam fields each class body declares, by prototype
const declared = new WeakMap();
function declareQueryParam(prototype, key, field) {
  const fields = declared.get(prototype) ?? {};
  fields[key] = field;
  declared.set(prototype, fields);
}

/** Every @queryParam field of a class, its parents' first. */
function decoratedQueryParamsOf(prototype) {
  const chain = [];
  for (let proto = prototype; proto; proto = Object.getPrototypeOf(proto)) {
    chain.unshift(proto);
  }
  return Object.assign({}, ...chain.map(proto => declared.get(proto) ?? {}));
}
function hasDecoratedQueryParams(instance) {
  return Boolean(instance && Object.keys(decoratedQueryParamsOf(Object.getPrototypeOf(instance))).length);
}

export { declareQueryParam, decoratedQueryParamsOf, hasDecoratedQueryParams };
//# sourceMappingURL=decorated.js.map
