import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toSnake } from './case-keys';

type Json = Record<string, unknown>;

/** The tool's MCP `inputSchema`: JSON Schema from zod, property names in snake_case, no $schema / $ref. */
export function toolJsonSchema(input: ZodType): Json {
  const raw = (zodToJsonSchema as (s: unknown, o: unknown) => unknown)(input, { target: 'jsonSchema7', $refStrategy: 'none' }) as Json;
  delete raw.$schema;
  return snakeProps(raw) as Json;
}

function snakeProps(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(snakeProps);
  if (!node || typeof node !== 'object') return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) {
    if (k === 'properties' && v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v as Json).map(([p, s]) => [toSnake(p), snakeProps(s)]));
    else if (k === 'required' && Array.isArray(v)) out[k] = v.map((p) => toSnake(String(p)));
    else out[k] = snakeProps(v);
  }
  return out;
}

/** Paths of object properties that lack a description (startup fails on any). */
export function undescribedFields(schema: Json, path = ''): string[] {
  const out: string[] = [];
  const props = schema.properties as Record<string, Json> | undefined;
  if (props) for (const [k, s] of Object.entries(props)) {
    if (!s.description) out.push(`${path}${k}`);
    out.push(...undescribedFields(s, `${path}${k}.`));
  }
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) for (const sub of (schema[key] as Json[] | undefined) ?? []) out.push(...undescribedFields(sub, path));
  if (schema.items && typeof schema.items === 'object') out.push(...undescribedFields(schema.items as Json, `${path}[].`));
  return out;
}
