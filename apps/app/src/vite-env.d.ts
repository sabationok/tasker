/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TASKER_API_BASE?: string;
  /** Set by vite.config from `STAGE` (never from mode); read it through `@/config/stage`. */
  readonly VITE_STAGE: 'dev' | 'production';
}
