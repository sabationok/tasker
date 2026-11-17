import { Module } from '@nestjs/common';
import { TodayModule } from '../today/today.module';
import { ToolsModule } from '../tools/tools.module';
import { McpController } from './mcp.controller';
import { McpServerFactoryService } from './services/mcp-server-factory';
import { McpSessionsService } from './services/mcp-sessions';
import { McpSessionsListener } from './services/mcp-sessions/mcp-sessions.listener';

@Module({
  imports: [ToolsModule, TodayModule],
  controllers: [McpController],
  providers: [McpServerFactoryService, McpSessionsService, McpSessionsListener],
  exports: [McpSessionsService],
})
export class McpModule {}
