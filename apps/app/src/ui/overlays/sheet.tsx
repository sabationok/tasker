import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { tr } from '@/i18n';
import { FlexBox, FlexRow } from '../layout/flex';
import { IconButton } from '../primitives/icon-button';
import { Button, type ButtonVariant } from '../primitives/button';

/**
 * @ui Sheet
 * @spec Bottom sheet on native <dialog>: title, close, scrollable body, footer built from `actions` (never a hand-made row).
 * @keywords modal, dialog, bottom sheet, drawer, overlay, picker
 */
export type SheetAction = { label: string; onClick?: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'; form?: string };

export function Sheet({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: SheetAction[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-3xl bg-bg p-0 text-fg sm:mx-auto sm:max-w-md"
    >
      {open && (
        <FlexBox gap="md" className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <FlexRow justify="between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <IconButton label={tr('Close')} icon={<X className="size-4" />} onClick={onClose} />
          </FlexRow>
          <div className="max-h-[60vh] overflow-y-auto">{children}</div>
          {actions && actions.length > 0 && <SheetFooter actions={actions} />}
        </FlexBox>
      )}
    </dialog>
  );
}

/** @ui SheetFooter @spec The one footer: a row of action buttons, primary last. @keywords footer, actions, modal footer */
export function SheetFooter({ actions }: { actions: SheetAction[] }) {
  return (
    <FlexRow gap="sm">
      {actions.map((a) => (
        <Button key={a.label} variant={a.variant ?? 'primary'} size="lg" block className="min-w-0 flex-1 px-2" onClick={a.onClick} loading={a.loading} disabled={a.disabled} type={a.type ?? 'button'} form={a.form}>
          {a.label}
        </Button>
      ))}
    </FlexRow>
  );
}
