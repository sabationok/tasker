import { useNavigate } from 'react-router-dom';
import { tr } from '@/i18n';
import { IconButton, TopBar } from '@/ui';

/** @ui FormHeader @spec Back, title, submit targeting a form by id — the forms' top bar. @keywords form header, top bar, back, save */
export function FormHeader({ title, formId, saving }: { title: string; formId: string; saving?: boolean }) {
  const navigate = useNavigate();
  return (
    <TopBar
      leading={<IconButton label={tr('Close')} icon="back" onClick={() => navigate(-1)} />}
      title={title}
      trailing={<IconButton label={tr('Save')} tone="accent" type="submit" form={formId} disabled={saving} loading={saving} icon="check" />}
    />
  );
}
