import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from '../config/env';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      migrations: [`${__dirname}/migrations/*.{ts,js}`],
      migrationsRun: true,
    }),
  ],
})
export class DatabaseModule {}
