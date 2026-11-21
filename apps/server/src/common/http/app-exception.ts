import { HttpStatus } from '@nestjs/common';
import type { ErrorCode, FieldError } from './error-codes';

/** The one deliberate error: an HTTP status, a stable `innerCode` and optional field errors. */
export class AppException extends Error {
  constructor(
    readonly status: number,
    readonly innerCode: ErrorCode,
    message: string,
    readonly errors: FieldError[] = [],
  ) {
    super(message);
  }

  static invalid(errors: FieldError[]): AppException {
    return new AppException(HttpStatus.BAD_REQUEST, errors[0]?.code ?? 'invalid:args', errors.map((e) => `${e.path}: ${e.message}`).join('; '), errors);
  }

  static notFound(code: ErrorCode, path = 'id', message = 'Not found'): AppException {
    return new AppException(HttpStatus.NOT_FOUND, code, message, [{ path, code, message }]);
  }

  static conflict(code: ErrorCode, message: string, path = 'id'): AppException {
    return new AppException(HttpStatus.CONFLICT, code, message, [{ path, code, message }]);
  }

  static forbidden(code: ErrorCode, message: string, path = ''): AppException {
    return new AppException(HttpStatus.FORBIDDEN, code, message, [{ path, code, message }]);
  }

  static unauthorized(): AppException {
    return new AppException(HttpStatus.UNAUTHORIZED, 'unauthorized:api-key', 'Missing, unknown or revoked API key');
  }
}
