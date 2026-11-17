import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env';

/** CLI data source (migration:generate / migration:run). */
export default new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});
