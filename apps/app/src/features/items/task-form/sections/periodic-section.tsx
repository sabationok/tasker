import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Field, OptionList, SectionCard } from '@/ui';
import { RecurrenceEditor } from '@/components/recurrence-editor';
import type { TaskFormValues } from '../task-form.lib';

/** Periodic task: how it repeats and how a day is marked done. */
export function PeriodicSection() {
  const { control } = useFormContext<TaskFormValues>();
  return (
    <SectionCard title={tr('Frequency')}>
      <Controller control={control} name="recurrence" render={({ field }) => <RecurrenceEditor value={field.value} onChange={field.onChange} />} />
      <Controller
        control={control}
        name="evaluation"
        render={({ field }) => (
          <Field label={tr('Mark done by')}>
            <OptionList
              label={tr('Mark done by')}
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'yes_no', label: tr('Yes / no') },
                { value: 'checklist', label: tr('Checklist'), description: tr('Day done when all items are ticked') },
              ]}
            />
          </Field>
        )}
      />
    </SectionCard>
  );
}
