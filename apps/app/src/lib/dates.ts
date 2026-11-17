/** Local calendar dates as `YYYY-MM-DD`; no time zones involved (the server owns the owner's zone). */
const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = (): string => toIsoDate(new Date());
export const parseIsoDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number): string => {
  const d = parseIsoDate(s);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};
export const addMonths = (s: string, n: number): string => {
  const d = parseIsoDate(s);
  d.setMonth(d.getMonth() + n);
  return toIsoDate(d);
};
export const addYears = (s: string, n: number): string => {
  const d = parseIsoDate(s);
  d.setFullYear(d.getFullYear() + n);
  return toIsoDate(d);
};
export const formatDay = (s: string, locale: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat(locale, opts).format(parseIsoDate(s));

/** `datetime-local` value ↔ ISO with offset (the API wants an offset). */
export const localInputToIso = (v: string): string => {
  const d = new Date(v);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${v.length === 16 ? `${v}:00` : v}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
};
export const isoToLocalInput = (iso: string): string => {
  const d = new Date(iso);
  return `${toIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const formatSeconds = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
