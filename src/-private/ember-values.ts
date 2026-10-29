// Ember's typeOf, for the types its router tells apart (@ember/utils'
// typeOf is deprecated from 7.5)
const typeOf = (value: unknown) =>
  Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

/**
 * Ember's own serialization of a query param without `serialize`, by the
 * type of its default value (Router#_serializeQueryParam).
 */
export function emberSerialize(value: unknown, defaultValue: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeOf(defaultValue) === 'array') {
    return JSON.stringify(value);
  }

  return `${value as string}`;
}

/** Ember's own deserialization (Router#_deserializeQueryParam). */
export function emberDeserialize(
  value: unknown,
  defaultValue: unknown,
): unknown {
  if (value === null || value === undefined || typeof value !== 'string') {
    return value;
  }

  switch (typeOf(defaultValue)) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return Number(value).valueOf();
    case 'array':
      return JSON.parse(value) as unknown;
    default:
      return value;
  }
}
