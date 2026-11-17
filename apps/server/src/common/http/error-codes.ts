/** Stable machine codes shared by REST (`innerCode`) and MCP (`errors[].code`). General → specific. */
export const ERROR_CODES = [
  'invalid:args',
  'invalid:item:remind-at-past',
  'invalid:item:thread-locked',
  'invalid:item:thread-periodic',
  'invalid:item:type-unsupported',
  'invalid:recurrence:freq',
  'invalid:recurrence:startsOn',
  'invalid:recurrence:weekdays',
  'invalid:recurrence:monthDays',
  'invalid:recurrence:interval',
  'invalid:recurrence:dates',
  'invalid:recurrence:range',
  'invalid:habit:target',
  'invalid:habit:date',
  'invalid:habit:notes-disabled',
  'not-found:project',
  'not-found:category',
  'not-found:tag',
  'not-found:item',
  'not-found:habit',
  'not-found:checklist-item',
  'not-found:reminder',
  'not-found:draft',
  'not-found:api-key',
  'not-found:tool',
  'conflict:draft:not-pending',
  'unauthorized:api-key',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type LookupResult = { id: string; label: string; path?: string };

export type FieldError = {
  path: string;
  code: ErrorCode;
  message: string;
  expected?: unknown;
  options?: LookupResult[];
};
