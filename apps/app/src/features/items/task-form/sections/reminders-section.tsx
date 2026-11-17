import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Input, SectionCard } from '@/ui';
import { ListEditor } from '@/components/list-editor';
import { today } from '@/lib/dates';
import type { TaskFormValues } from '../task-form.lib';

/** 09:00 on a future day; on today, the next full hour (the server rejects reminders in the past). */
function nextReminder(date: string): string {
  const day = date || today();
  if (day > today()) return `${day}T09:00`;
  const h = Math.min(new Date().getHours() + 1, 23);
  return `${today()}T${String(h).padStart(2, '0')}:00`;
}

/** Several reminders: absolute moments for a single task, times of day for a periodic one. */
export function RemindersSection() {
  const { control, watch } = useFormContext<TaskFormValues>();
  const [periodic, date] = watch(['periodic', 'date']);
  return (
    <SectionCard title={tr('Reminders')} marker="optional">
      <Controller
        control={control}
        name="reminders"
        render={({ field }) => (
          <ListEditor
            items={field.value}
            onChange={field.onChange}
            orderable={false}
            addLabel={tr('Add reminder')}
            makeNew={() => (periodic ? '09:00' : nextReminder(date))}
            renderItem={(v, set) => <Input aria-label={tr('Reminder time')} type={periodic ? 'time' : 'datetime-local'} value={v} onChange={(e) => set(e.target.value)} />}
          />
        )}
      />
    </SectionCard>
  );
}
