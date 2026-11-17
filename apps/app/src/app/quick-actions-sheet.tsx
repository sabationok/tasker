import { useNavigate } from 'react-router-dom';
import { CircleCheckBig, Repeat, Sparkles } from 'lucide-react';
import { tr } from '@/i18n';
import { routes } from '@/lib/routes';
import { IconTile, OptionList, Sheet } from '@/ui';

const ACTIONS = [
  { value: 'habit', label: 'Habit', description: 'An activity with recurring patterns, tracked and analysed.', icon: Sparkles, to: routes.habitNew() },
  { value: 'periodic', label: 'Periodic task', description: 'A repeating activity without tracking or statistics.', icon: Repeat, to: routes.taskNew({ periodic: true }) },
  { value: 'task', label: 'Task', description: 'A one-time occurrence without ongoing tracking.', icon: CircleCheckBig, to: routes.taskNew() },
] as const;

/** «+» → what to create. */
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
        options={ACTIONS.map((a) => ({
          value: a.value,
          label: tr(a.label),
          description: tr(a.description),
          leading: (
            <IconTile size={36}>
              <a.icon className="size-4" />
            </IconTile>
          ),
        }))}
      />
    </Sheet>
  );
}
