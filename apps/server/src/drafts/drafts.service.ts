import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AppException } from '../common/http/app-exception';
import { DraftsEvents } from './drafts.events';
import { DraftEntity } from './entities/draft.entity';
import type { DraftStatus } from './types/draft.types';

const TTL_MS = 24 * 3600_000;

/** Draft rows (persistence + status changes); running a draft is the tools registry's job. */
@Injectable()
export class DraftsService {
  constructor(
    @InjectRepository(DraftEntity) private readonly _repo: Repository<DraftEntity>,
    private readonly _events: DraftsEvents,
  ) {}

  store(tool: string, dto: Record<string, unknown>, preview: Record<string, unknown>, batchId: string | undefined, apiKeyId: string | null): Promise<DraftEntity> {
    return this._repo.save(this._repo.create({ tool, dto, preview, batchId: batchId ?? uuidv7(), apiKeyId, expiresAt: new Date(Date.now() + TTL_MS) }));
  }

  /** A draft that can still be saved, or `not-found:draft` / `conflict:draft:not-pending`. */
  async getPending(id: string): Promise<DraftEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row) throw AppException.notFound('not-found:draft', 'draft_id');
    if (row.status !== 'draft' || row.expiresAt.getTime() < Date.now()) throw AppException.conflict('conflict:draft:not-pending', `The draft is ${row.status === 'draft' ? 'expired' : row.status}`, 'draft_id');
    return row;
  }

  /** Claims a pending, unexpired draft for one save (`draft` → `saving`); a second, concurrent save gets the conflict. */
  async claim(row: DraftEntity): Promise<void> {
    const res = await this._repo.createQueryBuilder().update().set({ status: 'saving' }).where('id = :id and status = :s and expires_at > now()', { id: row.id, s: 'draft' }).execute();
    if (!res.affected) throw AppException.conflict('conflict:draft:not-pending', 'The draft changed meanwhile', 'draft_id');
  }

  /** Gives a claimed draft back (its run failed validation or threw). */
  async release(row: DraftEntity): Promise<void> {
    await this._repo.update({ id: row.id, status: 'saving' }, { status: 'draft' });
  }

  async setStatus(row: DraftEntity, status: DraftStatus, result: { id: string | null; label: string | null } = { id: null, label: null }, from: DraftStatus = 'draft'): Promise<DraftEntity> {
    const { id: resultId, label: resultLabel } = result;
    const res = await this._repo.update({ id: row.id, status: from }, { status, resultId, resultLabel });
    if (!res.affected) throw AppException.conflict('conflict:draft:not-pending', 'The draft changed meanwhile', 'draft_id');
    const updated = { ...row, status, resultId, resultLabel };
    this._events.emit({ draftId: row.id, batchId: row.batchId, status, resultId, resultLabel, apiKeyId: row.apiKeyId, tool: row.tool });
    return updated as DraftEntity;
  }

  async discard(id: string): Promise<DraftEntity> {
    return this.setStatus(await this.getPending(id), 'discarded');
  }

  findByBatch(batchId: string): Promise<DraftEntity[]> {
    return this._repo.find({ where: { batchId }, order: { createdAt: 'ASC' } });
  }

  /** Marks drafts past their TTL as expired (hourly sweep). */
  async expireOld(): Promise<number> {
    const stale = await this._repo.find({ where: { status: 'draft', expiresAt: LessThan(new Date()) } });
    for (const row of stale) await this.setStatus(row, 'expired').catch(() => undefined);
    return stale.length;
  }
}
