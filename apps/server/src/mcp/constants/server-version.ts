// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../../package.json') as { version: string };

/** `serverInfo.version`, from apps/server/package.json. */
export const SERVER_VERSION = pkg.version;
