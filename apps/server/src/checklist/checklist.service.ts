import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AppException } from '../common/http/app-exception';
import { ChecklistItemEntity } from './entities/checklist-item.entity';

export type ChecklistLineView = { id: string; title: string; position: number; done: boolean };

@Injectable()
export class ChecklistService {
  constructor(@InjectRepository(ChecklistItemEntity) private readonly _repo: Repository<ChecklistItemEntity>) {}

  /** Replaces an item's checklist: lines with a known id keep their done state, the rest are new; missing ones go. */
  async replaceForItem(m: EntityManager, itemId: string, list: { id?: string; title: string }[]): Promise<void> {
    const current = await m.find(ChecklistItemEntity, { where: { itemId } });
    const keep = new Map(current.map((c) => [c.id, c]));
    const kept = new Set<string>();
    for (const [i, line] of list.entries()) {
      const existing = line.id ? keep.get(line.id) : undefined;
      if (existing) {
        kept.add(existing.id);
        await m.update(ChecklistItemEntity, { id: existing.id }, { title: line.title, position: i + 1 });
      } else await m.save(m.create(ChecklistItemEntity, { itemId, title: line.title, position: i + 1 }));
    }
    const gone = current.filter((c) => !kept.has(c.id)).map((c) => c.id);
    if (gone.length) await m.delete(ChecklistItemEntity, { id: In(gone) });
  }

  async create(itemId: string, title: string): Promise<ChecklistItemEntity> {
    const position = ((await this._repo.maximum('position', { itemId })) ?? 0) + 1;
    return this._repo.save(this._repo.create({ itemId, title, position }));
  }

  async update(id: string, patch: { title?: string; position?: number }): Promise<ChecklistItemEntity> {
    const row = await this.getOrFail(id);
    Object.assign(row, patch);
    return this._repo.save(row);
  }

  async delete(id: string): Promise<void> {
    const res = await this._repo.delete({ id });
    if (!res.affected) throw AppException.notFound('not-found:checklist-item');
  }

  async getOrFail(id: string): Promise<ChecklistItemEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row) throw AppException.notFound('not-found:checklist-item');
    return row;
  }

  /** Flips a single task's line (done ↔ undone). */
  async toggleLine(row: ChecklistItemEntity): Promise<ChecklistItemEntity> {
    row.doneAt = row.doneAt ? null : new Date();
    return this._repo.save(row);
  }

  async linesByItem(itemIds: string[]): Promise<Map<string, ChecklistItemEntity[]>> {
    const out = new Map<string, ChecklistItemEntity[]>();
    if (!itemIds.length) return out;
    const rows = await this._repo.find({ where: { itemId: In(itemIds) }, order: { position: 'ASC' } });
    for (const r of rows) out.set(r.itemId, [...(out.get(r.itemId) ?? []), r]);
    return out;
  }

  /** Finds a line of an item by its title words (for the MCP tool that names a line by text). */
  async findByTitle(itemId: string, title: string): Promise<ChecklistItemEntity[]> {
    const rows = await this._repo.find({ where: { itemId }, order: { position: 'ASC' } });
    const q = title.trim().toLowerCase();
    const exact = rows.filter((r) => r.title.toLowerCase() === q);
    return exact.length ? exact : rows.filter((r) => r.title.toLowerCase().includes(q));
  }
}
