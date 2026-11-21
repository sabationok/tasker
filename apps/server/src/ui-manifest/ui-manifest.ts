import { createHash } from 'node:crypto';
import { UI_SCREENS } from './constants/ui-manifest';

const body = { screens: UI_SCREENS };
const version = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);

/** `tasker://ui/manifest`: the screens and page actions, versioned by content hash. */
export const UI_MANIFEST = { version, ...body };
