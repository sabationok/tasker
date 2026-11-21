import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { setHostToast } from '@/lib/host';
import { tr } from '@/i18n';

/**
 * @ui ToastProvider / useToast
 * @spec One transient message at the bottom; also the plain-browser fallback of the host bridge.
 * @keywords toast, snackbar, notification, message
 */
type ToastFn = (text: string, tone?: 'info' | 'error') => void;
const Ctx = createContext<ToastFn>(() => undefined);
let globalToast: ToastFn = () => undefined;

/** For code outside React (the query client's global error policy). */
export const showToast: ToastFn = (text, tone) => globalToast(text, tone);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; tone: 'info' | 'error'; id: number } | null>(null);
  const show = useCallback<ToastFn>((text, tone = 'info') => setMsg({ text: tr(text), tone, id: Date.now() }), []);
  useEffect(() => {
    globalToast = show;
    setHostToast((t) => show(t));
  }, [show]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className={msg.tone === 'error' ? 'rounded-control bg-negative px-4 py-2 text-label text-accent-fg shadow-overlay' : 'rounded-control bg-fg px-4 py-2 text-label text-bg shadow-overlay'}>{msg.text}</div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
