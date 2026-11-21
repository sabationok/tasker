import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  /** Which stage this deployment is (set per hosting environment, never inferred from NODE_ENV). Picks the dependencies below. */
  STAGE: z.enum(['dev', 'production']),
  DATABASE_URL: z.string().default('postgres://localhost/tasker'),
  // TODO(redis-prefix): add REDIS_PREFIX: z.string().min(1).default('tasker') — see docs/superpowers/specs/2026-11-21-redis-prefix-design.md
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  PORT: z.coerce.number().int().positive(),
  BIND_HOST: z.string().default('127.0.0.1'),
  /** Dev only: accept `X-Tasker-Client: <name>` from loopback instead of an API key (see ApiKeyGuard). */
  TRUST_CLIENT_HEADER: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  /** Override of the stage's header-client events URL (see STAGE_DEPS). */
  CLIENT_HEADER_EVENTS_URL: z.string().url().optional(),
  /** Public URL of the mini app (served by this server at /assistant/app/); declared as `_meta.ui.app`. */
  MINI_APP_URL: z.string().url().optional(),
});

export type Stage = z.infer<typeof envSchema>['STAGE'];

/**
 * Parsed process env; fails fast on a missing or malformed value. The client header is a dev-stage shortcut: a production
 * deployment refuses to boot with it on.
 */
const parsed = envSchema
  .refine((e) => e.STAGE === 'dev' || !e.TRUST_CLIENT_HEADER, { message: 'TRUST_CLIENT_HEADER=true is allowed only with STAGE=dev', path: ['TRUST_CLIENT_HEADER'] })
  .parse(process.env);

/**
 * Same-stage dependencies, one map: a dev tasker calls only dev services. `CLIENT_HEADER_EVENTS_URL` overrides the value of
 * the running stage (e.g. another local Mia port); a stage without a value has no such dependency.
 */
const STAGE_DEPS: Record<Stage, { headerClientEventsUrl: string | null }> = {
  dev: { headerClientEventsUrl: 'http://127.0.0.1:4310/connectors/events' },
  production: { headerClientEventsUrl: null },
};
const deps = STAGE_DEPS[parsed.STAGE];

export const env = {
  ...parsed,
  MINI_APP_URL: parsed.MINI_APP_URL ?? `http://${parsed.BIND_HOST}:${parsed.PORT}/assistant/app/`,
  /** Where events go for a header client (Mia's POST /connectors/events of the same stage). */
  CLIENT_HEADER_EVENTS_URL: parsed.CLIENT_HEADER_EVENTS_URL ?? deps.headerClientEventsUrl,
};
