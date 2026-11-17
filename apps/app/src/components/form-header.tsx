import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { tr } from '@/i18n';
import { FlexRow, IconButton, Spinner } from '@/ui';

/** @ui FormHeader @spec Back, title, submit (✓) targeting a form by id — the forms' top bar. @keywords form header, top bar, back, save */
export function FormHeader({ title, formId, saving }: { title: string; formId: string; saving?: boolean }) {
  const navigate = useNavigate();
  return (
    <FlexRow justify="between" className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 py-2 backdrop-blur">
      <IconButton label={tr('Close')} icon={<ChevronLeft className="size-5" />} onClick={() => navigate(-1)} />
      <h1 className="text-[17px] font-semibold">{title}</h1>
      <IconButton label={tr('Save')} tone="accent" type="submit" form={formId} disabled={saving} icon={saving ? <Spinner /> : <Check className="size-5" />} />
    </FlexRow>
  );
}
