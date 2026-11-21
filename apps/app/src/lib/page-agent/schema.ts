import type { JsonObjectSchema, JsonSchema, PageToolError } from './protocol';

/** Schema builders, so tool files read like a signature: `obj({ date: str({ format: 'date' }) }, ['date'])`. */
export const s = {
  str: (description?: string, extra: Omit<Extract<JsonSchema, { type: 'string' }>, 'type' | 'description'> = {}): JsonSchema => ({ type: 'string', ...(description ? { description } : {}), ...extra }),
  date: (description?: string): JsonSchema => ({ type: 'string', format: 'date', ...(description ? { description } : {}) }),
  enumOf: <T extends string>(values: readonly T[], description?: string): JsonSchema => ({ type: 'string', enum: values, ...(description ? { description } : {}) }),
  int: (description?: string, extra: { minimum?: number; maximum?: number; enum?: readonly number[] } = {}): JsonSchema => ({ type: 'integer', ...(description ? { description } : {}), ...extra }),
  num: (description?: string): JsonSchema => ({ type: 'number', ...(description ? { description } : {}) }),
  bool: (description?: string): JsonSchema => ({ type: 'boolean', ...(description ? { description } : {}) }),
  arr: (items: JsonSchema, description?: string, maxItems?: number): JsonSchema => ({ type: 'array', items, ...(description ? { description } : {}), ...(maxItems ? { maxItems } : {}) }),
  nullable: (x: JsonSchema): JsonSchema => ({ anyOf: [x, { type: 'null' }] }),
  any: (description?: string): JsonSchema => (description ? { description } : {}),
  obj: (properties: Record<string, JsonSchema>, required: readonly string[] = [], description?: string): JsonObjectSchema => ({
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
    ...(description ? { description } : {}),
  }),
};
export const NO_ARGS: JsonObjectSchema = s.obj({});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/**
 * Checks args against a tool's inputSchema (the subset `s` builds): types, enums, required, unknown keys, formats.
 * The hub validates too; this keeps a handler from ever seeing a wrong shape.
 */
export function validateArgs(schema: JsonSchema, value: unknown, path = ''): PageToolError[] {
  const err = (message: string): PageToolError[] => [{ path, code: 'invalid:args', message }];
  if ('anyOf' in schema) {
    const ok = schema.anyOf.some((x) => validateArgs(x, value, path).length === 0);
    return ok ? [] : err(`${path || 'value'} does not match any allowed shape`);
  }
  if (!('type' in schema)) return [];
  switch (schema.type) {
    case 'null':
      return value === null ? [] : err('must be null');
    case 'boolean':
      return typeof value === 'boolean' ? [] : err('must be a boolean');
    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value) || (schema.type === 'integer' && !Number.isInteger(value))) return err(`must be ${schema.type === 'integer' ? 'an integer' : 'a number'}`);
      if (schema.enum && !schema.enum.includes(value)) return err(`must be one of ${schema.enum.join(', ')}`);
      if (schema.minimum !== undefined && value < schema.minimum) return err(`must be ≥ ${schema.minimum}`);
      if (schema.maximum !== undefined && value > schema.maximum) return err(`must be ≤ ${schema.maximum}`);
      return [];
    }
    case 'string': {
      if (typeof value !== 'string') return err('must be a string');
      if (schema.enum && !schema.enum.includes(value)) return err(`must be one of ${schema.enum.join(', ')}`);
      if (schema.format === 'date' && !DATE.test(value)) return err('must be a date YYYY-MM-DD');
      if (schema.format === 'time' && !TIME.test(value)) return err('must be a time HH:mm');
      if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) return err('must be an ISO date-time');
      if (schema.maxLength !== undefined && value.length > schema.maxLength) return err(`must be at most ${schema.maxLength} characters`);
      return [];
    }
    case 'array': {
      if (!Array.isArray(value)) return err('must be an array');
      if (schema.maxItems !== undefined && value.length > schema.maxItems) return err(`must have at most ${schema.maxItems} items`);
      return value.flatMap((v, i) => validateArgs(schema.items, v, `${path}${path ? '.' : ''}${i}`));
    }
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return err('must be an object');
      const o = value as Record<string, unknown>;
      const at = (k: string) => `${path}${path ? '.' : ''}${k}`;
      const missing = (schema.required ?? []).filter((k) => o[k] === undefined).map((k) => ({ path: at(k), code: 'invalid:args', message: `${k} is required` }));
      const rest = Object.entries(o).flatMap(([k, v]) => {
        const p = schema.properties[k];
        if (p) return v === undefined ? [] : validateArgs(p, v, at(k));
        if (schema.additionalProperties === false) return [{ path: at(k), code: 'invalid:args', message: `unknown field ${k}` }];
        return validateArgs(schema.additionalProperties, v, at(k));
      });
      return [...missing, ...rest];
    }
  }
}
