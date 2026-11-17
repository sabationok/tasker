import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppException } from '../http/app-exception';
import { zodToFieldErrors } from './zod-to-field-errors';

/** Validates a body or query with a zod schema; failures are 400 `invalid:args` with field errors. */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly _schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this._schema.safeParse(value ?? {});
    if (!parsed.success) throw AppException.invalid(zodToFieldErrors(parsed.error, 'en'));
    return parsed.data;
  }
}
