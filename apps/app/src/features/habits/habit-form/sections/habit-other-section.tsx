import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Field, Input, NavRow, SectionCard, Switch, Textarea } from '@/ui';
import { ListEditor } from '@/components/list-editor';
import { RecurrenceEditor } from '@/components/recurrence-editor';
import type { HabitFormValues } from '../habit-form.lib';

export function HabitFrequencySection() {
  const { control } = useFormContext<HabitFormValues>();
  return (
    <SectionCard title={tr('Frequency')}>
      <Controller control={control} name="recurrence" render={({ field }) => <RecurrenceEditor value={field.value} onChange={field.onChange} />} />
    </SectionCard>
  );
}

export function HabitRemindersSection() {
  const { control } = useFormContext<HabitFormValues>();
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
            makeNew={() => '09:00'}
            renderItem={(v, set) => <Input aria-label={tr('Reminder time')} type="time" value={v} onChange={(e) => set(e.target.value)} />}
          />
        )}
      />
    </SectionCard>
  );
}

export function HabitOtherSection() {
  const { control, register } = useFormContext<HabitFormValues>();
  return (
    <SectionCard title={tr('Other')} marker="optional">
      <Field label={tr('Description')} htmlFor="habit-desc">
        <Textarea id="habit-desc" placeholder={tr('Add description')} {...register('description')} />
      </Field>
      <Controller
        control={control}
        name="notesEnabled"
        render={({ field }) => <NavRow label={tr('Notes')} value={tr('Add a note to each check-in')} trailing={<Switch label={tr('Notes')} checked={field.value} onChange={field.onChange} />} />}
      />
    </SectionCard>
  );
}
