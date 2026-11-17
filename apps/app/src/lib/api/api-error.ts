export type FieldError = { path?: string; code?: string; message: string };

/** A failed tasker call: `{ innerCode, errors[] }` from the server, or a network failure. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly innerCode: string,
    message: string,
    readonly errors: FieldError[] = [],
  ) {
    super(message);
  }
}
