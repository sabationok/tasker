import { HttpStatus } from '@nestjs/common';

export type AppResponseBody<T> = { statusCode: number; message?: string; data: T; meta?: Record<string, unknown> };

/** Success envelope; controllers build it with the static factories only. */
export class AppResponse<T = undefined> implements AppResponseBody<T> {
  readonly statusCode: number;
  readonly message?: string;
  readonly data: T;
  readonly meta?: Record<string, unknown>;

  protected constructor(init: AppResponseBody<T>) {
    this.statusCode = init.statusCode;
    this.data = init.data;
    if (init.message) this.message = init.message;
    if (init.meta) this.meta = init.meta;
  }

  static ok<T>(data: T, message?: string, meta?: Record<string, unknown>): AppResponse<T> {
    return new AppResponse({ statusCode: HttpStatus.OK, data, message, meta });
  }

  static created<T>(data: T, message?: string): AppResponse<T> {
    return new AppResponse({ statusCode: HttpStatus.CREATED, data, message });
  }

  static empty(message?: string): AppResponse<undefined> {
    return new AppResponse({ statusCode: HttpStatus.OK, data: undefined, message });
  }
}

export type AppResponsePromise<T = undefined> = Promise<AppResponse<T>>;
