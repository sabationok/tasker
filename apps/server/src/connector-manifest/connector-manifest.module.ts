import { Module } from '@nestjs/common';
import { ConnectorManifestController } from './connector-manifest.controller';

@Module({ controllers: [ConnectorManifestController] })
export class ConnectorManifestModule {}
