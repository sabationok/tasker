import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { createProjectSchema, updateProjectSchema, type CreateProjectInput, type UpdateProjectInput } from './dto/project.schemas';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly _projects: ProjectsService) {}

  @Get('many')
  async findMany(@Query('search') search?: string, @Query('archived') archived?: string) {
    if (search) return AppResponse.ok({ items: await this._projects.lookup(search, 50) });
    return AppResponse.ok({ items: await this._projects.findMany(archived === 'true') });
  }

  @Get()
  async findOne(@Query('id', ParseUUIDPipe) id: string) {
    return AppResponse.ok(await this._projects.getOrFail(id, true));
  }

  @Post('create')
  async create(@Body(new ZodPipe(createProjectSchema)) dto: CreateProjectInput) {
    return AppResponse.created(await this._projects.create(dto));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateProjectSchema)) dto: UpdateProjectInput) {
    return AppResponse.ok(await this._projects.update(dto));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._projects.delete(id);
    return AppResponse.empty();
  }
}
