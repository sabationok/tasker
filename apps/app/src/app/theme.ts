import { host } from '@/lib/host';

/** Light / dark from the host (Mia / Telegram colorScheme), else the OS. Applied as `data-theme` on <html>. */
export function applyTheme(): () => void {
  const set = () => {
    const scheme = host.colorScheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = scheme;
  };
  set();
  return host.onThemeChanged(set);
}
