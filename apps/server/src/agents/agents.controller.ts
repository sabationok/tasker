import { Controller, Get } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly _agents: AgentsService) {}

  @Get('many')
  async findMany() {
    return AppResponse.ok({ items: await this._agents.findMany() });
  }
}
