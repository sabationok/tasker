import { uk } from './uk';

export type SourceText = keyof typeof uk | (string & {});

const DICTS: Record<string, Record<string, string>> = { uk };

/** The page language: the host's `locale` later (initData), `uk` by default. */
export const locale: string = (() => {
  const nav = navigator.language?.slice(0, 2);
  return nav === 'en' ? 'en' : 'uk';
})();

const dict = DICTS[locale] ?? {};

export function tr(text: SourceText, params?: Record<string, string | number>): string {
  const s = dict[text] ?? text;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/** Intl locale for dates and numbers. */
export const intlLocale = locale === 'uk' ? 'uk-UA' : 'en-GB';
