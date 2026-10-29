/**
 * Ready-made `serialize` / `deserialize` pairs, to spread into a
 * definition:
 *
 * ```ts
 * new QueryParams({
 *   page: { defaultValue: 1, ...integer() },
 *   tags: { defaultValue: [], ...list() },
 *   sort: { defaultValue: 'name', ...oneOf(['name', 'date'], 'name') },
 * });
 * ```
 *
 * Each one reads what it wrote, and reads values that are already typed
 * too (from a router that keeps them typed, like ember-rison-qs).
 * Something it can't read is its `fallback`.
 *
 * And each `serialize` takes its own output too, giving it back as it is:
 * Ember runs `serialize` on what a link gives it, which may already be
 * serialized (see `QueryParams#forLink`).
 */

/** A `serialize` / `deserialize` pair: `T` in the controller, `S` in the address. */

const isBlank = value => value === null || value === undefined || value === '';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
const toNumber = value => isBlank(value) || typeof value === 'boolean' ? NaN : Number(value);

/**
 * Whole numbers. Anything that isn't one reads as `fallback` (`null`
 * unless given).
 */
function integer(fallback = null) {
  return {
    serialize(value) {
      const number = toNumber(value);
      return Number.isFinite(number) ? Math.trunc(number) : null;
    },
    deserialize(value) {
      const number = toNumber(value);
      return Number.isInteger(number) ? number : fallback;
    }
  };
}

/** Any finite number. Anything else reads as `fallback`. */
function number(fallback = null) {
  return {
    serialize(value) {
      const number = toNumber(value);
      return Number.isFinite(number) ? number : null;
    },
    deserialize(value) {
      const number = toNumber(value);
      return Number.isFinite(number) ? number : fallback;
    }
  };
}

/**
 * `true` / `false` in the address (`1`, `0`, `yes`, `no` read too). For a
 * flag whose default isn't a boolean (Ember reads those already).
 */
function boolean(fallback = false) {
  const TRUE = ['true', '1', 'yes', 'on'];
  const FALSE = ['false', '0', 'no', 'off'];
  const read = value => {
    if (typeof value === 'boolean') {
      return value;
    }
    const text = String(value).toLowerCase();
    if (TRUE.includes(text)) {
      return true;
    }
    return FALSE.includes(text) ? false : undefined;
  };
  return {
    serialize(value) {
      const flag = read(value);
      return flag === undefined ? null : String(flag);
    },
    deserialize(value) {
      const flag = read(value);
      return flag === undefined ? fallback : flag;
    }
  };
}

/**
 * Objects and nested lists, as JSON in the address. Anything that doesn't
 * parse (e.g. "[object Object]", from a link built without it) reads as
 * `fallback`.
 *
 * A string is taken as JSON already written: it is for objects and lists,
 * not for strings.
 */
function json(fallback = null) {
  return {
    serialize(value) {
      if (value === null || value === undefined) {
        return null;
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    },
    deserialize(value) {
      if (typeof value !== 'string') {
        return isBlank(value) ? fallback : value;
      }
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
  };
}

/**
 * A list, as `a,b,c` (shorter than Ember's JSON for lists): an empty list
 * is an empty value. `item` reads and writes each item (strings as they are
 * by default).
 */
function list({
  separator = ',',
  item
} = {}) {
  return {
    serialize(values) {
      if (typeof values === 'string') {
        return values;
      }

      // an item its adapter can't write is left out
      return (values ?? []).map(value => item ? item.serialize(value) : value).filter(value => value !== null && value !== undefined).map(String).join(separator);
    },
    deserialize(value) {
      const items = Array.isArray(value) ? value : isBlank(value) ? [] :
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      String(value).split(separator);
      return items.map(value => item ? item.deserialize(value) : value);
    }
  };
}

/**
 * One of a fixed set of values (a sort, a tab). Anything else reads as
 * `fallback`: a hand-edited address can't put the controller in a state
 * it doesn't know.
 */
function oneOf(values, fallback) {
  const isOne = value => values.includes(value);
  return {
    serialize: value => isOne(value) ? value : null,
    deserialize: value => isOne(value) ? value : fallback
  };
}

/**
 * A `Date`: as `YYYY-MM-DD` (`{ time: false }`, the default) or a full ISO
 * time, in UTC. Only ISO dates read (`2026-10-28`, `2026-10-28T15:30:00Z`):
 * anything else is `fallback`.
 */
function date({
  time = false,
  fallback = null
} = {}) {
  return {
    serialize(value) {
      const parsed = value instanceof Date ? value : typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : undefined;
      if (!parsed || Number.isNaN(parsed.valueOf())) {
        return null;
      }
      const iso = parsed.toISOString();
      return time ? iso : iso.slice(0, 10);
    },
    deserialize(value) {
      if (value instanceof Date) {
        return value;
      }
      if (typeof value !== 'string' || !ISO_DATE.test(value)) {
        return fallback;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.valueOf()) ? fallback : parsed;
    }
  };
}

export { boolean, date, integer, json, list, number, oneOf };
//# sourceMappingURL=adapters.js.map
