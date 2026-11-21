import type { ZodError } from 'zod';
import { ERROR_CODES, type ErrorCode, type FieldError } from '../http/error-codes';
import type { Locale } from '../i18n/messages';

/** Zod issues → field errors; a refinement may carry its own code in `params.code`. */
export function zodToFieldErrors(error: ZodError, locale: Locale, mapPath: (p: (string | number)[]) => string = (p) => p.join('.')): FieldError[] {
  return error.issues.map((issue) => {
    const code = codeOf(issue.path, (issue as { params?: { code?: string } }).params?.code);
    const expected = 'expected' in issue ? issue.expected : 'options' in issue ? issue.options : undefined;
    return { path: mapPath(issue.path), code, message: locale === 'uk' && issue.code === 'invalid_type' && issue.received === 'undefined' ? "Обов'язкове поле" : issue.message, ...(expected !== undefined && { expected }) };
  });
}

/** An explicit refinement code, else `invalid:recurrence:<field>` under a recurrence, else `invalid:args`. */
function codeOf(path: (string | number)[], explicit?: string): ErrorCode {
  if (explicit && (ERROR_CODES as readonly string[]).includes(explicit)) return explicit as ErrorCode;
  const i = path.indexOf('recurrence');
  if (i >= 0) {
    const candidate = `invalid:recurrence:${String(path[i + 1] ?? 'freq')}`;
    return (ERROR_CODES as readonly string[]).includes(candidate) ? (candidate as ErrorCode) : 'invalid:recurrence:freq';
  }
  return 'invalid:args';
}
