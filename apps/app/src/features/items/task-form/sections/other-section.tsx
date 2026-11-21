import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { Field, NavRow, SectionCard, Switch, Textarea } from '@/ui';
import type { TaskFormValues } from '../task-form.lib';

/** Description; «pending» for single tasks. */
export function OtherSection() {
  const { register, control, watch } = useFormContext<TaskFormValues>();
  return (
    <SectionCard title={tr('Other')} marker="optional">
      <Field label={tr('Description')} htmlFor="task-body">
        <Textarea id="task-body" placeholder={tr('Add description')} {...register('body')} />
      </Field>
      {!watch('periodic') && (
        <Controller
          control={control}
          name="pending"
          render={({ field }) => <NavRow label={tr('Pending')} value={tr('Shown every day from its date until done')} trailing={<Switch label={tr('Pending')} checked={field.value} onChange={field.onChange} />} />}
        />
      )}
    </SectionCard>
  );
}
