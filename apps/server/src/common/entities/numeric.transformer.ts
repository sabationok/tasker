import type { ValueTransformer } from 'typeorm';

/** pg returns `numeric` as a string; read it as a number. */
export const numericTransformer: ValueTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | null) => (v === null || v === undefined ? null : Number(v)),
};
