import type { Locale } from '../../common/i18n/messages';

export type FailedMode = 'missed' | 'explicit';

export type Settings = {
  timezone: string;
  locale: Locale;
  failedMode: FailedMode;
  weekStart: 1 | 7;
  toolsSchemaHash?: string;
  uiManifestVersion?: string;
};
