/** A value as JSON, on one line or indented */
export const json = (value: unknown, indent = false) =>
  JSON.stringify(value, null, indent ? 2 : undefined) ?? 'undefined';

export const eq = (a: unknown, b: unknown) => a === b;

export const includes = (list: readonly unknown[] | undefined, item: unknown) =>
  (list ?? []).includes(item);
