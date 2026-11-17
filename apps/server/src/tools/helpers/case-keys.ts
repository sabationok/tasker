export const toSnake = (s: string): string => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export const toCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Deep-maps object keys (arrays and nested objects); values are left as they are. */
export function mapKeys(value: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => mapKeys(v, fn));
  if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), mapKeys(v, fn)]));
  return value;
}

/** `checklist.0.title` (camel) → `checklist.0.title`; `remindAt` → `remind_at`. */
export const snakePath = (path: string): string => path.split('.').map(toSnake).join('.');
