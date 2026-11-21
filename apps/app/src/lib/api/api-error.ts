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

/**
 * The API could not be reached: the device is offline, the request failed, or something other than the tasker API
 * answered (a static host's 404 page, a captive portal). Nothing was read or saved.
 */
export const NETWORK_ERROR = { offline: 'network:offline', unreachable: 'network:unreachable' } as const;
export const isNetworkError = (e: unknown): e is ApiError => e instanceof ApiError && e.innerCode.startsWith('network:');
