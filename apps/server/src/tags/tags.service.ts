import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../common/http/app-exception';
import type { FieldError, LookupResult } from '../common/http/error-codes';
import { rankTextMatches } from '../common/helpers/rank-text-matches';
import type { CreateTagInput, UpdateTagInput } from './dto/tag.schemas';
import { TagEntity } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(@InjectRepository(TagEntity) private readonly _repo: Repository<TagEntity>) {}

  findMany(): Promise<TagEntity[]> {
    return this._repo.find({ order: { name: 'ASC' } });
  }

  async create(input: CreateTagInput): Promise<TagEntity> {
    const existing = await this._repo.findOneBy({ name: input.name });
    return existing ?? this._repo.save(this._repo.create(input));
  }

  async update(input: UpdateTagInput): Promise<TagEntity> {
    const row = await this.getOrFail(input.id);
    row.name = input.name;
    return this._repo.save(row);
  }

  async delete(id: string): Promise<void> {
    await this.getOrFail(id);
    await this._repo.softDelete(id);
  }

  async getOrFail(id: string): Promise<TagEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row) throw AppException.notFound('not-found:tag', 'tagIds');
    return row;
  }

  findByIds(ids: string[]): Promise<TagEntity[]> {
    return ids.length ? this._repo.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  /** Field errors for tag ids that do not exist. */
  async checkIds(ids: string[] | undefined, path = 'tagIds'): Promise<FieldError[]> {
    if (!ids?.length) return [];
    const found = new Set((await this.findByIds(ids)).map((t) => t.id));
    return ids.flatMap((id, i) => (found.has(id) ? [] : [{ path: `${path}.${i}`, code: 'not-found:tag' as const, message: 'Tag not found' }]));
  }

  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    return rankTextMatches(await this.findMany(), (r) => r.name, query, limit).map((r) => ({ id: r.id, label: r.name }));
  }
}
