/** One input field of a write tool, as the server's schema describes it (keys are snake_case, like the tool's input). */
export type FieldKind = 'string' | 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'ref' | 'enum' | 'array' | 'object';
export type ToolField = { title: string; kind: FieldKind; options?: (string | number)[]; nullable?: boolean };
export type ToolFields = { title: string | null; fields: Record<string, ToolField> };
