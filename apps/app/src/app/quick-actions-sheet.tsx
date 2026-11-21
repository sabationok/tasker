import { useNavigate } from 'react-router-dom';
import { tr } from '@/i18n';
import { routes } from '@/lib/routes';
import { IconTile, OptionList, Sheet, type IconName } from '@/ui';

const ACTIONS: { value: string; label: string; description: string; icon: IconName; to: string }[] = [
  { value: 'habit', label: 'Habit', description: 'An activity with recurring patterns, tracked and analysed.', icon: 'habit', to: routes.habitNew() },
  { value: 'periodic', label: 'Periodic task', description: 'A repeating activity without tracking or statistics.', icon: 'periodic', to: routes.taskNew({ periodic: true }) },
  { value: 'task', label: 'Task', description: 'A one-time occurrence without ongoing tracking.', icon: 'task', to: routes.taskNew() },
];

/** «Create» → what to create. */
export function QuickActionsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onClose={onClose} title={tr('Quick actions')}>
      <OptionList
        label={tr('Quick actions')}
        value={null}
        onChange={(v) => {
          onClose();
          navigate(ACTIONS.find((a) => a.value === v)!.to);
        }}
        options={ACTIONS.map((a) => ({ value: a.value, label: tr(a.label), description: tr(a.description), leading: <IconTile icon={a.icon} size="sm" /> }))}
      />
    </Sheet>
  );
}
