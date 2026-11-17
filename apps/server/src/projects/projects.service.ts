import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '../common/http/app-exception';
import type { LookupResult } from '../common/http/error-codes';
import { rankTextMatches } from '../common/helpers/rank-text-matches';
import { slugify } from '../common/helpers/slugify';
import type { CreateProjectInput, UpdateProjectInput } from './dto/project.schemas';
import { ProjectEntity } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(ProjectEntity) private readonly _repo: Repository<ProjectEntity>) {}

  findMany(includeArchived = false): Promise<ProjectEntity[]> {
    return this._repo.find({ where: includeArchived ? {} : { archivedAt: IsNull() }, order: { name: 'ASC' } });
  }

  async create(input: CreateProjectInput): Promise<ProjectEntity> {
    const base = slugify(input.name);
    let slug = base;
    for (let i = 2; await this._repo.exists({ where: { slug }, withDeleted: true }); i++) slug = `${base}-${i}`;
    return this._repo.save(this._repo.create({ name: input.name, slug }));
  }

  async update(input: UpdateProjectInput): Promise<ProjectEntity> {
    const row = await this.getOrFail(input.id, true);
    if (input.name) row.name = input.name;
    if (input.archived !== undefined) row.archivedAt = input.archived ? new Date() : null;
    return this._repo.save(row);
  }

  async delete(id: string): Promise<void> {
    await this.getOrFail(id, true);
    await this._repo.softDelete(id);
  }

  async getOrFail(id: string, allowArchived = false): Promise<ProjectEntity> {
    const row = await this._repo.findOneBy({ id });
    if (!row || (!allowArchived && row.archivedAt)) throw AppException.notFound('not-found:project', 'projectId');
    return row;
  }

  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    const rows = rankTextMatches(await this.findMany(), (r) => r.name, query, limit);
    return rows.map((r) => ({ id: r.id, label: r.name, path: `Projects / ${r.name}` }));
  }
}
