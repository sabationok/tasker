/** The deployment's stage, baked in at build time from `STAGE` (vite.config.ts). The page calls only its own stage's API. */
export type Stage = 'dev' | 'production';
export const STAGE: Stage = import.meta.env.VITE_STAGE;
