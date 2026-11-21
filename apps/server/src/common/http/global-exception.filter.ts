import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from './app-exception';

/** Maps every thrown error to `{ statusCode, message, innerCode?, errors? }`. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly _logger = new Logger(GlobalExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;
    if (error instanceof AppException) {
      res.status(error.status).json({ statusCode: error.status, message: error.message, innerCode: error.innerCode, ...(error.errors.length && { errors: error.errors }) });
      return;
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      res.status(status).json({ statusCode: status, message: error.message, innerCode: status === 404 ? 'not-found:tool' : 'invalid:args' });
      return;
    }
    this._logger.error(error instanceof Error ? error.stack : String(error));
    res.status(500).json({ statusCode: 500, message: 'Internal error', innerCode: 'internal' });
  }
}
