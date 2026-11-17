import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgres://localhost/tasker'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  PORT: z.coerce.number().int().positive(),
  BIND_HOST: z.string().default('127.0.0.1'),
});

/** Parsed process env; fails fast on a missing or malformed value. */
export const env = envSchema.parse(process.env);
