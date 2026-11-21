import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AppException } from '../common/http/app-exception';
import type { LookupResult } from '../common/http/error-codes';
import { rankTextMatches } from '../common/helpers/rank-text-matches';
import type { CreateCategoryInput, UpdateCategoryInput } from './dto/category.schemas';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(CategoryEntity) private readonly _repo: Repository<CategoryEntity>) {}

  findMany(includeArchived = false): Promise<CategoryEntity[]> {
    return this._repo.find({ where: includeArchived ? {} : { archivedAt: IsNull() }, order: { position: 'ASC', name: 'ASC' } });
  }

  async create(input: CreateCategoryInput): Promise<CategoryEntity> {
    const position = ((await this._repo.maximum('position')) ?? 0) + 1;
    return this._repo.save(this._repo.create({ ...input, position }));
  }

  async update(input: UpdateCategoryInput): Promise<CategoryEntity> {
    const row = await this.getOrFail(input.id, true);
    const { id: _, archived, ...patch } = input;
    Object.assign(row, patch);
    if (archived !== undefined) row.archivedAt = archived ? new Date() : null;
    return this._repo.save(row);
  }

  async delete(id: string): Promise<void> {
    const row = await this.getOrFail(id, true);
    if (row.isDefault) throw AppException.invalid([{ path: 'id', code: 'invalid:args', message: 'The default category cannot be deleted' }]);
    await this._repo.softDelete(id);
  }

  async reorder(ids: string[]): Promise<CategoryEntity[]> {
    await this._repo.manager.transaction(async (m) => {
      for (const [i, id] of ids.entries()) await m.update(CategoryEntity, { id }, { position: i + 1 });
    });
    return this.findMany();
  }

  /** The row, or `not-found:category` (also when archived, unless allowed). */
  async getOrFail(id: string, allowArchived = false): Promise<CategoryEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row || (!allowArchived && row.archivedAt)) throw AppException.notFound('not-found:category', 'categoryId');
    return row;
  }

  findByIds(ids: string[]): Promise<CategoryEntity[]> {
    return ids.length ? this._repo.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  async defaultId(): Promise<string> {
    const row = await this._repo.findOneByOrFail({ isDefault: true });
    return row.id;
  }

  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    const rows = rankTextMatches(await this.findMany(), (r) => r.name, query, limit);
    return rows.map((r) => ({ id: r.id, label: r.name }));
  }
}
