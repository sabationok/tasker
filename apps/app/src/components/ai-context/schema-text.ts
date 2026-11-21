import { tr } from '@/i18n';
import type { JsonObjectSchema, JsonSchema } from '@/lib/page-agent';

/** A tool argument as a person reads it: name, its type in words, required, the hint, and nested fields. */
export type ArgLine = { name: string; type: string; required: boolean; hint?: string; children?: ArgLine[] };

const isObject = (s: JsonSchema): s is JsonObjectSchema => 'type' in s && s.type === 'object';
const isNull = (s: JsonSchema) => 'type' in s && s.type === 'null';

/** The type of a schema in words: «date YYYY-MM-DD», «one of: a, b», «list: text», «text or null». */
export function typeText(s: JsonSchema): string {
  if ('anyOf' in s) {
    const variants = s.anyOf.filter((x) => !isNull(x));
    const nullable = variants.length < s.anyOf.length;
    // A union of objects told apart by an enum field (e.g. recurrence by `freq`).
    const tags = variants.flatMap((v) => (isObject(v) ? Object.values(v.properties).flatMap((p) => ('enum' in p && p.enum?.length === 1 ? [String(p.enum[0])] : [])) : []));
    const base = tags.length === variants.length && variants.length > 1 ? tr('one of the shapes: {list}', { list: tags.join(', ') }) : variants.map(typeText).join(` ${tr('or')} `);
    return nullable ? `${base} ${tr('or')} null` : base;
  }
  if (!('type' in s)) return tr('any value');
  switch (s.type) {
    case 'string':
      if (s.enum) return tr('one of: {list}', { list: s.enum.join(', ') });
      if (s.format === 'date') return tr('date YYYY-MM-DD');
      if (s.format === 'time') return tr('time HH:mm');
      if (s.format === 'date-time') return tr('date and time');
      return tr('text');
    case 'integer':
    case 'number': {
      if (s.enum) return tr('one of: {list}', { list: s.enum.join(', ') });
      const range = s.minimum !== undefined || s.maximum !== undefined ? ` (${s.minimum ?? '…'}–${s.maximum ?? '…'})` : '';
      return `${s.type === 'integer' ? tr('whole number') : tr('number')}${range}`;
    }
    case 'boolean':
      return tr('yes / no');
    case 'array':
      return `${tr('list')}: ${typeText(s.items)}`;
    case 'object':
      return tr('object');
    case 'null':
      return 'null';
  }
}

/** The tool's arguments, one line each; object arguments list their own fields (one level, enough for `values`). */
export function argLines(schema: JsonObjectSchema, depth = 0): ArgLine[] {
  return Object.entries(schema.properties).map(([name, p]) => ({
    name,
    type: typeText(p),
    required: !!schema.required?.includes(name),
    hint: 'description' in p ? p.description : undefined,
    children: depth < 1 && isObject(p) && Object.keys(p.properties).length ? argLines(p, depth + 1) : undefined,
  }));
}
