import { Injectable, Logger } from '@nestjs/common';
import type { DraftChange } from './types/draft.types';

type Listener = (change: DraftChange) => void | Promise<void>;

/** In-process notifications of draft status changes (events / MCP modules subscribe). */
@Injectable()
export class DraftsEvents {
  private readonly _listeners: Listener[] = [];
  private readonly _logger = new Logger(DraftsEvents.name);

  subscribe(listener: Listener): void {
    this._listeners.push(listener);
  }

  emit(change: DraftChange): void {
    for (const l of this._listeners) Promise.resolve(l(change)).catch((e: Error) => this._logger.error(e.message));
  }
}
