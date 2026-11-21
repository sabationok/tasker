import { Global, Module } from '@nestjs/common';
import { AppSessionController } from './app-session.controller';
import { AppSessionService } from './app-session.service';

@Global()
@Module({ controllers: [AppSessionController], providers: [AppSessionService], exports: [AppSessionService] })
export class AppSessionModule {}
