import type { QueryParamOption } from './query-param.ts';

/** A `@queryParam` field: its options, and the field's own initializer. */
export interface DecoratedQueryParam {
  options: QueryParamOption;
  initializer?: () => unknown;
}

// The @queryParam fields each class body declares, by prototype
const declared = new WeakMap<object, Record<string, DecoratedQueryParam>>();

export function declareQueryParam(
  prototype: object,
  key: string,
  field: DecoratedQueryParam,
) {
  const fields = declared.get(prototype) ?? {};

  fields[key] = field;
  declared.set(prototype, fields);
}

/** Every @queryParam field of a class, its parents' first. */
export function decoratedQueryParamsOf(
  prototype: object | null,
): Record<string, DecoratedQueryParam> {
  const chain: object[] = [];

  for (
    let proto = prototype;
    proto;
    proto = Object.getPrototypeOf(proto) as object | null
  ) {
    chain.unshift(proto);
  }

  return Object.assign(
    {},
    ...chain.map((proto) => declared.get(proto) ?? {}),
  ) as Record<string, DecoratedQueryParam>;
}

export function hasDecoratedQueryParams(instance: object | undefined) {
  return Boolean(
    instance &&
    Object.keys(
      decoratedQueryParamsOf(Object.getPrototypeOf(instance) as object),
    ).length,
  );
}
