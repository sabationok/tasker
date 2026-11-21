import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { tr } from '@/i18n';
import { DateRow, Field, Input, NavRow, SectionCard, Switch } from '@/ui';
import { PriorityRow } from '@/components/priority';
import { CategoryRow } from '@/features/categories/category-row';
import type { HabitFormValues } from '../habit-form.lib';

export function HabitGeneralSection() {
  const { register, control, watch, formState } = useFormContext<HabitFormValues>();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [hasEnd, startsOn, endsOn] = watch(['hasEnd', 'startsOn', 'endsOn']);
  return (
    <SectionCard title={tr('General information')} marker="required">
      <Field label={tr('Habit name')} htmlFor="habit-name" error={formState.errors.name?.message}>
        <Input id="habit-name" placeholder={tr('Enter habit name')} invalid={!!formState.errors.name} {...register('name', { validate: (v) => !!v.trim() || tr('Name is required') })} />
      </Field>
      <Controller control={control} name="categoryId" render={({ field }) => <CategoryRow value={field.value} onChange={field.onChange} />} />
      <DateRow label={tr('Start date')} shown={startsOn} {...register('startsOn')} />
      <Controller control={control} name="hasEnd" render={({ field }) => <NavRow label={tr('End date')} trailing={<Switch label={tr('Has end date')} checked={field.value} onChange={field.onChange} />} />} />
      {hasEnd && <DateRow label={tr('End date')} shown={endsOn} {...register('endsOn')} />}
      <Controller control={control} name="priority" render={({ field }) => <PriorityRow value={field.value} onChange={field.onChange} open={priorityOpen} setOpen={setPriorityOpen} />} />
    </SectionCard>
  );
}
